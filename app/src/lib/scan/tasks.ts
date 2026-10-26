import type { ClickUpClient } from '@/lib/clickup/client'
import type { ClickUpCustomField, ClickUpTask } from '@/lib/clickup/types'
import type { FieldDefinition } from './metrics'

const DAY = 86_400_000
const STALE_DAYS = 90
const ACTIVE_DAYS = 30
const SAMPLE_ROWS = 100
const COMMENT_SAMPLE = 60

export interface TaskListRef {
  id: string
  name: string
  spaceId: string
  spaceName: string
  taskCount?: number
  createdAt?: number
}

export interface ListStat {
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
}

export interface ListScanPart {
  totalTasks: number
  openTasks: number
  overdue: number
  stale30: number
  stale60: number
  stale90: number
  noDue: number
  noAssignee: number
  withEstimate: number
  openNoDue: number
  openNoAssignee: number
  openWithEstimate: number
  withTime: number
  withDependency: number
  expectedTasks: number
  subtasksUnderClosed: number
  subtasksTotal: number
  created90: number
  completed90: number
  requiredSlots: number
  requiredMissing: number
  cfSlots: number
  cfFilled: number
  usedStatus: string[]
  usedStatusBySpace: Record<string, Record<string, number>>
  recentBySpace: Record<string, number>
  fieldStats: [string, { filled: number; slots: number }][]
  fieldDefs: FieldDefinition[]
  perList: ListStat[]
  sampleOverdue: Record<string, string | number>[]
  sampleStale: Record<string, string | number>[]
  sampleMissingDue: Record<string, string | number>[]
  sampleMissingOwner: Record<string, string | number>[]
  recentTaskIds: string[]
  activeMemberIds: number[]
  memberActivity: [number, number][]
  truncated: boolean
  failedLists: { listId: string; listName: string; error: string }[]
}

export interface ScanListOptions {
  pageWindow?: number
  maxPages?: number
  fields?: ClickUpCustomField[]
  firstPage?: { tasks: ClickUpTask[]; last_page?: boolean }
}

function emptyPart(list: TaskListRef, error: unknown, expectedTasks: number): ListScanPart {
  return {
    totalTasks: 0,
    openTasks: 0,
    overdue: 0,
    stale30: 0,
    stale60: 0,
    stale90: 0,
    noDue: 0,
    noAssignee: 0,
    withEstimate: 0,
    openNoDue: 0,
    openNoAssignee: 0,
    openWithEstimate: 0,
    withTime: 0,
    withDependency: 0,
    expectedTasks,
    subtasksUnderClosed: 0,
    subtasksTotal: 0,
    created90: 0,
    completed90: 0,
    requiredSlots: 0,
    requiredMissing: 0,
    cfSlots: 0,
    cfFilled: 0,
    usedStatus: [],
    usedStatusBySpace: {},
    recentBySpace: {},
    fieldStats: [],
    fieldDefs: [],
    perList: [],
    sampleOverdue: [],
    sampleStale: [],
    sampleMissingDue: [],
    sampleMissingOwner: [],
    recentTaskIds: [],
    activeMemberIds: [],
    memberActivity: [],
    truncated: false,
    failedLists: [
      {
        listId: list.id,
        listName: list.name,
        error: (error as Error)?.message?.slice(0, 200) ?? 'list_read_failed',
      },
    ],
  }
}

export async function scanList(
  client: ClickUpClient,
  list: TaskListRef,
  now: number,
  options: ScanListOptions = {},
): Promise<ListScanPart> {
  try {
    const pageWindow = Math.min(24, Math.max(1, options.pageWindow ?? 16))
    const maxPages = Math.max(1, options.maxPages ?? 400)
    let fields = options.fields
    if (!fields) {
      try {
        const response = await client.getCustomFields(list.id)
        fields = response.fields ?? []
      } catch {
        fields = []
      }
    }

    const requiredFieldIds = fields.filter((field) => field.required).map((field) => field.id)
    const fieldDefs: FieldDefinition[] = fields.map((field) => ({
      id: field.id,
      name: field.name,
      type: field.type,
      scope: list.name,
    }))

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
    let subtasksUnderClosed = 0
    let subtasksTotal = 0
    let created90 = 0
    let completed90 = 0
    let requiredSlots = 0
    let requiredMissing = 0
    let cfSlots = 0
    let cfFilled = 0

    let countInList = 0
    let openInList = 0
    let overdueInList = 0
    let staleInList = 0
    let lastActivity = 0
    let page = 0
    let lastPage = false
    let truncated = false

    const usedStatus = new Set<string>()
    const usedStatusBySpace: Record<string, Record<string, number>> = {}
    const recentBySpace: Record<string, number> = {}
    const fieldStats = new Map<string, { filled: number; slots: number }>()
    const activeMembers = new Set<number>()
    const memberActivity = new Map<number, number>()
    const recentTaskIds: string[] = []
    const listClosed = new Map<string, boolean>()
    const listSubtasks: { parentId: string; open: boolean }[] = []

    const sampleOverdue: Record<string, string | number>[] = []
    const sampleStale: Record<string, string | number>[] = []
    const sampleMissingDue: Record<string, string | number>[] = []
    const sampleMissingOwner: Record<string, string | number>[] = []

    const bump = (id: number, ms: number) => {
      const prev = memberActivity.get(id) ?? 0
      if (ms > prev) memberActivity.set(id, ms)
    }

    while (!lastPage) {
      const prefetched = page === 0 ? options.firstPage : undefined
      const first = prefetched ?? (await client.getTasks(list.id, page))
      const responses: {
        page: number
        tasks?: ClickUpTask[]
        last_page?: boolean
        error?: unknown
      }[] = [{ page, ...first }]

      if (!first.last_page && first.tasks.length > 0 && page + 1 < maxPages) {
        const startPage = page + 1
        const count = Math.min(pageWindow, maxPages - startPage)
        const pages = Array.from({ length: count }, (_, index) => startPage + index)
        const rest = await Promise.all(
          pages.map(async (nextPage) => {
            try {
              const result = await client.getTasks(list.id, nextPage)
              return { page: nextPage, ...result }
            } catch (error) {
              return { page: nextPage, error }
            }
          }),
        )
        responses.push(...rest)
      }

      responses.sort((a, b) => a.page - b.page)
      for (const response of responses) {
        if (response.error) {
          if (lastPage) break
          throw response.error
        }
        const tasks = response.tasks ?? []
        const isLast = Boolean(response.last_page) || tasks.length === 0

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
          const cfs = task.custom_fields
          if (cfs) {
            for (const field of cfs) {
              const stat = fieldStats.get(field.id) ?? { filled: 0, slots: 0 }
              stat.slots += 1
              cfSlots += 1
              const value = field.value
              const empty =
                value === null ||
                value === undefined ||
                value === '' ||
                (Array.isArray(value) && value.length === 0)
              if (!empty) {
                stat.filled += 1
                cfFilled += 1
              }
              fieldStats.set(field.id, stat)
            }
          }

          if (requiredFieldIds.length) {
            const values = new Map((cfs ?? []).map((field) => [field.id, field.value]))
            for (const fieldId of requiredFieldIds) {
              requiredSlots += 1
              const value = values.get(fieldId)
              const empty =
                value === undefined ||
                value === null ||
                value === '' ||
                (Array.isArray(value) && value.length === 0)
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
            for (const assignee of task.assignees ?? []) {
              activeMembers.add(assignee.id)
              bump(assignee.id, updatedMs ?? closedMs ?? now)
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

        page = response.page + 1
        if (isLast) {
          lastPage = true
          break
        }
        if (page >= maxPages) {
          truncated = true
          lastPage = true
          break
        }
      }
    }

    for (const subtask of listSubtasks) {
      if (subtask.open && listClosed.get(subtask.parentId) === true) subtasksUnderClosed += 1
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
      expectedTasks: list.taskCount ?? countInList,
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
      perList: [
        {
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
          truncated,
        },
      ],
      sampleOverdue,
      sampleStale,
      sampleMissingDue,
      sampleMissingOwner,
      recentTaskIds,
      activeMemberIds: [...activeMembers],
      memberActivity: [...memberActivity.entries()],
      truncated,
      failedLists: [],
    }
  } catch (error) {
    return emptyPart(list, error, list.taskCount ?? 0)
  }
}
