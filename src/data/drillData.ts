export interface DrillColumn {
  key: string
  label: string
  align?: 'right'
}

export type DrillRow = Record<string, string | number>

export interface DrillDataset {
  key: string
  title: string
  subtitle: string
  unit: string
  columns: DrillColumn[]
  rows: DrillRow[]
}

const SPACES = ['Studio Ops', 'Client Delivery', 'Sales & Pipeline', 'Marketing', 'Finance', 'People & Culture']
const MEMBERS = [
  'Emily B.', 'Marcus H.', 'Priya S.', 'Tom R.', 'Ava L.', 'Diego M.',
  'Sofia K.', 'Liam O.', 'Nadia F.', 'Jonas W.', 'Ivy C.', 'Ben T.',
]
const CLIENTS = ['Northwind', 'Halcyon', 'Riverbank', 'Meridian', 'Cobalt', 'Lumen', 'Vantage', 'Orchard']
const FIELD_NAMES = ['Client', 'Project Code', 'Budget', 'Campaign', 'Asset Type', 'Region', 'Priority Score', 'Effort', 'Sprint', 'Approval', 'Channel', 'Deadline Type']

function seeded(n: number) {
  const x = Math.sin(n * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

function pick<T>(arr: T[], n: number) {
  return arr[Math.floor(seeded(n) * arr.length)]
}

function dormantLists(): DrillRow[] {
  return Array.from({ length: 23 }).map((_, i) => ({
    list: `${pick(CLIENTS, i * 3 + 1)} ${pick(['Ops', 'Delivery', 'Roadmap', 'Archive', 'QA', 'Ideas'], i * 5 + 2)}`,
    space: pick(SPACES, i * 7 + 1),
    tasks: Math.round(seeded(i * 11 + 3) * 4) + 1,
    lastActivity: `${Math.round(seeded(i * 13 + 5) * 180) + 30}d ago`,
  }))
}

function customFields(): DrillRow[] {
  return Array.from({ length: 18 }).map((_, i) => {
    const completion = Math.round(seeded(i * 9 + 2) * 40)
    return {
      field: `${pick(FIELD_NAMES, i * 4 + 1)}${seeded(i * 3) > 0.6 ? ' (v2)' : ''}`,
      scope: pick(['Workspace', 'Space', 'List', 'Folder'], i * 6 + 3),
      type: pick(['Text', 'Dropdown', 'Number', 'Date', 'Labels', 'Money'], i * 8 + 4),
      completion: `${completion}%`,
      status: completion < 8 ? 'Unused' : completion < 25 ? 'Rarely used' : 'In use',
    }
  })
}

function overdueTasks(): DrillRow[] {
  return Array.from({ length: 20 }).map((_, i) => {
    const days = Math.round(seeded(i * 17 + 2) * 60) + 3
    return {
      task: `${pick(['Finalise', 'Review', 'Deliver', 'QA', 'Design', 'Send'], i * 5 + 1)} ${pick(CLIENTS, i * 7 + 2)} ${pick(['landing page', 'report', 'assets', 'proposal', 'handover', 'audit'], i * 3 + 1)}`,
      assignee: pick(MEMBERS, i * 11 + 4),
      space: pick(SPACES, i * 13 + 1),
      due: `-${days}d`,
      priority: pick(['Urgent', 'High', 'Normal'], i * 9 + 2),
    }
  })
}

function staleTasks(): DrillRow[] {
  return Array.from({ length: 16 }).map((_, i) => {
    const days = Math.round(seeded(i * 7 + 3) * 150) + 90
    return {
      task: `${pick(['Update', 'Migrate', 'Automate', 'Document', 'Clean up'], i * 5 + 2)} ${pick(CLIENTS, i * 3 + 1)} ${pick(['workflow', 'fields', 'lists', 'integrations', 'statuses'], i * 7 + 1)}`,
      owner: pick(MEMBERS, i * 13 + 5),
      space: pick(SPACES, i * 11 + 2),
      lastUpdate: `${days}d ago`,
      status: pick(['In Progress', 'To Do', 'In Review', 'Blocked'], i * 9 + 3),
    }
  })
}

function missingDue(): DrillRow[] {
  return Array.from({ length: 14 }).map((_, i) => ({
    task: `${pick(['Scope', 'Plan', 'Build', 'Launch', 'Research'], i * 5 + 1)} ${pick(CLIENTS, i * 7 + 2)}`,
    assignee: seeded(i * 3) > 0.4 ? pick(MEMBERS, i * 9 + 1) : '— none —',
    space: pick(SPACES, i * 11 + 3),
    created: `${Math.round(seeded(i * 13 + 1) * 40) + 5}d ago`,
  }))
}

function quietSeats(): DrillRow[] {
  return ['Emily B.', 'Tom R.', 'Nadia F.', 'Jonas W.', 'Ivy C.'].map((m, i) => ({
    member: m,
    role: pick(['Member', 'Admin', 'Limited Member'], i * 4 + 1),
    lastActivity: `${Math.round(seeded(i * 7 + 2) * 60) + 30}d ago`,
    monthCost: `$${18 + i}`,
  }))
}

function unusedStatuses(): DrillRow[] {
  return ['Backlog', 'On Hold', 'Cancelled', 'Awaiting Client', 'Duplicate', 'Deferred', 'QA Failed', 'Post-Launch', 'Archived'].map(
    (s, i) => ({
      status: s,
      space: pick(SPACES, i * 5 + 1),
      tasksUsing: Math.round(seeded(i * 9 + 2) * 4),
      equivalent: pick(['To Do', 'In Progress', 'Done', '— none —'], i * 3 + 1),
    }),
  )
}

function allDrills(): DrillDataset[] {
  return [
    {
      key: 'dormant-lists',
      title: 'Dormant Lists',
      subtitle: 'Active Lists with fewer than 5 tasks and no recent activity',
      unit: '23 Lists',
      columns: [
        { key: 'list', label: 'List' },
        { key: 'space', label: 'Space' },
        { key: 'tasks', label: 'Tasks', align: 'right' },
        { key: 'lastActivity', label: 'Last activity', align: 'right' },
      ],
      rows: dormantLists(),
    },
    {
      key: 'custom-fields',
      title: 'Custom Field audit',
      subtitle: 'Fields by completion rate — lowest first',
      unit: '148 fields',
      columns: [
        { key: 'field', label: 'Custom Field' },
        { key: 'scope', label: 'Scope' },
        { key: 'type', label: 'Type' },
        { key: 'completion', label: 'Completion', align: 'right' },
        { key: 'status', label: 'Status', align: 'right' },
      ],
      rows: customFields(),
    },
    {
      key: 'overdue',
      title: 'Overdue tasks',
      subtitle: 'Active tasks past their due date (worst first)',
      unit: '4,466 tasks',
      columns: [
        { key: 'task', label: 'Task' },
        { key: 'assignee', label: 'Assignee' },
        { key: 'space', label: 'Space' },
        { key: 'due', label: 'Overdue', align: 'right' },
        { key: 'priority', label: 'Priority', align: 'right' },
      ],
      rows: overdueTasks(),
    },
    {
      key: 'stale',
      title: 'Stale tasks',
      subtitle: 'Open tasks untouched for 90+ days',
      unit: '612 tasks',
      columns: [
        { key: 'task', label: 'Task' },
        { key: 'owner', label: 'Owner' },
        { key: 'space', label: 'Space' },
        { key: 'lastUpdate', label: 'Last update', align: 'right' },
        { key: 'status', label: 'Status', align: 'right' },
      ],
      rows: staleTasks(),
    },
    {
      key: 'missing-due',
      title: 'Tasks without an owner or due date',
      subtitle: 'Active tasks missing critical scheduling data',
      unit: '1,284 tasks',
      columns: [
        { key: 'task', label: 'Task' },
        { key: 'assignee', label: 'Assignee' },
        { key: 'space', label: 'Space' },
        { key: 'created', label: 'Created', align: 'right' },
      ],
      rows: missingDue(),
    },
    {
      key: 'quiet-seats',
      title: 'Quiet paid seats',
      subtitle: 'Paid members with no activity in 30 days',
      unit: '5 seats · ~$95/mo',
      columns: [
        { key: 'member', label: 'Member' },
        { key: 'role', label: 'Role' },
        { key: 'lastActivity', label: 'Last activity', align: 'right' },
        { key: 'monthCost', label: 'Cost / mo', align: 'right' },
      ],
      rows: quietSeats(),
    },
    {
      key: 'unused-statuses',
      title: 'Unused & duplicate statuses',
      subtitle: 'Statuses applied to fewer than 1% of tasks',
      unit: '9 statuses',
      columns: [
        { key: 'status', label: 'Status' },
        { key: 'space', label: 'Space' },
        { key: 'tasksUsing', label: 'Tasks using', align: 'right' },
        { key: 'equivalent', label: 'Equivalent status', align: 'right' },
      ],
      rows: unusedStatuses(),
    },
  ]
}

export const drillData: Record<string, DrillDataset> = Object.fromEntries(
  allDrills().map((d) => [d.key, d]),
)

/** Map metric labels → drill dataset key. */
export const metricDrill: Record<string, string> = {
  'Dormant Lists': 'dormant-lists',
  'Custom Fields': 'custom-fields',
  'Unused fields': 'custom-fields',
  'Field completion': 'custom-fields',
  'Overdue rate': 'overdue',
  'Stale 90d+': 'stale',
  'Unused statuses': 'unused-statuses',
  'Quiet seats': 'quiet-seats',
}

/** Map finding ids → drill dataset key. */
export const findingDrill: Record<string, string> = {
  'f-overdue': 'overdue',
  'f-frag': 'dormant-lists',
  'f-status': 'unused-statuses',
  'f-stale': 'stale',
  'f-customfields': 'custom-fields',
  'f-undated': 'missing-due',
  'f-quiet': 'quiet-seats',
}

/** Build a dataset for a specific Space (used by the 3D topology). */
export function spaceDataset(name: string): DrillDataset {
  const rows: DrillRow[] = Array.from({ length: 12 }).map((_, i) => {
    const tasks = Math.round(seeded(name.length * 7 + i * 5) * 90) + 3
    const health = seeded(name.length + i * 3)
    return {
      list: `${pick(CLIENTS, i * 3 + name.length)} ${pick(['Delivery', 'Ops', 'Backlog', 'Review', 'Planning', 'Archive'], i * 5 + 1)}`,
      tasks,
      overdue: Math.round(tasks * seeded(i * 9 + 2) * 0.5),
      lastActivity: `${Math.round(seeded(i * 11 + 4) * 120) + 1}d ago`,
      health: health > 0.7 ? 'Healthy' : health > 0.4 ? 'Needs attention' : 'At risk',
    }
  })
  const total = rows.reduce((s, r) => s + Number(r.tasks), 0)
  return {
    key: `space:${name}`,
    title: name,
    subtitle: 'Lists in this Space and their health',
    unit: `${rows.length} Lists · ${total.toLocaleString()} tasks`,
    columns: [
      { key: 'list', label: 'List' },
      { key: 'tasks', label: 'Tasks', align: 'right' },
      { key: 'overdue', label: 'Overdue', align: 'right' },
      { key: 'lastActivity', label: 'Last activity', align: 'right' },
      { key: 'health', label: 'Health', align: 'right' },
    ],
    rows,
  }
}

export function getDataset(key: string | null): DrillDataset | null {
  if (!key) return null
  if (key.startsWith('space:')) return spaceDataset(key.slice(6))
  return drillData[key] ?? null
}

