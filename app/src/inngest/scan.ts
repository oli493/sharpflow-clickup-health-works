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
const SAMPLE_LIST_LIMIT = 1000
const SAMPLE_ROWS = 100
const COMMENT_SAMPLE = 60
// Work is split into small steps so no single serverless invocation approaches
// the platform's function time limit (big workspaces exceed it otherwise).
const LIST_BATCH = 25
const SPACE_BATCH = 4

const ROLE_LABEL: Record<number, string> = { 1: 'Owner', 2: 'Admin', 3: 'Member', 4: 'Guest' }

interface ScanEvent {
  data: { scanId: string; connectionId: string; teamId: string; excludeSpaceIds?: string[] }
}

type ListRef = { id: string; name: string; spaceId: string; spaceName: string }
type SpaceRef = { id: string; name: string; statuses: { status: string; type: string }[] }

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

function duplicates(statuses: { name: string; type: string }[]) {
  const m = new Map<string, Set<string>>()
  for (const st of statuses) {
    const set = m.get(st.name) ?? new Set<string>()
    set.add(st.type)
    m.set(st.name, set)
  }
  return [...m.entries()].filter(([, types]) => types.size > 1)
}

export const scanWorkspace = inngest.createFunction(
  {
    id: 'scan-workspace',
    // Persist a failed status so the UI can explain what happened instead of
    // spinning forever — without this the scan row stays "running" on error.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onFailure: async ({ event }: any) => {
      const scanId = (event?.data?.event?.data?.scanId as string | undefined) ?? undefined
      if (!scanId) return
      const message =
        (event?.data?.error?.message as string | undefined) ?? 'The audit could not complete.'
      const admin = supabaseAdmin()
      await admin
        .from('scans')
        .update({
          status: 'failed',
          progress: 100,
          stage: 'Failed',
          error: message,
          finished_at: new Date().toISOString(),
        })
        .eq('id', scanId)
    },
  },
  { event: 'scan/requested' },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async ({ event, step }: { event: ScanEvent; step: any }) => {
    const { scanId, connectionId, teamId, excludeSpaceIds = [] } = event.data
    const admin = supabaseAdmin()
    const now = Date.now()

    try {
    const progress = (id: string, p: number, stage: string) =>
      step.run(id, async () => {
        await admin.from('scans').update({ status: 'running', progress: p, stage }).eq('id', scanId)
      })

    await step.run('mark-started', async () => {
      await admin
        .from('scans')
        .update({
          status: 'running',
          progress: 5,
          stage: 'Connecting to ClickUp',
          started_at: new Date().toISOString(),
        })
        .eq('id', scanId)
    })

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

    /* -------------------- structure (chunked by space) -------------------- */

    const head = await step.run('load-structure-head', async () => {
      const { teams } = await client.getAuthorizedTeams()
      const team = teams.find((t) => t.id === teamId)
      const members = (team?.members ?? []).map((m) => ({
        id: m.user.id,
        username: m.user.username,
        role: m.user.role,
      }))
      const { spaces } = await client.getSpaces(teamId)
      const activeSpaces = spaces.filter((s) => !excludeSpaceIds.includes(s.id))
      return {
        members,
        memberCount: members.length,
        guestCount: members.filter((m) => m.role === 4).length,
        spaces: activeSpaces.map<SpaceRef>((s) => ({
          id: s.id,
          name: s.name,
          statuses: (s.statuses ?? []).map((x) => ({ status: x.status, type: x.type })),
        })),
      }
    })

    const spaceChunks = chunk<SpaceRef>(head.spaces as SpaceRef[], SPACE_BATCH)
    const structureParts: {
      lists: ListRef[]
      folderCount: number
      emptyFolders: number
      viewCount: number
      viewSamples: Record<string, string | number>[]
      statuses: { name: string; type: string }[]
      statusCounts: number[]
    }[] = []

    for (let i = 0; i < spaceChunks.length; i++) {
      const part = await step.run(`structure-batch-${i}`, async () => {
        const lists: ListRef[] = []
        const viewSamples: Record<string, string | number>[] = []
        const statuses: { name: string; type: string }[] = []
        const statusCounts: number[] = []
        let folderCount = 0
        let emptyFolders = 0
        let viewCount = 0

        for (const space of spaceChunks[i]) {
          for (const st of space.statuses) statuses.push({ name: st.status, type: st.type })
          statusCounts.push(space.statuses.length)

          try {
            const { views } = await client.getViews(space.id)
            viewCount += views?.length ?? 0
            for (const v of views ?? []) {
              if (viewSamples.length < SAMPLE_ROWS) {
                viewSamples.push({ view: v.name, space: space.name, type: v.type })
              }
            }
          } catch {
            /* Views may be unavailable for some Spaces. */
          }

          const { folders } = await client.getFolders(space.id)
          for (const folder of folders) {
            folderCount += 1
            const { lists: folderLists } = await client.getLists(folder.id)
            if (!folderLists || folderLists.length === 0) emptyFolders += 1
            for (const l of folderLists ?? []) {
              lists.push({ id: l.id, name: l.name, spaceId: space.id, spaceName: space.name })
            }
          }
          const { lists: folderless } = await client.getFolderlessLists(space.id)
          for (const l of folderless ?? []) {
            lists.push({ id: l.id, name: l.name, spaceId: space.id, spaceName: space.name })
          }
        }

        return { lists, folderCount, emptyFolders, viewCount, viewSamples, statuses, statusCounts }
      })
      structureParts.push(part)

      await progress(
        `progress-structure-${i}`,
        Math.min(34, 15 + Math.round(((i + 1) / spaceChunks.length) * 19)),
        `Mapping workspace structure — ${Math.min((i + 1) * SPACE_BATCH, head.spaces.length)}/${head.spaces.length} Spaces`,
      )
    }

    // Insight-only capabilities (never scored).
    const insight = await step.run('load-insights', async () => {
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
      return { goalsTracked, customTaskTypes }
    })

    const allStatuses = structureParts.flatMap((p) => p.statuses)
    const duplicateStatusList = duplicates(allStatuses).map(([status, types]) => ({
      status,
      types: [...types].join(', '),
    }))

    const structure = {
      members: head.members,
      memberCount: head.memberCount,
      guestCount: head.guestCount,
      spaceCount: head.spaces.length,
      folderCount: structureParts.reduce((s, p) => s + p.folderCount, 0),
      emptyFolders: structureParts.reduce((s, p) => s + p.emptyFolders, 0),
      lists: structureParts.flatMap((p) => p.lists).slice(0, SAMPLE_LIST_LIMIT),
      statusCounts: structureParts.flatMap((p) => p.statusCounts),
      allStatusNames: Array.from(new Set(allStatuses.map((x) => x.name))),
      duplicateStatusNames: duplicateStatusList.length,
      duplicateStatusList,
      viewCount: structureParts.reduce((s, p) => s + p.viewCount, 0),
      viewSamples: structureParts.flatMap((p) => p.viewSamples).slice(0, SAMPLE_ROWS),
      goalsTracked: insight.goalsTracked,
      customTaskTypes: insight.customTaskTypes,
    }

    /* ---------------------- tasks (chunked by list) ----------------------- */

    const listChunks = chunk(structure.lists, LIST_BATCH)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const partials: any[] = []

    for (let i = 0; i < listChunks.length; i++) {
      const part = await step.run(`scan-tasks-${i}`, async () => {
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
        let subtasksUnderClosed = 0
        let subtasksTotal = 0
        let created90 = 0
        let completed90 = 0
        let requiredSlots = 0
        let requiredMissing = 0
        const usedStatus = new Set<string>()
        const fieldStats = new Map<string, { filled: number; slots: number }>()
        let cfSlots = 0
        let cfFilled = 0

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

        for (const list of listChunks[i]) {
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
          // Subtasks always live in the same List as their parent in ClickUp, so
          // parent "closed" state can be resolved per List (keeps steps small).
          const listClosed = new Map<string, boolean>()
          const listSubtasks: { parentId: string; open: boolean }[] = []

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
            listClosed.set(task.id, closedType)

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

            if (requiredFieldIds.length) {
              const cfMap = new Map((cfs ?? []).map((cf) => [cf.id, cf.value]))
              for (const fid of requiredFieldIds) {
                requiredSlots += 1
                const v = cfMap.get(fid)
                const empty = v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)
                if (empty) requiredMissing += 1
              }
            }

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
              listSubtasks.push({ parentId: task.parent, open: !closedType })
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

          for (const s of listSubtasks) {
            if (s.open && listClosed.get(s.parentId) === true) subtasksUnderClosed += 1
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

        return {
          totalTasks,
          openTasks,
          overdue,
          stale30,
          stale60,
          stale90,
          noDue,
          noAssignee,
          withEstimate,
          withTime,
          withDependency,
          subtasksUnderClosed,
          subtasksTotal,
          created90,
          completed90,
          requiredSlots,
          requiredMissing,
          cfSlots,
          cfFilled,
          usedStatus: [...usedStatus],
          fieldStats: [...fieldStats.entries()],
          perList,
          sampleOverdue,
          sampleStale,
          sampleMissingDue,
          recentTaskIds,
          activeMemberIds: [...activeMembers],
          memberActivity: [...memberActivity.entries()],
        }
      })
      partials.push(part)

      await progress(
        `progress-scan-${i}`,
        Math.min(54, 35 + Math.round(((i + 1) / listChunks.length) * 19)),
        `Analysing tasks — ${Math.min((i + 1) * LIST_BATCH, structure.lists.length)}/${structure.lists.length} Lists`,
      )
    }

    // Merge the per-batch partials.
    const sum = (key: string) => partials.reduce((s, p) => s + (p[key] as number), 0)
    const totalTasks = sum('totalTasks')
    const openTasks = sum('openTasks')
    const overdue = sum('overdue')
    const stale30 = sum('stale30')
    const stale60 = sum('stale60')
    const stale90 = sum('stale90')
    const noDue = sum('noDue')
    const noAssignee = sum('noAssignee')
    const withEstimate = sum('withEstimate')
    const withTime = sum('withTime')
    const withDependency = sum('withDependency')
    const subtasksUnderClosed = sum('subtasksUnderClosed')
    const subtasksTotal = sum('subtasksTotal')
    const created90 = sum('created90')
    const completed90 = sum('completed90')
    const requiredSlots = sum('requiredSlots')
    const requiredMissing = sum('requiredMissing')
    const cfSlots = sum('cfSlots')
    const cfFilled = sum('cfFilled')
    const usedStatus = new Set<string>(partials.flatMap((p) => p.usedStatus as string[]))
    const fieldStats = new Map<string, { filled: number; slots: number }>()
    for (const p of partials) {
      for (const [id, s] of p.fieldStats as [string, { filled: number; slots: number }][]) {
        const cur = fieldStats.get(id) ?? { filled: 0, slots: 0 }
        cur.filled += s.filled
        cur.slots += s.slots
        fieldStats.set(id, cur)
      }
    }
    const perList = partials.flatMap((p) => p.perList)
    const sampleOverdue = partials.flatMap((p) => p.sampleOverdue).slice(0, SAMPLE_ROWS)
    const sampleStale = partials.flatMap((p) => p.sampleStale).slice(0, SAMPLE_ROWS)
    const sampleMissingDue = partials.flatMap((p) => p.sampleMissingDue).slice(0, SAMPLE_ROWS)
    const recentTaskIds = partials.flatMap((p) => p.recentTaskIds).slice(0, COMMENT_SAMPLE)
    const activeMemberIds = [...new Set(partials.flatMap((p) => p.activeMemberIds as number[]))]
    const memberActivity = new Map<number, number>()
    for (const p of partials) {
      for (const [id, ms] of p.memberActivity as [number, number][]) {
        memberActivity.set(id, Math.max(memberActivity.get(id) ?? 0, ms))
      }
    }

    const hasTasks = totalTasks > 0
    const hasLists = perList.length > 0
    const open = openTasks
    const fragmented = perList.filter((l: { open_tasks: number }) => l.open_tasks < 5).length
    const listCount = perList.length
    let dormant60 = 0
    let dormant90 = 0
    for (const l of perList as { tasks: number; last_activity: number }[]) {
      if (!l.tasks || !l.last_activity) {
        dormant90 += 1 // Lists with no tasks / no activity ever count as 90d+
        continue
      }
      const age = now - l.last_activity
      if (age >= STALE_DAYS * DAY) dormant90 += 1
      else if (age >= 60 * DAY) dormant60 += 1
    }
    const statusCounts: number[] = (structure.statusCounts as number[]).filter((n) => n > 0)
    const avgStatuses = statusCounts.length ? statusCounts.reduce((s, n) => s + n, 0) / statusCounts.length : 0

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

    const scan = {
      metrics,
      perList,
      samples: { overdue: sampleOverdue, stale: sampleStale, 'missing-due': sampleMissingDue },
      recentTaskIds,
      activeMemberIds,
      memberActivity: [...memberActivity.entries()],
    }

    await progress('progress-55', 55, 'Sampling activity')

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
    const hasTasks2 = totalTasksAll > 0
    const hasLists2 = (scan.perList as unknown[]).length > 0
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

    const metrics2: Metrics = {
      ...scan.metrics,
      activityConcentration: hasTasks2 ? maxSpaceTasks / totalTasksAll : undefined,
      dormantSpacesPct: hasLists2 && structure.spaceCount ? dormantSpaces / structure.spaceCount : undefined,
      inactiveMemberPct: hasTasks2 && memberCount ? (memberCount - activeMemberCount) / memberCount : undefined,
      commentsPerUserPerWeek: hasTasks2 && activeMemberCount ? activity.totalComments / activeMemberCount / (ACTIVE_DAYS / 7) : undefined,
    }

    await progress('progress-70', 70, 'Calculating Health Score')

    const result = evaluate(metrics2)

    const utilisation: MapUtilisation[] = [
      { capability: 'Time Tracking', status: (metrics2.timeTrackedPct ?? 0) > 0.05 ? 'detected' : 'partial', detail: `${Math.round((metrics2.timeTrackedPct ?? 0) * 100)}% of tasks logged` },
      { capability: 'Time Estimates', status: 'detected', detail: `${Math.round((metrics2.estimateCoverage ?? 0) * 100)}% of tasks` },
      { capability: 'Dependencies', status: (metrics2.dependenciesUsed ?? 0) > 0 ? 'detected' : 'partial', detail: `${metrics2.dependenciesUsed ?? 0} links` },
      { capability: 'Views', status: (metrics2.viewsPerSpace ?? 0) >= 2 ? 'detected' : 'partial', detail: `${(metrics2.viewsPerSpace ?? 0).toFixed(1)} Views / Space` },
      { capability: 'Goals', status: (metrics2.goalsTracked ?? 0) > 0 ? 'detected' : 'partial', detail: `${metrics2.goalsTracked ?? 0} Goals` },
      { capability: 'Custom Task Types', status: (metrics2.customTaskTypes ?? 0) > 0 ? 'detected' : 'partial', detail: `${metrics2.customTaskTypes ?? 0} types` },
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
      metrics: metrics2,
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

    await progress('progress-90', 90, 'Generating recommendations')

    await step.run('store-results', async () => {
      await admin.from('scans').update({
        status: 'complete',
        progress: 100,
        stage: 'Report ready',
        finished_at: new Date().toISOString(),
        overall_score: result.overall,
        grade: result.grade,
        metrics: metrics2,
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
    } catch (err) {
      // Record the failure directly so the row never stays "running" forever,
      // regardless of whether the Inngest failure handler is configured.
      await admin
        .from('scans')
        .update({
          status: 'failed',
          progress: 100,
          stage: 'Failed',
          error: (err as Error)?.message?.slice(0, 500) ?? 'The audit could not complete.',
          finished_at: new Date().toISOString(),
        })
        .eq('id', scanId)
      throw err
    }
  },
)
