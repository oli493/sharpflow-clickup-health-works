import { inngest } from './client'
import { ClickUpClient } from '@/lib/clickup/client'
import { supabaseAdmin } from '@/lib/supabase/server'
import { decrypt } from '@/lib/crypto'
import { evaluate, type Metrics } from '@/lib/scoring/engine'
import { toScanResult, type MapUtilisation } from '@/lib/report/map'
import { generateExecutiveSummary } from '@/lib/llm'

const DAY = 86_400_000
const STALE_DAYS = 90
const ACTIVE_DAYS = 30
const SAMPLE_LIST_LIMIT = 300
const SAMPLE_ROWS = 100
const COMMENT_SAMPLE = 60

const ROLE_LABEL: Record<number, string> = { 1: 'Owner', 2: 'Admin', 3: 'Member', 4: 'Guest' }

interface ScanEvent {
  data: { scanId: string; connectionId: string; teamId: string; excludeSpaceIds?: string[] }
}

export const scanWorkspace = inngest.createFunction(
  { id: 'scan-workspace' },
  { event: 'scan/requested' },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async ({ event, step }: { event: ScanEvent; step: any }) => {
    const { scanId, connectionId, teamId, excludeSpaceIds = [] } = event.data
    const admin = supabaseAdmin()
    const now = Date.now()

    const progress = (p: number, stage: string) =>
      step.run(`progress-${p}`, async () => {
        await admin.from('scans').update({ status: 'running', progress: p, stage }).eq('id', scanId)
      })

    await progress(5, 'Connecting to ClickUp')

    const ctx = await step.run('load-connection', async () => {
      const { data, error } = await admin
        .from('connections')
        .select('id, token_encrypted, clickup_user_id')
        .eq('id', connectionId)
        .single()
      if (error || !data) throw new Error('connection_not_found')
      return { token: decrypt(data.token_encrypted), userId: String(data.clickup_user_id ?? '') }
    })
    const client = new ClickUpClient(ctx.token)

    await progress(15, 'Mapping workspace structure')

    const structure = await step.run('load-structure', async () => {
      const { teams } = await client.getAuthorizedTeams()
      const team = teams.find((t) => t.id === teamId)
      const members = (team?.members ?? []).map((m) => ({ id: m.user.id, username: m.user.username, role: m.user.role }))
      const memberCount = members.length
      const guestCount = members.filter((m) => m.role === 4).length

      const { spaces } = await client.getSpaces(teamId)
      const activeSpaces = spaces.filter((s) => !excludeSpaceIds.includes(s.id))

      const lists: { id: string; name: string; spaceId: string; spaceName: string }[] = []
      let folderCount = 0
      let emptyFolders = 0

      // Duplicate status names across spaces (same name, different type).
      const statusNameTypes = new Map<string, Set<string>>()

      // Views per Space.
      let viewCount = 0
      const viewSamples: Record<string, string | number>[] = []

      for (const space of activeSpaces) {
        for (const st of space.statuses ?? []) {
          const set = statusNameTypes.get(st.status) ?? new Set<string>()
          set.add(st.type)
          statusNameTypes.set(st.status, set)
        }

        try {
          const { views } = await client.getViews(space.id)
          viewCount += views?.length ?? 0
          for (const v of views ?? []) {
            if (viewSamples.length < SAMPLE_ROWS) viewSamples.push({ view: v.name, space: space.name, type: v.type })
          }
        } catch {
          /* Views may be unavailable for some Spaces. */
        }

        const { folders } = await client.getFolders(space.id)
        for (const folder of folders) {
          folderCount += 1
          const { lists: folderLists } = await client.getLists(folder.id)
          if (!folderLists || folderLists.length === 0) emptyFolders += 1
          for (const l of folderLists ?? []) lists.push({ id: l.id, name: l.name, spaceId: space.id, spaceName: space.name })
        }
        const { lists: folderless } = await client.getFolderlessLists(space.id)
        for (const l of folderless ?? []) lists.push({ id: l.id, name: l.name, spaceId: space.id, spaceName: space.name })
      }

      const duplicateStatusList = [...statusNameTypes.entries()]
        .filter(([, types]) => types.size > 1)
        .map(([status, types]) => ({ status, types: [...types].join(', ') }))

      // Insight-only capabilities (never scored).
      let goalsTracked: number | undefined
      let customTaskTypes: number | undefined
      try {
        const { goals } = await client.getGoals(teamId)
        goalsTracked = goals?.length ?? 0
      } catch {
        /* Goals endpoint may be unavailable. */
      }
      try {
        const { custom_items } = await client.getCustomTaskTypes(teamId)
        customTaskTypes = custom_items?.length ?? 0
      } catch {
        /* Custom Task Types endpoint may be unavailable. */
      }

      return {
        members,
        memberCount,
        guestCount,
        spaceCount: activeSpaces.length,
        folderCount,
        emptyFolders,
        lists: lists.slice(0, SAMPLE_LIST_LIMIT),
        statusCounts: activeSpaces.map((s) => s.statuses?.length ?? 0),
        allStatusNames: Array.from(new Set(activeSpaces.flatMap((s) => (s.statuses ?? []).map((x) => x.status)))),
        duplicateStatusNames: duplicateStatusList.length,
        duplicateStatusList,
        viewCount,
        viewSamples,
        goalsTracked,
        customTaskTypes,
      }
    })

    await progress(35, 'Analysing tasks')

    const scan = await step.run('scan-tasks', async () => {
      let totalTasks = 0
      let openTasks = 0
      let overdue = 0
      let stale30 = 0
      let stale60 = 0
      let stale90 = 0
      let noDue = 0
      let noAssignee = 0
      let withEstimate = 0
      let withTime = 0
      let withDependency = 0
      let subtasksTotal = 0
      let created90 = 0
      let completed90 = 0
      let requiredSlots = 0
      let requiredMissing = 0
      const usedStatus = new Set<string>()
      const fieldStats = new Map<string, { filled: number; slots: number }>()
      let cfSlots = 0
      let cfFilled = 0

      // Parent status map + subtask records (open subtasks under closed parents).
      const closedById = new Map<string, boolean>()
      const subtaskRecords: { parentId: string; open: boolean }[] = []

      // Activity inference (no login data available via the API).
      const activeMembers = new Set<number>()
      const memberActivity = new Map<number, number>()
      const recentTaskIds: string[] = []
      const bump = (id: number, ms: number) => {
        const prev = memberActivity.get(id) ?? 0
        if (ms > prev) memberActivity.set(id, ms)
      }

      const perList: {
        list_id: string
        list_name: string
        space_id: string
        space_name: string
        tasks: number
        open_tasks: number
        overdue: number
        stale: number
        last_activity: number
      }[] = []

      const sampleOverdue: Record<string, string | number>[] = []
      const sampleStale: Record<string, string | number>[] = []
      const sampleMissingDue: Record<string, string | number>[] = []

      for (const list of structure.lists) {
        let requiredFieldIds: string[] = []
        try {
          const { fields } = await client.getCustomFields(list.id)
          requiredFieldIds = (fields ?? []).filter((f) => f.required).map((f) => f.id)
        } catch {
          /* Some Lists have no accessible fields. */
        }

        let countInList = 0
        let openInList = 0
        let overdueInList = 0
        let staleInList = 0
        let lastActivity = 0

        for await (const task of client.iterateTasks(list.id)) {
          countInList += 1
          totalTasks += 1
          const closedType = task.status?.type === 'closed' || task.status?.type === 'done'
          const dueMs = task.due_date ? Number(task.due_date) : null
          const updatedMs = task.date_updated ? Number(task.date_updated) : null
          const createdMs = task.date_created ? Number(task.date_created) : null
          const closedMs = task.date_closed ? Number(task.date_closed) : null
          if (updatedMs && updatedMs > lastActivity) lastActivity = updatedMs
          usedStatus.add(task.status?.status ?? '')
          closedById.set(task.id, closedType)

          const cfs = (task as { custom_fields?: { id: string; value: unknown }[] }).custom_fields
          if (cfs) {
            for (const cf of cfs) {
              const st = fieldStats.get(cf.id) ?? { filled: 0, slots: 0 }
              st.slots += 1
              cfSlots += 1
              const v = cf.value
              const empty = v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0)
              if (!empty) {
                st.filled += 1
                cfFilled += 1
              }
              fieldStats.set(cf.id, st)
            }
          }

          // Required-field coverage.
          if (requiredFieldIds.length) {
            const cfMap = new Map((cfs ?? []).map((cf) => [cf.id, cf.value]))
            for (const fid of requiredFieldIds) {
              requiredSlots += 1
              const v = cfMap.get(fid)
              const empty = v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)
              if (empty) requiredMissing += 1
            }
          }

          // Activity: creator in last 30d; assignees on recently touched tasks.
          if (task.creator?.id && createdMs && now - createdMs <= ACTIVE_DAYS * DAY) {
            activeMembers.add(task.creator.id)
            bump(task.creator.id, createdMs)
          }
          const touchedRecently =
            (closedMs !== null && now - closedMs <= ACTIVE_DAYS * DAY) ||
            (updatedMs !== null && now - updatedMs <= ACTIVE_DAYS * DAY)
          if (touchedRecently) {
            for (const a of task.assignees ?? []) {
              activeMembers.add(a.id)
              bump(a.id, updatedMs ?? closedMs ?? now)
            }
          }
          if (updatedMs && now - updatedMs <= ACTIVE_DAYS * DAY && recentTaskIds.length < COMMENT_SAMPLE) {
            recentTaskIds.push(task.id)
          }

          if (task.parent) {
            subtasksTotal += 1
            subtaskRecords.push({ parentId: task.parent, open: !closedType })
          }
          if (!closedType) {
            openTasks += 1
            openInList += 1
            if (dueMs && dueMs < now) {
              overdue += 1
              overdueInList += 1
              if (sampleOverdue.length < SAMPLE_ROWS) {
                sampleOverdue.push({
                  task: task.name,
                  assignee: task.assignees?.[0]?.username ?? '— none —',
                  space: list.spaceName,
                  due: `-${Math.round((now - dueMs) / DAY)}d`,
                  priority: task.status?.status ?? '—',
                })
              }
            }
            if (updatedMs) {
              const age = now - updatedMs
              if (age >= STALE_DAYS * DAY) stale90 += 1
              else if (age >= 60 * DAY) stale60 += 1
              else if (age >= 30 * DAY) stale30 += 1
              if (age >= 30 * DAY) {
                staleInList += 1
                if (sampleStale.length < SAMPLE_ROWS) {
                  sampleStale.push({
                    task: task.name,
                    owner: task.assignees?.[0]?.username ?? '— none —',
                    space: list.spaceName,
                    lastUpdate: `${Math.round(age / DAY)}d ago`,
                    status: task.status?.status ?? '—',
                  })
                }
              }
            }
          }
          if (!dueMs) {
            noDue += 1
            if (sampleMissingDue.length < SAMPLE_ROWS) {
              sampleMissingDue.push({
                task: task.name,
                assignee: task.assignees?.[0]?.username ?? '— none —',
                space: list.spaceName,
                created: createdMs ? `${Math.round((now - createdMs) / DAY)}d ago` : '—',
              })
            }
          }
          if (!task.assignees || task.assignees.length === 0) noAssignee += 1
          const t = task as { time_estimate?: string | number; dependencies?: unknown[]; time_spent?: string | number }
          if (t.time_estimate) withEstimate += 1
          if (t.time_spent && Number(t.time_spent) > 0) withTime += 1
          if (t.dependencies && (t.dependencies as unknown[]).length > 0) withDependency += 1
          if (createdMs && now - createdMs <= STALE_DAYS * DAY) created90 += 1
          if (closedMs && now - closedMs <= STALE_DAYS * DAY) completed90 += 1
        }

        perList.push({
          list_id: list.id,
          list_name: list.name,
          space_id: list.spaceId,
          space_name: list.spaceName,
          tasks: countInList,
          open_tasks: openInList,
          overdue: overdueInList,
          stale: staleInList,
          last_activity: lastActivity,
        })
      }

      const hasTasks = totalTasks > 0
      const hasLists = perList.length > 0
      const open = openTasks
      const fragmented = perList.filter((l) => l.open_tasks < 5).length
      const listCount = perList.length
      let dormant60 = 0
      let dormant90 = 0
      for (const l of perList) {
        if (!l.tasks || !l.last_activity) {
          dormant90 += 1 // Lists with no tasks / no activity ever count as 90d+
          continue
        }
        const age = now - l.last_activity
        if (age >= STALE_DAYS * DAY) dormant90 += 1
        else if (age >= 60 * DAY) dormant60 += 1
      }
      const statusCounts: number[] = (structure.statusCounts as number[]).filter((n) => n > 0)
      const avgStatuses = statusCounts.length ? statusCounts.reduce((s: number, n: number) => s + n, 0) / statusCounts.length : 0

      let subtasksUnderClosed = 0
      for (const s of subtaskRecords) {
        if (s.open && closedById.get(s.parentId) === true) subtasksUnderClosed += 1
      }

      const metrics: Metrics = {
        avgTasksPerList: hasLists ? totalTasks / perList.length : undefined,
        fragmentedListsPct: hasLists ? fragmented / perList.length : undefined,
        dormantList60to90Pct: hasLists ? dormant60 / listCount : undefined,
        dormantList90PlusPct: hasLists ? dormant90 / listCount : undefined,
        emptyFoldersPct: structure.folderCount ? structure.emptyFolders / structure.folderCount : undefined,
        statusesPerWorkflow: avgStatuses || undefined,
        duplicateStatusNames: structure.duplicateStatusNames,
        overdueRate: hasTasks ? (open > 0 ? overdue / open : 0) : undefined,
        stale30to60Pct: hasTasks ? (open > 0 ? stale30 / open : 0) : undefined,
        stale60to90Pct: hasTasks ? (open > 0 ? stale60 / open : 0) : undefined,
        stale90PlusPct: hasTasks ? (open > 0 ? stale90 / open : 0) : undefined,
        openSubtasksUnderClosedPct: hasTasks && subtasksTotal ? subtasksUnderClosed / subtasksTotal : undefined,
        creationVsCompletionPct: hasTasks ? (created90 - completed90) / (created90 || 1) : undefined,
        wipPerPerson: hasTasks ? (structure.memberCount ? openTasks / structure.memberCount : openTasks) : undefined,
        guestRatio: structure.memberCount ? structure.guestCount / structure.memberCount : undefined,
        unusedStatuses: hasTasks ? (structure.allStatusNames as string[]).filter((s) => !usedStatus.has(s)).length : undefined,
        timeTrackedPct: hasTasks ? withTime / totalTasks : undefined,
        viewsPerSpace: structure.spaceCount ? structure.viewCount / structure.spaceCount : undefined,
        dependenciesUsed: hasTasks ? withDependency : undefined,
        goalsTracked: structure.goalsTracked,
        customTaskTypes: structure.customTaskTypes,
        dueDateCoverage: hasTasks ? 1 - noDue / totalTasks : undefined,
        ownershipCoverage: hasTasks ? 1 - noAssignee / totalTasks : undefined,
        estimateCoverage: hasTasks ? withEstimate / totalTasks : undefined,
        distinctWorkflows: structure.spaceCount || undefined,
        customFieldCount: fieldStats.size || undefined,
        cfCompletionPct: cfSlots ? cfFilled / cfSlots : undefined,
        cfZeroFilledPct: fieldStats.size
          ? [...fieldStats.values()].filter((s) => s.filled === 0).length / fieldStats.size
          : undefined,
        missingRequiredCfPct: requiredSlots ? requiredMissing / requiredSlots : undefined,
      }

      return {
        metrics,
        perList,
        samples: { overdue: sampleOverdue, stale: sampleStale, 'missing-due': sampleMissingDue },
        recentTaskIds,
        activeMemberIds: [...activeMembers],
        memberActivity: [...memberActivity.entries()],
      }
    })

    await progress(55, 'Sampling activity')

    const activity = await step.run('scan-comments', async () => {
      let totalComments = 0
      const commenters = new Set<number>()
      for (const tid of (scan.recentTaskIds as string[]).slice(0, COMMENT_SAMPLE)) {
        try {
          const { comments } = await client.getTaskComments(tid)
          totalComments += comments?.length ?? 0
          for (const c of comments ?? []) if (c.user?.id) commenters.add(c.user.id)
        } catch {
          /* Individual task comment reads can fail; sample continues. */
        }
      }
      return { totalComments, commenterIds: [...commenters] }
    })

    // Merge activity-derived + space-level metrics.
    const activeIds = new Set<number>([...(scan.activeMemberIds as number[]), ...activity.commenterIds])
    const activeMemberCount = (structure.members as { id: number }[]).filter((m) => activeIds.has(m.id)).length
    const memberCount = structure.memberCount || 0

    const bySpace = new Map<string, { name: string; tasks: number; last: number; lists: number }>()
    for (const l of scan.perList as { space_id: string; space_name: string; tasks: number; last_activity: number }[]) {
      const s = bySpace.get(l.space_id) ?? { name: l.space_name, tasks: 0, last: 0, lists: 0 }
      s.tasks += l.tasks
      s.lists += 1
      if (l.last_activity > s.last) s.last = l.last_activity
      bySpace.set(l.space_id, s)
    }
    const spaceAgg = [...bySpace.values()]
    const totalTasksAll = (scan.perList as { tasks: number }[]).reduce((s, l) => s + l.tasks, 0)
    const hasTasks = totalTasksAll > 0
    const hasLists = (scan.perList as unknown[]).length > 0
    const maxSpaceTasks = spaceAgg.reduce((m, s) => Math.max(m, s.tasks), 0)
    const dormantSpaceRows = spaceAgg
      .filter((s) => s.tasks === 0 || !s.last || now - s.last > STALE_DAYS * DAY)
      .map((s) => ({
        space: s.name,
        lists: s.lists,
        tasks: s.tasks,
        lastActivity: s.last ? new Date(s.last).toLocaleDateString('en-GB') : '—',
      }))
    const dormantSpaces = dormantSpaceRows.length

    const memberActivityMap = new Map<number, number>(scan.memberActivity as [number, number][])
    const inactiveMemberRows = (structure.members as { id: number; username: string; role: number }[])
      .filter((m) => !activeIds.has(m.id))
      .map((m) => ({
        member: m.username,
        role: ROLE_LABEL[m.role] ?? String(m.role),
        lastActivity: memberActivityMap.has(m.id)
          ? `${Math.round((now - (memberActivityMap.get(m.id) ?? now)) / DAY)}d ago`
          : '— none in 30d',
      }))

    const metrics: Metrics = {
      ...scan.metrics,
      activityConcentration: hasTasks ? maxSpaceTasks / totalTasksAll : undefined,
      dormantSpacesPct: hasLists && structure.spaceCount ? dormantSpaces / structure.spaceCount : undefined,
      inactiveMemberPct: hasTasks && memberCount ? (memberCount - activeMemberCount) / memberCount : undefined,
      commentsPerUserPerWeek: hasTasks && activeMemberCount ? activity.totalComments / activeMemberCount / (ACTIVE_DAYS / 7) : undefined,
    }

    await progress(70, 'Calculating Health Score')

    const result = evaluate(metrics)

    const utilisation: MapUtilisation[] = [
      { capability: 'Time Tracking', status: (metrics.timeTrackedPct ?? 0) > 0.05 ? 'detected' : 'partial', detail: `${Math.round((metrics.timeTrackedPct ?? 0) * 100)}% of tasks logged` },
      { capability: 'Time Estimates', status: 'detected', detail: `${Math.round((metrics.estimateCoverage ?? 0) * 100)}% of tasks` },
      { capability: 'Dependencies', status: (metrics.dependenciesUsed ?? 0) > 0 ? 'detected' : 'partial', detail: `${metrics.dependenciesUsed ?? 0} links` },
      { capability: 'Views', status: (metrics.viewsPerSpace ?? 0) >= 2 ? 'detected' : 'partial', detail: `${(metrics.viewsPerSpace ?? 0).toFixed(1)} Views / Space` },
      { capability: 'Goals', status: (metrics.goalsTracked ?? 0) > 0 ? 'detected' : 'partial', detail: `${metrics.goalsTracked ?? 0} Goals` },
      { capability: 'Custom Task Types', status: (metrics.customTaskTypes ?? 0) > 0 ? 'detected' : 'partial', detail: `${metrics.customTaskTypes ?? 0} types` },
      { capability: 'Docs', status: 'not_measurable', detail: 'Docs API is v3-only' },
      { capability: 'Automations', status: 'not_measurable', detail: 'Not exposed by public API' },
      { capability: 'Forms', status: 'not_measurable', detail: 'Not exposed by public API' },
      { capability: 'Dashboards', status: 'not_measurable', detail: 'Not exposed by public API' },
      { capability: 'Whiteboards', status: 'not_measurable', detail: 'Not exposed by public API' },
      { capability: 'Workload', status: 'not_measurable', detail: 'Not exposed by public API' },
      { capability: 'ClickApps', status: 'not_measurable', detail: 'Enabled-state not exposed' },
      { capability: 'AI', status: 'not_measurable', detail: 'Usage not exposed' },
      { capability: 'Integrations', status: 'not_measurable', detail: 'Only webhooks visible' },
    ]

    // Coverage banner: the connecting user must be Owner/Admin for full visibility.
    const me = (structure.members as { id: number; role: number }[]).find((m) => String(m.id) === ctx.userId)
    const coverageLimited = me ? me.role > 2 : false

    const report = toScanResult({
      id: scanId,
      workspace: {
        name: (await step.run('workspace-name', async () => {
          const { data } = await admin.from('scans').select('workspace_name').eq('id', scanId).single()
          return data?.workspace_name ?? 'Workspace'
        })) as string,
        members: structure.memberCount,
        spaces: structure.spaceCount,
        folders: structure.folderCount,
        lists: (scan.perList as unknown[]).length,
        activeTasks: (scan.perList as { open_tasks: number }[]).reduce((s, l) => s + l.open_tasks, 0),
      },
      engine: result,
      metrics,
      utilisation,
      coverageLimited,
    })

    const samples: Record<string, unknown> = {
      ...(scan.samples as Record<string, unknown>),
      views: structure.viewSamples,
      'dormant-spaces': dormantSpaceRows,
      'inactive-members': inactiveMemberRows,
      'duplicate-statuses': structure.duplicateStatusList,
    }

    // AI executive summary — explains the engine; falls back to templated text on failure.
    const finalReport = await step.run('ai-summary', async () => {
      try {
        const ai = await generateExecutiveSummary({
          workspace: report.workspaceName,
          overall: report.overallScore,
          grade: report.overallGrade,
          categories: report.categories.map((c) => ({ name: c.name, score: c.score })),
          findings: report.findings.map((f) => ({
            title: f.title,
            severity: f.severity,
            metric: f.metric,
            metricLabel: f.metricLabel,
          })),
          performingWell: report.performingWell.map((p) => ({ title: p.title })),
        })
        return { ...report, aiSummary: ai.length ? ai : report.aiSummary }
      } catch (err) {
        // Falls back to the templated summary. Most common cause: a user-scoped
        // Anthropic key without LLM_WORKSPACE_ID.
        console.warn('[ai-summary] falling back to templated summary:', (err as Error).message)
        return report
      }
    })

    await step.run('store-list-stats', async () => {
      if ((scan.perList as unknown[]).length) {
        await admin.from('list_stats').insert(
          (scan.perList as Record<string, unknown>[]).map((l) => ({
            scan_id: scanId,
            list_id: l.list_id,
            list_name: l.list_name,
            space_id: l.space_id,
            space_name: l.space_name,
            tasks: l.tasks,
            open_tasks: l.open_tasks,
            overdue: l.overdue,
            stale: l.stale,
            last_activity: l.last_activity ? new Date(l.last_activity as number).toISOString() : null,
          })),
        )
      }
      for (const [dataset, rows] of Object.entries(samples)) {
        await admin.from('scan_samples').insert({ scan_id: scanId, dataset, rows })
      }
    })

    await progress(90, 'Generating recommendations')

    await step.run('store-results', async () => {
      await admin.from('scans').update({
        status: 'complete',
        progress: 100,
        stage: 'Report ready',
        finished_at: new Date().toISOString(),
        overall_score: result.overall,
        grade: result.grade,
        metrics,
        category_scores: result.categories,
        result: finalReport,
      }).eq('id', scanId)

      if (result.findings.length) {
        await admin.from('findings').insert(
          result.findings.map((f) => ({
            scan_id: scanId,
            signal_key: f.signalKey,
            category_key: f.categoryKey,
            category_name: f.categoryName,
            title: f.title,
            severity: f.severity,
            metric_value: f.metricValue,
            threshold: f.threshold,
          })),
        )
      }
    })

    return { scanId, overall: result.overall, grade: result.grade, findings: result.findings.length }
  },
)
