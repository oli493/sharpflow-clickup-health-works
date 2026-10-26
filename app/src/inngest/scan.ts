import { inngest } from './client'
import { ClickUpClient } from '@/lib/clickup/client'
import { supabaseAdmin } from '@/lib/supabase/server'
import { decrypt } from '@/lib/crypto'
import { evaluate, type Metrics } from '@/lib/scoring/engine'
import { toScanResult, type MapUtilisation } from '@/lib/report/map'
import { generateExecutiveSummary } from '@/lib/llm'
import {
  DAY_MS,
  activityConcentration,
  commentRate,
  dormantStats,
  fieldInventory,
  listCoverage,
  openTaskCoverage,
  timeTrackingCoverage,
  workflowStats,
  type FieldDefinition,
  type FieldStat,
  type ListActivity,
  type SpaceActivity,
  type SpaceWorkflow,
} from '@/lib/scan/metrics'

const DAY = DAY_MS
const STALE_DAYS = 90
const ACTIVE_DAYS = 30
const SAMPLE_LIST_LIMIT = 1000
const SAMPLE_ROWS = 100
const COMMENT_SAMPLE = 60
const MAX_LIST_PAGES_PER_STEP = 50
const MAX_PAGES_PER_LIST = 400
const SPACE_BATCH = 2

const ROLE_LABEL: Record<number, string> = { 1: 'Owner', 2: 'Admin', 3: 'Member', 4: 'Guest' }

interface ScanEvent {
  data: { scanId: string; connectionId: string; teamId: string; excludeSpaceIds?: string[] }
}

type ListRef = {
  id: string
  name: string
  spaceId: string
  spaceName: string
  taskCount?: number
  createdAt?: number
}
type SpaceRef = {
  id: string
  name: string
  createdAt?: number
  statuses: { status: string; type: string }[]
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

function buildSpaceActivities(
  perList: {
    space_id: string
    space_name: string
    tasks: number
    last_activity: number
  }[],
  createdAt: Record<string, number | undefined>,
): SpaceActivity[] {
  const spaces = new Map<string, SpaceActivity>()
  for (const list of perList) {
    const space = spaces.get(list.space_id) ?? {
      id: list.space_id,
      name: list.space_name,
      tasks: 0,
      lastActivity: undefined,
      createdAt: createdAt[list.space_id],
    }
    space.tasks += list.tasks
    if (list.last_activity && (!space.lastActivity || list.last_activity > space.lastActivity)) {
      space.lastActivity = list.last_activity
    }
    spaces.set(list.space_id, space)
  }
  return [...spaces.values()]
}

function sampleAcrossLists(groups: string[][], limit: number): string[] {
  const out: string[] = []
  let index = 0
  while (out.length < limit) {
    let added = false
    for (const group of groups) {
      const item = group[index]
      if (!item) continue
      out.push(item)
      added = true
      if (out.length >= limit) break
    }
    if (!added) break
    index += 1
  }
  return out
}

function selectBatch(lists: ListRef[], start: number, maxPages: number): ListRef[] {
  const batch: ListRef[] = []
  let pages = 0
  for (let i = start; i < lists.length; i += 1) {
    const list = lists[i]
    if (!list.taskCount) {
      if (batch.length) break
      batch.push(list)
      break
    }
    const estimate = Math.max(1, Math.ceil(list.taskCount / 100))
    if (batch.length && pages + estimate > maxPages) break
    batch.push(list)
    pages += estimate
    if (pages >= maxPages) break
  }
  return batch
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
          createdAt: s.date_created ? Number(s.date_created) : undefined,
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
              lists.push({
                id: l.id,
                name: l.name,
                spaceId: space.id,
                spaceName: space.name,
                taskCount: l.task_count,
                createdAt: l.date_created ? Number(l.date_created) : undefined,
              })
            }
          }
          const { lists: folderless } = await client.getFolderlessLists(space.id)
          for (const l of folderless ?? []) {
            lists.push({
              id: l.id,
              name: l.name,
              spaceId: space.id,
              spaceName: space.name,
              taskCount: l.task_count,
              createdAt: l.date_created ? Number(l.date_created) : undefined,
            })
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

    const allLists = structureParts.flatMap((p) => p.lists)
    const structure = {
      members: head.members,
      memberCount: head.memberCount,
      guestCount: head.guestCount,
      spaceCount: head.spaces.length,
      folderCount: structureParts.reduce((s, p) => s + p.folderCount, 0),
      emptyFolders: structureParts.reduce((s, p) => s + p.emptyFolders, 0),
      lists: allLists.slice(0, SAMPLE_LIST_LIMIT),
      listsTotal: allLists.length,
      statusCounts: structureParts.flatMap((p) => p.statusCounts),
      allStatusNames: Array.from(new Set(allStatuses.map((x) => x.name))),
      duplicateStatusNames: duplicateStatusList.length,
      duplicateStatusList,
      viewCount: structureParts.reduce((s, p) => s + p.viewCount, 0),
      viewSamples: structureParts.flatMap((p) => p.viewSamples).slice(0, SAMPLE_ROWS),
      goalsTracked: insight.goalsTracked,
      customTaskTypes: insight.customTaskTypes,
      spaceWorkflows: (head.spaces as SpaceRef[]).map<SpaceWorkflow>((space) => ({
        id: space.id,
        name: space.name,
        statuses: space.statuses,
      })),
      spaceCreatedAt: (head.spaces as SpaceRef[]).reduce<Record<string, number | undefined>>((acc, space) => {
        acc[space.id] = space.createdAt
        return acc
      }, {}),
    }

    /* ---------------------- tasks (chunked by list) ----------------------- */

    const lists = structure.lists
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const partials: any[] = []

    let idx = 0
    let stepNo = 0
    while (idx < lists.length) {
      const start = idx
      const part = await step.run(`scan-tasks-${stepNo}`, async () => {
        let totalTasks = 0
        let openTasks = 0
        let overdue = 0
        let stale30 = 0
        let stale60 = 0
        let stale90 = 0
        let noDue = 0
        let noAssignee = 0
        let withEstimate = 0
        let openNoDue = 0
        let openNoAssignee = 0
        let openWithEstimate = 0
        let withTime = 0
        let withDependency = 0
        let expectedTasks = 0
        let subtasksUnderClosed = 0
        let subtasksTotal = 0
        let created90 = 0
        let completed90 = 0
        let requiredSlots = 0
        let requiredMissing = 0
        const usedStatus = new Set<string>()
        const usedStatusBySpace: Record<string, Record<string, number>> = {}
        const recentBySpace: Record<string, number> = {}
        const fieldStats = new Map<string, { filled: number; slots: number }>()
        const fieldDefs: FieldDefinition[] = []
        let cfSlots = 0
        let cfFilled = 0
        let stepTruncated = false
        const stepFailedLists: { listId: string; listName: string; error: string }[] = []

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
          created_at: number
          pages_scanned: number
          expected_tasks: number
          truncated: boolean
        }[] = []

        const sampleOverdue: Record<string, string | number>[] = []
        const sampleStale: Record<string, string | number>[] = []
        const sampleMissingDue: Record<string, string | number>[] = []
        const sampleMissingOwner: Record<string, string | number>[] = []

        const batch = selectBatch(lists, start, MAX_LIST_PAGES_PER_STEP)
        for (const list of batch) {
          try {
          let requiredFieldIds: string[] = []
          try {
            const { fields } = await client.getCustomFields(list.id)
            requiredFieldIds = (fields ?? []).filter((field) => field.required).map((field) => field.id)
            for (const field of fields ?? []) {
              fieldDefs.push({ id: field.id, name: field.name, type: field.type, scope: list.name })
            }
          } catch {
            /* Some Lists have no accessible fields. */
          }

          let countInList = 0
          let openInList = 0
          let overdueInList = 0
          let staleInList = 0
          let lastActivity = 0
          let page = 0
          let lastPage = false
          let truncatedList = false
          // Subtasks always live in the same List as their parent in ClickUp, so
          // parent "closed" state can be resolved per List (keeps steps small).
          const listClosed = new Map<string, boolean>()
          const listSubtasks: { parentId: string; open: boolean }[] = []

          while (!lastPage) {
            const { tasks, last_page } = await client.getTasks(list.id, page)
            lastPage = Boolean(last_page) || tasks.length === 0
            for (const task of tasks) {
            countInList += 1
            totalTasks += 1
            const closedType = task.status?.type === 'closed' || task.status?.type === 'done'
            const dueMs = task.due_date ? Number(task.due_date) : null
            const updatedMs = task.date_updated ? Number(task.date_updated) : null
            const createdMs = task.date_created ? Number(task.date_created) : null
            const closedMs = task.date_closed ? Number(task.date_closed) : null
            if (updatedMs && updatedMs > lastActivity) lastActivity = updatedMs
            const statusName = task.status?.status ?? ''
            usedStatus.add(statusName)
            const spaceUsage = usedStatusBySpace[list.spaceId] ?? {}
            spaceUsage[statusName] = (spaceUsage[statusName] ?? 0) + 1
            usedStatusBySpace[list.spaceId] = spaceUsage
            const recentlyActive =
              (createdMs !== null && now - createdMs <= ACTIVE_DAYS * DAY) ||
              (updatedMs !== null && now - updatedMs <= ACTIVE_DAYS * DAY)
            if (recentlyActive) recentBySpace[list.spaceId] = (recentBySpace[list.spaceId] ?? 0) + 1
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
              if (!dueMs) openNoDue += 1
              if (!task.assignees || task.assignees.length === 0) openNoAssignee += 1
              if (task.time_estimate) openWithEstimate += 1
              if (dueMs && dueMs < now) {
                overdue += 1
                overdueInList += 1
                if (sampleOverdue.length < SAMPLE_ROWS) {
                  sampleOverdue.push({
                    task: task.name,
                    assignee: task.assignees?.[0]?.username ?? '— none —',
                    space: list.spaceName,
                    due: `-${Math.round((now - dueMs) / DAY)}d`,
                    status: task.status?.status ?? '—',
                    priority: task.priority?.priority ?? '—',
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
                      ageDays: Math.round(age / DAY),
                      status: task.status?.status ?? '—',
                    })
                  }
                }
              }
            }
            if (!dueMs) {
              noDue += 1
              if (!closedType && sampleMissingDue.length < SAMPLE_ROWS) {
                sampleMissingDue.push({
                  task: task.name,
                  assignee: task.assignees?.[0]?.username ?? '— none —',
                  space: list.spaceName,
                  created: createdMs ? `${Math.round((now - createdMs) / DAY)}d ago` : '—',
                })
              }
            }
            if (!task.assignees || task.assignees.length === 0) {
              noAssignee += 1
              if (!closedType && sampleMissingOwner.length < SAMPLE_ROWS) {
                sampleMissingOwner.push({
                  task: task.name,
                  space: list.spaceName,
                  created: createdMs ? `${Math.round((now - createdMs) / DAY)}d ago` : '—',
                  status: task.status?.status ?? '—',
                })
              }
            }
            if (task.time_estimate) withEstimate += 1
            if (task.time_spent && Number(task.time_spent) > 0) withTime += 1
            if (task.dependencies && task.dependencies.length > 0) withDependency += 1
            if (createdMs && now - createdMs <= STALE_DAYS * DAY) created90 += 1
            if (closedMs && now - closedMs <= STALE_DAYS * DAY) completed90 += 1
            }
            page += 1
            if (!lastPage && page >= MAX_PAGES_PER_LIST) {
              truncatedList = true
              break
            }
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
            created_at: list.createdAt ?? 0,
            pages_scanned: page,
            expected_tasks: list.taskCount ?? countInList,
            truncated: truncatedList,
          })

          expectedTasks += list.taskCount ?? countInList
          if (truncatedList) stepTruncated = true
          } catch (error) {
            expectedTasks += list.taskCount ?? 0
            stepFailedLists.push({
              listId: list.id,
              listName: list.name,
              error: (error as Error)?.message?.slice(0, 200) ?? 'list_read_failed',
            })
          }
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
          openNoDue,
          openNoAssignee,
          openWithEstimate,
          withTime,
          withDependency,
          expectedTasks,
          subtasksUnderClosed,
          subtasksTotal,
          created90,
          completed90,
          requiredSlots,
          requiredMissing,
          cfSlots,
          cfFilled,
          usedStatus: [...usedStatus],
          usedStatusBySpace,
          recentBySpace,
          fieldStats: [...fieldStats.entries()],
          fieldDefs,
          perList,
          sampleOverdue,
          sampleStale,
          sampleMissingDue,
          sampleMissingOwner,
          recentTaskIds,
          activeMemberIds: [...activeMembers],
          memberActivity: [...memberActivity.entries()],
          truncated: stepTruncated,
          failedLists: stepFailedLists,
          nextIndex: start + batch.length,
        }
      })
      partials.push(part)
      idx = (part.nextIndex as number) ?? lists.length
      stepNo += 1

      if (idx >= lists.length || stepNo % 3 === 0) {
        await progress(
          `progress-scan-${stepNo}`,
          Math.min(54, 35 + Math.round((idx / lists.length) * 19)),
          `Analysing tasks — ${Math.min(idx, lists.length)}/${lists.length} Lists`,
        )
      }
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
    const openNoDue = sum('openNoDue')
    const openNoAssignee = sum('openNoAssignee')
    const openWithEstimate = sum('openWithEstimate')
    const withTime = sum('withTime')
    const withDependency = sum('withDependency')
    const expectedTasks = sum('expectedTasks')
    const truncated = partials.some((p) => Boolean(p.truncated))
    const failedLists = partials.flatMap(
      (p) => p.failedLists as { listId: string; listName: string; error: string }[],
    )
    const failedShare = structure.lists.length ? failedLists.length / structure.lists.length : 0
    const missingTasks = Math.max(0, expectedTasks - totalTasks)
    const missingShare = expectedTasks ? missingTasks / expectedTasks : 0
    if (!truncated && (failedShare > 0.1 || missingShare > 0.1)) {
      throw new Error(
        `Scan incomplete: ${failedLists.length} Lists failed and ${missingTasks} of ${expectedTasks} tasks were unreadable.`,
      )
    }
    const partial = failedLists.length > 0 || truncated
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
    const sampleMissingOwner = partials.flatMap((p) => p.sampleMissingOwner).slice(0, SAMPLE_ROWS)
    const recentTaskIds = sampleAcrossLists(
      partials.map((p) => p.recentTaskIds as string[]),
      COMMENT_SAMPLE,
    )
    const activeMemberIds = [...new Set(partials.flatMap((p) => p.activeMemberIds as number[]))]
    const fieldDefs: FieldDefinition[] = []
    const fieldDefinitionIds = new Set<string>()
    for (const p of partials) {
      for (const definition of p.fieldDefs as FieldDefinition[]) {
        if (fieldDefinitionIds.has(definition.id)) continue
        fieldDefinitionIds.add(definition.id)
        fieldDefs.push(definition)
      }
    }
    const usedStatusBySpace: Record<string, Record<string, number>> = {}
    const recentBySpace: Record<string, number> = {}
    for (const p of partials) {
      for (const [spaceId, usage] of Object.entries(p.usedStatusBySpace as Record<string, Record<string, number>>)) {
        const target = usedStatusBySpace[spaceId] ?? {}
        for (const [status, count] of Object.entries(usage)) {
          target[status] = (target[status] ?? 0) + count
        }
        usedStatusBySpace[spaceId] = target
      }
      for (const [spaceId, count] of Object.entries(p.recentBySpace as Record<string, number>)) {
        recentBySpace[spaceId] = (recentBySpace[spaceId] ?? 0) + count
      }
    }
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
    const spaceActivities = buildSpaceActivities(perList, structure.spaceCreatedAt)
    for (const space of structure.spaceWorkflows) {
      if (!spaceActivities.some((candidate) => candidate.id === space.id)) {
        spaceActivities.push({
          id: space.id,
          name: space.name,
          tasks: 0,
          createdAt: structure.spaceCreatedAt[space.id],
        })
      }
    }
    const dormant = dormantStats(
      perList.map((list: {
        list_id: string
        list_name: string
        space_id: string
        space_name: string
        tasks: number
        open_tasks: number
        overdue: number
        last_activity: number
        created_at: number
      }) => ({
        id: list.list_id,
        name: list.list_name,
        spaceId: list.space_id,
        spaceName: list.space_name,
        tasks: list.tasks,
        openTasks: list.open_tasks,
        overdue: list.overdue,
        lastActivity: list.last_activity || undefined,
        createdAt: list.created_at || undefined,
      })),
      spaceActivities,
      now,
    )
    const workflow = workflowStats(structure.spaceWorkflows, usedStatusBySpace)
    const fieldAudit = fieldInventory(
      fieldDefs,
      [...fieldStats.entries()].map(([id, stat]) => ({ id, filled: stat.filled, slots: stat.slots })),
    )
    const coverage = openTaskCoverage({ openTasks, openNoDue, openNoAssignee, openWithEstimate })
    const coverageLists = listCoverage(structure.listsTotal, structure.lists.length)
    const timeFallback = timeTrackingCoverage(undefined, totalTasks, withTime)

    const metrics: Metrics = {
      avgTasksPerList: hasLists ? totalTasks / perList.length : undefined,
      fragmentedListsPct: hasLists ? fragmented / perList.length : undefined,
      dormantList60to90Pct: dormant.dormantList60to90Pct,
      dormantList90PlusPct: dormant.dormantList90PlusPct,
      emptyFoldersPct: structure.folderCount ? structure.emptyFolders / structure.folderCount : undefined,
      statusesPerWorkflow: workflow.statusesPerWorkflow,
      duplicateStatusNames: workflow.duplicateStatusNames,
      overdueRate: hasTasks ? (open > 0 ? overdue / open : 0) : undefined,
      stale30to60Pct: hasTasks ? (open > 0 ? stale30 / open : 0) : undefined,
      stale60to90Pct: hasTasks ? (open > 0 ? stale60 / open : 0) : undefined,
      stale90PlusPct: hasTasks ? (open > 0 ? stale90 / open : 0) : undefined,
      openSubtasksUnderClosedPct: hasTasks && subtasksTotal ? subtasksUnderClosed / subtasksTotal : undefined,
      creationVsCompletionPct: hasTasks ? (created90 - completed90) / (created90 || 1) : undefined,
      wipPerPerson: hasTasks ? (structure.memberCount ? openTasks / structure.memberCount : openTasks) : undefined,
      guestRatio: structure.memberCount ? structure.guestCount / structure.memberCount : undefined,
      unusedStatuses: hasTasks ? workflow.unusedStatuses : undefined,
      timeTrackedPct: timeFallback.timeTrackedPct,
      viewsPerSpace: structure.spaceCount ? structure.viewCount / structure.spaceCount : undefined,
      dependenciesUsed: hasTasks ? withDependency : undefined,
      goalsTracked: structure.goalsTracked,
      customTaskTypes: structure.customTaskTypes,
      dueDateCoverage: coverage.dueDateCoverage,
      ownershipCoverage: coverage.ownershipCoverage,
      estimateCoverage: coverage.estimateCoverage,
      distinctWorkflows: workflow.distinctWorkflows || undefined,
      customFieldCount: fieldAudit.customFieldCount,
      cfCompletionPct: fieldAudit.cfCompletionPct,
      cfZeroFilledPct: fieldAudit.cfZeroFilledPct,
      missingRequiredCfPct: requiredSlots ? requiredMissing / requiredSlots : undefined,
      activityConcentration: activityConcentration(recentBySpace),
    }

    const scan = {
      metrics,
      perList,
      samples: {
        overdue: sampleOverdue,
        stale: sampleStale,
        'missing-due': sampleMissingDue,
        'missing-owner': sampleMissingOwner,
        'custom-fields': fieldAudit.rows,
        'unused-statuses': workflow.rows,
        'dormant-lists': perList.flatMap((list: {
          list_name: string
          space_name: string
          tasks: number
          last_activity: number
          created_at: number
        }) => {
          const age = list.last_activity
            ? now - list.last_activity
            : list.created_at
              ? now - list.created_at
              : null
          if (age === null) return []
          const tier = age >= STALE_DAYS * DAY ? 90 : age >= 60 * DAY ? 60 : 0
          if (!tier) return []
          return [{
            list: list.list_name,
            space: list.space_name,
            tasks: list.tasks,
            lastActivity: list.last_activity
              ? new Date(list.last_activity).toLocaleDateString('en-GB')
              : '— none —',
            tier,
          }]
        }),
        'fragmented-lists': perList
          .filter((list: { open_tasks: number }) => list.open_tasks < 5)
          .map((list: {
            list_name: string
            space_name: string
            open_tasks: number
            tasks: number
            last_activity: number
          }) => ({
            list: list.list_name,
            space: list.space_name,
            openTasks: list.open_tasks,
            tasks: list.tasks,
            lastActivity: list.last_activity
              ? new Date(list.last_activity).toLocaleDateString('en-GB')
              : '—',
          })),
      },
      recentTaskIds,
      activeMemberIds,
      memberActivity: [...memberActivity.entries()],
      dataQuality: {
        partial,
        listsScanned: coverageLists.listsScanned,
        listsTotal: coverageLists.listsTotal,
        listsSampled: coverageLists.sampled,
        tasksScanned: totalTasks,
        tasksExpected: expectedTasks || totalTasks,
        truncated,
        failedLists: failedLists.length,
      },
    }

    await progress('progress-55', 55, 'Sampling activity')

    const activity = await step.run('scan-comments', async () => {
      let totalComments30d = 0
      const commenters = new Set<number>()
      const cutoff = now - ACTIVE_DAYS * DAY
      for (const tid of (scan.recentTaskIds as string[]).slice(0, COMMENT_SAMPLE)) {
        try {
          const { comments } = await client.getTaskComments(tid)
          for (const comment of comments ?? []) {
            const date = comment.date ? Number(comment.date) : null
            if (date !== null && date < cutoff) continue
            totalComments30d += 1
            if (comment.user?.id) commenters.add(comment.user.id)
          }
        } catch {
          /* Individual task comment reads can fail; sample continues. */
        }
      }
      return { totalComments30d, commenterIds: [...commenters] }
    })

    const timeEntries = await step.run('scan-time-entries', async () => {
      try {
        const entries = await client.getTeamTimeEntries(teamId, now - STALE_DAYS * DAY, now)
        return { tasksWithTime: new Set(entries.map((entry) => entry.task?.id).filter(Boolean)).size }
      } catch {
        return { tasksWithTime: undefined }
      }
    })

    // Merge activity-derived + space-level metrics.
    const activeIds = new Set<number>([...(scan.activeMemberIds as number[]), ...activity.commenterIds])
    const activeMemberCount = (structure.members as { id: number }[]).filter((m) => activeIds.has(m.id)).length
    const memberCount = structure.memberCount || 0
    metrics.commentsPerUserPerWeek = recentTaskIds.length
      ? commentRate(activity.totalComments30d, activeMemberCount)
      : undefined
    if (timeEntries.tasksWithTime !== undefined) {
      metrics.timeTrackedPct = totalTasks
        ? Math.min(1, timeEntries.tasksWithTime / totalTasks)
        : undefined
    }

    const bySpace = new Map<
      string,
      { id: string; name: string; tasks: number; last: number; lists: number; createdAt?: number }
    >()
    for (const l of scan.perList as { space_id: string; space_name: string; tasks: number; last_activity: number }[]) {
      const s = bySpace.get(l.space_id) ?? {
        id: l.space_id,
        name: l.space_name,
        tasks: 0,
        last: 0,
        lists: 0,
        createdAt: structure.spaceCreatedAt[l.space_id],
      }
      s.tasks += l.tasks
      s.lists += 1
      if (l.last_activity > s.last) s.last = l.last_activity
      bySpace.set(l.space_id, s)
    }
    const totalTasksAll = (scan.perList as { tasks: number }[]).reduce((s, l) => s + l.tasks, 0)
    const hasTasks2 = totalTasksAll > 0
    const spaceAgg = [...bySpace.values()]
    const dormantSpaceRows = spaceActivities
      .filter((space) => {
        const age = space.lastActivity
          ? now - space.lastActivity
          : space.createdAt
            ? now - space.createdAt
            : null
        return age !== null && age > STALE_DAYS * DAY
      })
      .map((space) => {
        const lists = perList.filter((list: { space_id: string }) => list.space_id === space.id).length
        return {
          space: space.name,
          lists,
          tasks: space.tasks,
          lastActivity: space.lastActivity
            ? new Date(space.lastActivity).toLocaleDateString('en-GB')
            : '—',
        }
      })

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
      dormantSpacesPct: dormant.dormantSpacesPct,
      inactiveMemberPct: hasTasks2 && memberCount ? (memberCount - activeMemberCount) / memberCount : undefined,
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
      dataQuality: scan.dataQuality,
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
