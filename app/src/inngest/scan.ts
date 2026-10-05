import { inngest } from './client'
import { ClickUpClient } from '@/lib/clickup/client'
import { supabaseAdmin } from '@/lib/supabase/server'
import { decrypt } from '@/lib/crypto'
import { evaluate, type Metrics } from '@/lib/scoring/engine'
import { toScanResult, type MapUtilisation } from '@/lib/report/map'

const DAY = 86_400_000
const STALE_DAYS = 90
const SAMPLE_LIST_LIMIT = 300
const SAMPLE_ROWS = 100

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
      const { data, error } = await admin.from('connections').select('id, token_encrypted').eq('id', connectionId).single()
      if (error || !data) throw new Error('connection_not_found')
      return { token: decrypt(data.token_encrypted) }
    })
    const client = new ClickUpClient(ctx.token)

    await progress(15, 'Mapping workspace structure')

    const structure = await step.run('load-structure', async () => {
      const { teams } = await client.getAuthorizedTeams()
      const team = teams.find((t) => t.id === teamId)
      const memberCount = team?.members?.length ?? 0
      const guestCount = team?.members?.filter((m) => (m.user as { role?: number }).role === 4).length ?? 0

      const { spaces } = await client.getSpaces(teamId)
      const activeSpaces = spaces.filter((s) => !excludeSpaceIds.includes(s.id))

      const lists: { id: string; name: string; spaceId: string; spaceName: string }[] = []
      let folderCount = 0
      let emptyFolders = 0

      for (const space of activeSpaces) {
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

      return {
        memberCount,
        guestCount,
        spaceCount: activeSpaces.length,
        folderCount,
        emptyFolders,
        lists: lists.slice(0, SAMPLE_LIST_LIMIT),
        statusCounts: activeSpaces.map((s) => s.statuses?.length ?? 0),
      }
    })

    await progress(35, 'Analysing tasks')

    const scan = await step.run('scan-tasks', async () => {
      let totalTasks = 0
      let openTasks = 0
      let overdue = 0
      let stale = 0
      let noDue = 0
      let noAssignee = 0
      let withEstimate = 0
      let withTime = 0
      let withDependency = 0
      let subtasksTotal = 0
      let subtasksUnderClosed = 0
      let created90 = 0
      let completed90 = 0

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

          if (task.parent) subtasksTotal += 1
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
            if (updatedMs && now - updatedMs > STALE_DAYS * DAY) {
              stale += 1
              staleInList += 1
              if (sampleStale.length < SAMPLE_ROWS) {
                sampleStale.push({
                  task: task.name,
                  owner: task.assignees?.[0]?.username ?? '— none —',
                  space: list.spaceName,
                  lastUpdate: `${Math.round((now - (updatedMs ?? now)) / DAY)}d ago`,
                  status: task.status?.status ?? '—',
                })
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

      const total = totalTasks || 1
      const open = openTasks || 1
      const openLists = perList.filter((l) => l.open_tasks > 0).length || 1
      const fragmented = perList.filter((l) => l.open_tasks < 5).length
      const dormant = perList.filter((l) => l.open_tasks === 0).length
      const statusCounts: number[] = (structure.statusCounts as number[]).filter((n) => n > 0)
      const avgStatuses = statusCounts.length ? statusCounts.reduce((s: number, n: number) => s + n, 0) / statusCounts.length : 0

      const metrics: Metrics = {
        avgTasksPerList: totalTasks / (perList.length || 1),
        fragmentedListsPct: fragmented / (perList.length || 1),
        dormantListsPct: dormant / (perList.length || 1),
        emptyFoldersPct: structure.folderCount ? structure.emptyFolders / structure.folderCount : 0,
        statusesPerWorkflow: avgStatuses,
        overdueRate: overdue / open,
        staleRate: stale / open,
        openSubtasksUnderClosedPct: subtasksTotal ? subtasksUnderClosed / subtasksTotal : 0,
        creationMinusCompletion: created90 - completed90,
        wipPerPerson: structure.memberCount ? openTasks / structure.memberCount : openTasks,
        inactiveMemberPct: 0, // refined when per-member activity is aggregated
        guestRatio: structure.memberCount ? structure.guestCount / structure.memberCount : 0,
        activityConcentration: 0, // refined once per-space activity is aggregated
        dormantSpaces: 0,
        timeTrackedPct: withTime / total,
        dependenciesUsed: withDependency,
        dueDateCoverage: 1 - noDue / total,
        ownershipCoverage: 1 - noAssignee / total,
        estimateCoverage: withEstimate / total,
        distinctWorkflows: structure.spaceCount,
      }

      return { metrics, perList, samples: { overdue: sampleOverdue, stale: sampleStale, 'missing-due': sampleMissingDue } }
    })

    await progress(70, 'Calculating Health Score')

    const result = evaluate(scan.metrics)

    const utilisation: MapUtilisation[] = [
      { capability: 'Time Tracking', status: scan.metrics.timeTrackedPct && scan.metrics.timeTrackedPct > 0 ? 'detected' : 'partial', detail: `${Math.round((scan.metrics.timeTrackedPct ?? 0) * 100)}% of tasks logged` },
      { capability: 'Time Estimates', status: 'detected', detail: `${Math.round((scan.metrics.estimateCoverage ?? 0) * 100)}% of tasks` },
      { capability: 'Dependencies', status: (scan.metrics.dependenciesUsed ?? 0) > 0 ? 'detected' : 'partial', detail: `${scan.metrics.dependenciesUsed ?? 0} links` },
      { capability: 'Views', status: 'not_measurable', detail: 'Needs per-location View reads' },
      { capability: 'Goals', status: 'not_measurable', detail: 'Not yet read' },
      { capability: 'Docs', status: 'not_measurable', detail: 'Not yet read' },
      { capability: 'Custom Task Types', status: 'not_measurable', detail: 'Not yet read' },
      { capability: 'Automations', status: 'not_measurable', detail: 'Not exposed by public API' },
      { capability: 'Forms', status: 'not_measurable', detail: 'Not exposed by public API' },
      { capability: 'Dashboards', status: 'not_measurable', detail: 'Not exposed by public API' },
      { capability: 'Whiteboards', status: 'not_measurable', detail: 'Not exposed by public API' },
      { capability: 'Workload', status: 'not_measurable', detail: 'Not exposed by public API' },
      { capability: 'ClickApps', status: 'not_measurable', detail: 'Enabled-state not exposed' },
      { capability: 'AI', status: 'not_measurable', detail: 'Usage not exposed' },
      { capability: 'Integrations', status: 'not_measurable', detail: 'Only webhooks visible' },
    ]

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
        lists: scan.perList.length,
        activeTasks: (scan.perList as any[]).reduce((s: number, l: any) => s + l.open_tasks, 0),
      },
      engine: result,
      metrics: scan.metrics,
      utilisation,
    })

    await step.run('store-list-stats', async () => {
      if ((scan.perList as any[]).length) {
        await admin.from('list_stats').insert(
          (scan.perList as any[]).map((l: any) => ({
            scan_id: scanId,
            list_id: l.list_id,
            list_name: l.list_name,
            space_id: l.space_id,
            space_name: l.space_name,
            tasks: l.tasks,
            open_tasks: l.open_tasks,
            overdue: l.overdue,
            stale: l.stale,
            last_activity: l.last_activity ? new Date(l.last_activity).toISOString() : null,
          })),
        )
      }
      for (const [dataset, rows] of Object.entries(scan.samples as Record<string, unknown>)) {
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
        metrics: scan.metrics,
        category_scores: result.categories,
        result: report,
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
