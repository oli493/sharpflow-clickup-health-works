export const DAY_MS = 86_400_000

export interface TaskCoverageCounts {
  openTasks: number
  openNoDue: number
  openNoAssignee: number
  openWithEstimate: number
}

export interface TaskCoverage {
  dueDateCoverage?: number
  ownershipCoverage?: number
  estimateCoverage?: number
}

export function openTaskCoverage(counts: TaskCoverageCounts): TaskCoverage {
  if (counts.openTasks <= 0) return {}
  return {
    dueDateCoverage: 1 - counts.openNoDue / counts.openTasks,
    ownershipCoverage: 1 - counts.openNoAssignee / counts.openTasks,
    estimateCoverage: counts.openWithEstimate / counts.openTasks,
  }
}

export interface ListActivity {
  id: string
  name: string
  spaceId: string
  spaceName: string
  tasks: number
  openTasks: number
  overdue: number
  lastActivity?: number
  createdAt?: number
}

export interface SpaceActivity {
  id: string
  name: string
  tasks: number
  lastActivity?: number
  createdAt?: number
}

export interface DormantStats {
  dormantList60: number
  dormantList90: number
  emptyLists: number
  unknownAgeLists: number
  dormantList60to90Pct?: number
  dormantList90PlusPct?: number
  dormantSpaces: number
  emptySpaces: number
  unknownAgeSpaces: number
  dormantSpacesPct?: number
}

export function dormantStats(lists: ListActivity[], spaces: SpaceActivity[], now: number): DormantStats {
  let dormantList60 = 0
  let dormantList90 = 0
  let emptyLists = 0
  let unknownAgeLists = 0

  for (const list of lists) {
    const age = listAge(list, now)
    if (list.tasks === 0) emptyLists += 1
    if (age === null) {
      unknownAgeLists += 1
      continue
    }
    if (age >= 90 * DAY_MS) dormantList90 += 1
    else if (age >= 60 * DAY_MS) dormantList60 += 1
  }

  let dormantSpaces = 0
  let emptySpaces = 0
  let unknownAgeSpaces = 0
  for (const space of spaces) {
    const age = spaceAge(space, now)
    if (space.tasks === 0) emptySpaces += 1
    if (age === null) {
      unknownAgeSpaces += 1
      continue
    }
    if (age >= 90 * DAY_MS) dormantSpaces += 1
  }

  return {
    dormantList60,
    dormantList90,
    emptyLists,
    unknownAgeLists,
    dormantList60to90Pct: lists.length ? dormantList60 / lists.length : undefined,
    dormantList90PlusPct: lists.length ? dormantList90 / lists.length : undefined,
    dormantSpaces,
    emptySpaces,
    unknownAgeSpaces,
    dormantSpacesPct: spaces.length ? dormantSpaces / spaces.length : undefined,
  }
}

function listAge(list: ListActivity, now: number): number | null {
  if (list.lastActivity) return now - list.lastActivity
  if (list.createdAt) return now - list.createdAt
  return null
}

function spaceAge(space: SpaceActivity, now: number): number | null {
  if (space.lastActivity) return now - space.lastActivity
  if (space.createdAt) return now - space.createdAt
  return null
}

export interface StatusDef {
  status: string
  type: string
}

export interface SpaceWorkflow {
  id: string
  name: string
  statuses: StatusDef[]
}

export interface StatusUsageRow {
  status: string
  space: string
  tasksUsing: number
}

export interface WorkflowStats {
  distinctWorkflows: number
  statusesPerWorkflow?: number
  unusedStatuses?: number
  duplicateStatusNames: number
  rows: StatusUsageRow[]
}

export function workflowStats(
  spaces: SpaceWorkflow[],
  usedBySpace: Record<string, Record<string, number>>,
): WorkflowStats {
  const signatureMap = new Map<string, { statuses: StatusDef[]; spaceIds: string[] }>()
  for (const space of spaces) {
    const signature = statusSignature(space.statuses)
    const entry = signatureMap.get(signature) ?? { statuses: space.statuses, spaceIds: [] }
    entry.spaceIds.push(space.id)
    signatureMap.set(signature, entry)
  }

  let unusedStatuses = 0
  const statusCounts = [...signatureMap.values()].map((entry) => entry.statuses.length)
  for (const entry of signatureMap.values()) {
    const used = new Set<string>()
    for (const spaceId of entry.spaceIds) {
      for (const status of Object.keys(usedBySpace[spaceId] ?? {})) used.add(status)
    }
    for (const status of entry.statuses) {
      if (!used.has(status.status)) unusedStatuses += 1
    }
  }

  const rows: StatusUsageRow[] = []
  for (const space of spaces) {
    const usage = usedBySpace[space.id] ?? {}
    for (const status of space.statuses) {
      rows.push({
        status: status.status,
        space: space.name,
        tasksUsing: usage[status.status] ?? 0,
      })
    }
  }

  const duplicateStatusNames = countDuplicateStatusNames(spaces)

  return {
    distinctWorkflows: signatureMap.size,
    statusesPerWorkflow: statusCounts.length
      ? statusCounts.reduce((sum, count) => sum + count, 0) / statusCounts.length
      : undefined,
    unusedStatuses: spaces.length ? unusedStatuses : undefined,
    duplicateStatusNames,
    rows,
  }
}

function statusSignature(statuses: StatusDef[]): string {
  if (!statuses.length) return 'none'
  return statuses
    .map((status) => `${status.status}:${status.type}`)
    .sort()
    .join('|')
}

function countDuplicateStatusNames(spaces: SpaceWorkflow[]): number {
  const names = new Map<string, Set<string>>()
  for (const space of spaces) {
    for (const status of space.statuses) {
      const types = names.get(status.status) ?? new Set<string>()
      types.add(status.type)
      names.set(status.status, types)
    }
  }
  return [...names.values()].filter((types) => types.size > 1).length
}

export interface FieldDefinition {
  id: string
  name: string
  type: string
  scope: string
}

export interface FieldStat {
  id: string
  filled: number
  slots: number
}

export interface FieldAuditRow {
  field: string
  scope: string
  completion: string
  status: string
}

export interface FieldInventory {
  customFieldCount?: number
  cfCompletionPct?: number
  cfZeroFilledPct?: number
  rows: FieldAuditRow[]
}

export function fieldInventory(definitions: FieldDefinition[], stats: FieldStat[]): FieldInventory {
  const unique = new Map<string, FieldDefinition>()
  for (const definition of definitions) unique.set(definition.id, definition)
  const statsById = new Map(stats.map((stat) => [stat.id, stat]))

  let cfSlots = 0
  let cfFilled = 0
  for (const stat of stats) {
    cfSlots += stat.slots
    cfFilled += stat.filled
  }

  const rows: FieldAuditRow[] = []
  let zeroFilled = 0
  for (const definition of unique.values()) {
    const stat = statsById.get(definition.id) ?? { id: definition.id, filled: 0, slots: 0 }
    const completion = stat.slots > 0 ? stat.filled / stat.slots : 0
    if (completion === 0) zeroFilled += 1
    rows.push({
      field: definition.name,
      scope: definition.scope,
      completion: `${Math.round(completion * 100)}%`,
      status: completion === 0 ? 'Never filled' : completion < 0.5 ? 'Low completion' : 'Healthy',
    })
  }

  return {
    customFieldCount: unique.size || undefined,
    cfCompletionPct: cfSlots ? cfFilled / cfSlots : undefined,
    cfZeroFilledPct: unique.size ? zeroFilled / unique.size : undefined,
    rows,
  }
}

export function commentRate(totalComments30d: number, activeMembers: number): number | undefined {
  if (activeMembers <= 0) return undefined
  return totalComments30d / activeMembers / (30 / 7)
}

export function activityConcentration(recentBySpace: Record<string, number>): number | undefined {
  const values = Object.values(recentBySpace)
  const total = values.reduce((sum, value) => sum + value, 0)
  if (total <= 0) return undefined
  return Math.max(...values) / total
}

export interface ListCoverage {
  listsTotal: number
  listsScanned: number
  sampled: boolean
  pct: number
}

export function listCoverage(listsTotal: number, listsScanned: number): ListCoverage {
  return {
    listsTotal,
    listsScanned,
    sampled: listsTotal > listsScanned,
    pct: listsTotal ? listsScanned / listsTotal : 1,
  }
}

export interface TimeTrackingResult {
  timeTrackedPct?: number
  measured: boolean
  source: '90d' | 'fallback' | 'unavailable'
}

export function timeTrackingCoverage(
  tasksWithTime90d: number | undefined,
  totalTasks: number,
  fallbackTasksWithTime: number,
): TimeTrackingResult {
  if (tasksWithTime90d !== undefined) {
    return {
      timeTrackedPct: totalTasks ? Math.min(1, tasksWithTime90d / totalTasks) : undefined,
      measured: true,
      source: '90d',
    }
  }
  return {
    timeTrackedPct: totalTasks ? fallbackTasksWithTime / totalTasks : undefined,
    measured: false,
    source: totalTasks ? 'fallback' : 'unavailable',
  }
}
