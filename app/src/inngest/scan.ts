import { inngest } from './client'
import { ClickUpClient } from '@/lib/clickup/client'
import { supabaseAdmin } from '@/lib/supabase/server'
import { decrypt } from '@/lib/crypto'
import { evaluate, type Metrics } from '@/lib/scoring/engine'

const DAY = 86_400_000
const STALE_DAYS = 90
const SAMPLE_LIST_LIMIT = 300 // cap lists per scan for the first pass

interface ScanEvent {
  data: { scanId: string; connectionId: string; teamId: string; excludeSpaceIds?: string[] }
}

/**
 * Background workspace scan. Fetches the hierarchy + tasks, derives metrics,
 * runs the deterministic scoring engine, and stores the results.
 *
 * First pass covers structure + task-level metrics; remaining API-derived
 * metrics (views, goals, docs, time tracking, comments) are added incrementally.
 */
export const scanWorkspace = inngest.createFunction(
  { id: 'scan-workspace' },
  { event: 'scan/requested' },
  async ({ event, step }: { event: ScanEvent; step: any }) => {
    const { scanId, connectionId, teamId, excludeSpaceIds = [] } = event.data
    const admin = supabaseAdmin()
    const now = Date.now()

    await step.run('mark-running', async () => {
      await admin.from('scans').update({ status: 'running', started_at: new Date().toISOString() }).eq('id', scanId)
    })

    const ctx = await step.run('load-connection', async () => {
      const { data, error } = await admin
        .from('connections')
        .select('id, token_encrypted')
        .eq('id', connectionId)
        .single()
      if (error || !data) throw new Error('connection_not_found')
      return { token: decrypt(data.token_encrypted) }
    })

    const client = new ClickUpClient(ctx.token)

    const structure = await step.run('load-structure', async () => {
      const { teams } = await client.getAuthorizedTeams()
      const team = teams.find((t) => t.id === teamId)
      const memberCount = team?.members?.length ?? 0
      const guestCount =
        team?.members?.filter((m) => (m.user as { role?: number }).role === 4).length ?? 0

      const { spaces } = await client.getSpaces(teamId)
      const activeSpaces = spaces.filter((s) => !excludeSpaceIds.includes(s.id))

      const lists: { id: string; name: string; spaceId: string; spaceName: string }[] = []
      for (const space of activeSpaces) {
        const { folders } = await client.getFolders(space.id)
        for (const folder of folders) {
          const { lists: folderLists } = await client.getLists(folder.id)
          for (const l of folderLists ?? []) {
            lists.push({ id: l.id, name: l.name, spaceId: space.id, spaceName: space.name })
          }
        }
        const { lists: folderless } = await client.getFolderlessLists(space.id)
        for (const l of folderless ?? []) {
          lists.push({ id: l.id, name: l.name, spaceId: space.id, spaceName: space.name })
        }
      }

      return { memberCount, guestCount, spaceCount: activeSpaces.length, lists: lists.slice(0, SAMPLE_LIST_LIMIT) }
    })

    const taskMetrics = await step.run('scan-tasks', async () => {
      let totalTasks = 0
      let openTasks = 0
      let overdue = 0
      let stale = 0
      let noDue = 0
      let noAssignee = 0
      let withEstimate = 0
      let subtasksUnderClosed = 0
      let subtasksTotal = 0
      let created90 = 0
      let completed90 = 0
      const perListOpen: number[] = []
      const tasksPerList: number[] = []

      for (const list of structure.lists) {
        let openInList = 0
        let countInList = 0
        for await (const task of client.iterateTasks(list.id)) {
          countInList += 1
          totalTasks += 1
          const closedType = task.status?.type === 'closed' || task.status?.type === 'done'
          const dueMs = task.due_date ? Number(task.due_date) : null
          const updatedMs = task.date_updated ? Number(task.date_updated) : null
          const createdMs = task.date_created ? Number(task.date_created) : null
          const closedMs = task.date_closed ? Number(task.date_closed) : null

          if (task.parent) subtasksTotal += 1
          if (!closedType) {
            openTasks += 1
            openInList += 1
            if (dueMs && dueMs < now) overdue += 1
            if (updatedMs && now - updatedMs > STALE_DAYS * DAY) stale += 1
          }
          if (!dueMs) noDue += 1
          if (!task.assignees || task.assignees.length === 0) noAssignee += 1
          if ((task as { time_estimate?: string | number }).time_estimate) withEstimate += 1
          if (createdMs && now - createdMs <= STALE_DAYS * DAY) created90 += 1
          if (closedMs && now - closedMs <= STALE_DAYS * DAY) completed90 += 1
          // Open subtask whose parent is closed is approximated later; count placeholder.
          if (task.parent && !closedType) subtasksUnderClosed += 0 // refined when parent statuses are fetched
        }
        perListOpen.push(openInList)
        tasksPerList.push(countInList)
      }

      const total = totalTasks || 1
      const open = openTasks || 1
      const fragmented = perListOpen.filter((n) => n < 5).length
      const dormant = perListOpen.filter((n) => n === 0).length

      const metrics: Metrics = {
        avgTasksPerList: totalTasks / (tasksPerList.length || 1),
        fragmentedListsPct: fragmented / (perListOpen.length || 1),
        dormantListsPct: dormant / (perListOpen.length || 1),
        overdueRate: overdue / open,
        staleRate: stale / open,
        dueDateCoverage: 1 - noDue / total,
        ownershipCoverage: 1 - noAssignee / total,
        estimateCoverage: withEstimate / total,
        openSubtasksUnderClosedPct: subtasksTotal ? subtasksUnderClosed / subtasksTotal : 0,
        creationMinusCompletion: created90 - completed90,
        wipPerPerson: structure.memberCount ? openTasks / structure.memberCount : openTasks,
        guestRatio: structure.memberCount ? structure.guestCount / (structure.memberCount || 1) : 0,
        distinctWorkflows: structure.spaceCount,
        // Not-yet-derived metrics are omitted; the engine skips undefined signals.
      }
      return { metrics, totals: { totalTasks, openTasks, overdue, stale } }
    })

    const result = evaluate(taskMetrics.metrics)

    await step.run('store-results', async () => {
      await admin.from('scans').update({
        status: 'complete',
        finished_at: new Date().toISOString(),
        overall_score: result.overall,
        grade: result.grade,
        metrics: taskMetrics.metrics,
        category_scores: result.categories,
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
