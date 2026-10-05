export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'opportunity'

export type CategoryKey =
  | 'architecture'
  | 'workflow'
  | 'governance'
  | 'operational'
  | 'adoption'
  | 'utilisation'
  | 'reporting'

export interface CategoryScore {
  key: CategoryKey
  name: string
  score: number
  blurb: string
  metrics: { label: string; value: string; tone?: 'up' | 'down' | 'neutral' }[]
}

export interface Finding {
  id: string
  title: string
  category: string
  severity: Severity
  metric: string
  metricLabel: string
  explanation: string
  recommendation: string
  affected?: string
}

export type UtilisationStatus = 'detected' | 'partial' | 'not_measurable'

export interface UtilisationRow {
  capability: string
  status: UtilisationStatus
  detail: string
}

export const workspace = {
  id: '90131280206',
  name: 'Northwind Creative',
  plan: 'Business Plus',
  members: 42,
  paidSeats: 38,
  spaces: 6,
  folders: 31,
  lists: 214,
  activeTasks: 14217,
  overdue: 3428,
  completedLast90: 9120,
  createdLast90: 10804,
  staleTasks: 612,
  lastScan: 'just now',
}

export const overallScore = 74
export const overallGrade = 'C+'

export const categoryScores: CategoryScore[] = [
  {
    key: 'architecture',
    name: 'Architecture & Structure',
    score: 81,
    blurb: 'Hierarchy is broadly healthy, with a few fragmented Lists worth consolidating.',
    metrics: [
      { label: 'Spaces', value: '6', tone: 'neutral' },
      { label: 'Avg tasks / List', value: '66.4', tone: 'up' },
      { label: 'Dormant Lists', value: '23', tone: 'down' },
    ],
  },
  {
    key: 'workflow',
    name: 'Workflow Design',
    score: 77,
    blurb: 'Status workflows are consistent, though some duplication and unused statuses remain.',
    metrics: [
      { label: 'Statuses / Space', value: '6.4', tone: 'neutral' },
      { label: 'Unused statuses', value: '9', tone: 'down' },
      { label: 'Avg time in status', value: '4.2d', tone: 'neutral' },
    ],
  },
  {
    key: 'governance',
    name: 'Data & Governance',
    score: 62,
    blurb: 'Custom Field sprawl and low completion rates are pulling the score down.',
    metrics: [
      { label: 'Custom Fields', value: '148', tone: 'down' },
      { label: 'Field completion', value: '43%', tone: 'down' },
      { label: 'Unused fields', value: '61', tone: 'down' },
    ],
  },
  {
    key: 'operational',
    name: 'Operational Health',
    score: 68,
    blurb: 'A high overdue rate and a growing stale backlog are the biggest risks.',
    metrics: [
      { label: 'Overdue rate', value: '24.1%', tone: 'down' },
      { label: 'Stale 90d+', value: '612', tone: 'down' },
      { label: 'Completion rate', value: '84%', tone: 'up' },
    ],
  },
  {
    key: 'adoption',
    name: 'Adoption & Activity',
    score: 79,
    blurb: 'Most seats are active, with a handful of quiet members and Spaces.',
    metrics: [
      { label: 'Active members', value: '37 / 42', tone: 'up' },
      { label: 'Quiet seats', value: '5', tone: 'down' },
      { label: 'Comments (30d)', value: '3,914', tone: 'up' },
    ],
  },
  {
    key: 'utilisation',
    name: 'Platform Utilisation',
    score: 57,
    blurb: 'Several high-value ClickUp capabilities are enabled but barely used.',
    metrics: [
      { label: 'Capabilities used', value: '8 / 18', tone: 'down' },
      { label: 'Automations', value: '0', tone: 'down' },
      { label: 'Goals tracked', value: '2', tone: 'neutral' },
    ],
  },
  {
    key: 'reporting',
    name: 'Reporting Readiness',
    score: 83,
    blurb: 'Strong due-date and ownership coverage — reporting data is in good shape.',
    metrics: [
      { label: 'Due-date coverage', value: '91%', tone: 'up' },
      { label: 'Ownership', value: '88%', tone: 'up' },
      { label: 'Estimate coverage', value: '34%', tone: 'down' },
    ],
  },
]

export const findingsSummary = {
  critical: 4,
  high: 11,
  opportunity: 24,
  total: 39,
}

export const findings: Finding[] = [
  {
    id: 'f-overdue',
    title: 'High overdue task rate',
    category: 'Operational Health',
    severity: 'critical',
    metric: '31.4%',
    metricLabel: 'of active tasks overdue',
    explanation:
      '31.4% of active tasks (4,466 of 14,217) are past their due date — well above the 15% threshold used by the Health Score. Overdue work concentrates in 3 of 6 Spaces.',
    recommendation:
      'Review ageing work and decide what to close, reschedule, reassign or remove from active workflows. Set a weekly overdue sweep per Space.',
    affected: '3 Spaces · 4,466 tasks',
  },
  {
    id: 'f-frag',
    title: 'Potential List fragmentation',
    category: 'Architecture & Structure',
    severity: 'high',
    metric: '38%',
    metricLabel: 'of active Lists under 5 tasks',
    explanation:
      '81 of 214 active Lists contain fewer than 5 active tasks, suggesting structure has drifted into thin, hard-to-manage Lists.',
    recommendation:
      'Consolidate thin Lists by client, workstream or sprint. Consider Folders instead of Lists for long-running groupings.',
    affected: '81 Lists',
  },
  {
    id: 'f-status',
    title: 'Status sprawl and duplication',
    category: 'Workflow Design',
    severity: 'high',
    metric: '14',
    metricLabel: 'statuses, 9 never used',
    explanation:
      'Some Spaces define up to 14 statuses, and 9 are used on fewer than 1% of tasks. Duplicate stages ("In Review" / "Review") appear in 2 Spaces.',
    recommendation:
      'Standardise to a shared status set per Space and archive unused statuses. Align "Review" naming across Spaces.',
    affected: '2 Spaces · 9 statuses',
  },
  {
    id: 'f-stale',
    title: 'Large stale backlog',
    category: 'Operational Health',
    severity: 'high',
    metric: '612',
    metricLabel: 'tasks untouched 90+ days',
    explanation:
      '612 open tasks have not been updated in over 90 days, and 2,140 in over 30 days, inflating WIP and skewing reporting.',
    recommendation:
      'Introduce a 60-day stale rule that auto-flags old tasks for triage. Close or archive what is no longer relevant.',
    affected: '612 tasks',
  },
  {
    id: 'f-customfields',
    title: 'Custom Field bloat',
    category: 'Data & Governance',
    severity: 'high',
    metric: '61',
    metricLabel: 'fields unused in 90 days',
    explanation:
      '148 Custom Fields exist, 61 of which have had no values written in 90 days. Overall field completion sits at 43%, weakening reporting.',
    recommendation:
      'Retire unused fields and make key fields required in the Spaces where they drive reporting.',
    affected: '61 fields',
  },
  {
    id: 'f-undated',
    title: 'Tasks missing due dates or owners',
    category: 'Data & Governance',
    severity: 'medium',
    metric: '1,284',
    metricLabel: 'active tasks without a due date',
    explanation:
      '1,284 active tasks have no due date and 731 have no assignee, which undermines accountability and on-time reporting.',
    recommendation:
      'Add an automation that flags new tasks without an owner or due date, and default due-date rules per List.',
    affected: '1,284 tasks',
  },
  {
    id: 'f-automation',
    title: 'Automations not in use',
    category: 'Platform Utilisation',
    severity: 'opportunity',
    metric: '0',
    metricLabel: 'automations configured',
    explanation:
      'No automations are configured despite repetitive status-change and assignment work visible in task history.',
    recommendation:
      'Start with 3 high-value automations: assignment on status change, overdue notifications and recurring task templates.',
  },
  {
    id: 'f-timetracking',
    title: 'Time tracking enabled but unused',
    category: 'Platform Utilisation',
    severity: 'opportunity',
    metric: '6%',
    metricLabel: 'of tasks with any time logged',
    explanation:
      'Time tracking is available and 38 paid seats exist, but only 6% of tasks have time logged — capacity and forecasting data is unavailable.',
    recommendation:
      'Roll out light time tracking on client-billable Lists only, so estimates and workload views become usable.',
  },
  {
    id: 'f-views',
    title: 'Reporting views are under-used',
    category: 'Adoption & Activity',
    severity: 'medium',
    metric: '11',
    metricLabel: 'saved views across 6 Spaces',
    explanation:
      'Only 11 saved List/Table views exist across the workspace, and 4 Spaces have no dashboard at all.',
    recommendation:
      'Create one operational dashboard per Space for delivery, workload and overdue visibility.',
    affected: '4 Spaces without dashboards',
  },
  {
    id: 'f-quiet',
    title: 'Quiet seats adding cost',
    category: 'Adoption & Activity',
    severity: 'opportunity',
    metric: '5',
    metricLabel: 'paid seats inactive for 30d',
    explanation:
      '5 of 38 paid seats have not created, completed or commented on work in 30 days — roughly $95/month at list pricing.',
    recommendation:
      'Confirm whether these seats are needed, or downgrade/deactivate them to recover spend.',
    affected: '5 seats · ~$95/mo',
  },
]

export const utilisation: UtilisationRow[] = [
  { capability: 'Views', status: 'detected', detail: '11 views found across Spaces' },
  { capability: 'Time Tracking', status: 'detected', detail: 'Enabled, 6% of tasks logged' },
  { capability: 'Time Estimates', status: 'detected', detail: 'Present on 34% of tasks' },
  { capability: 'Time in Status', status: 'partial', detail: 'Requires ClickApp enabled' },
  { capability: 'Dependencies', status: 'detected', detail: '184 dependency links found' },
  { capability: 'Relationships', status: 'detected', detail: 'Linked tasks present' },
  { capability: 'Custom Task Types', status: 'detected', detail: '4 custom types in use' },
  { capability: 'Goals', status: 'partial', detail: '2 goals tracked' },
  { capability: 'Docs', status: 'detected', detail: 'Available via Docs API' },
  { capability: 'Templates', status: 'partial', detail: 'Task/List templates only' },
  { capability: 'Forms', status: 'not_measurable', detail: 'Not exposed by public API' },
  { capability: 'Automations', status: 'not_measurable', detail: 'Not exposed by public API' },
  { capability: 'Dashboards', status: 'not_measurable', detail: 'Not exposed by public API' },
  { capability: 'Whiteboards', status: 'not_measurable', detail: 'Not exposed by public API' },
  { capability: 'Workload', status: 'not_measurable', detail: 'Not exposed by public API' },
  { capability: 'ClickApps', status: 'not_measurable', detail: 'Enabled-state not exposed' },
  { capability: 'AI', status: 'not_measurable', detail: 'Usage not exposed' },
  { capability: 'Integrations', status: 'not_measurable', detail: 'Only webhooks visible' },
]

export const performingWell = [
  {
    title: 'Reporting readiness is strong',
    detail: '91% due-date coverage and 88% ownership make management reporting reliable.',
  },
  {
    title: 'Most of the team is genuinely active',
    detail: '37 of 42 members created, completed or commented on work in the last 30 days.',
  },
  {
    title: 'Completion keeps ahead of creation',
    detail: '9,120 tasks completed vs 10,804 created in 90 days — a manageable, not runaway, backlog.',
  },
  {
    title: 'Structure is mostly healthy',
    detail: 'Only 6 Spaces and a 66-task average per List — no severe hierarchy bloat.',
  },
]

export const aiSummary = [
  'Northwind Creative scores 74/100. The workspace is structurally sound and the team actively uses it, but operational discipline and data hygiene are the weak points.',
  'The single biggest risk is overdue work: nearly a third of active tasks are past due, concentrated in three Spaces. This typically signals unclear ownership or unrealistic scheduling rather than lack of activity.',
  'Quick wins sit in governance and utilisation. Retiring 61 unused Custom Fields and switching on three automations would lift both the Data & Governance and Platform Utilisation scores without new process overhead.',
  'If overdue work is brought back under 15% and time tracking is adopted on client work, the projected score rises to approximately 84/100.',
]

export const rules = [
  { name: 'Overdue rate', condition: 'overdue / active > threshold', threshold: '15%', severity: 'Critical', weight: '12%' },
  { name: 'List fragmentation', condition: 'lists with < 5 tasks', threshold: '20%', severity: 'High', weight: '8%' },
  { name: 'Unused statuses', condition: 'statuses used on < 1% tasks', threshold: '> 3', severity: 'High', weight: '6%' },
  { name: 'Stale backlog', condition: 'open tasks untouched 90d+', threshold: '> 5%', severity: 'High', weight: '8%' },
  { name: 'Field completion', condition: 'custom field fill rate', threshold: '< 60%', severity: 'Medium', weight: '5%' },
  { name: 'Quiet seats', condition: 'paid seats inactive 30d', threshold: '> 3', severity: 'Opportunity', weight: '2%' },
]

export const scanStages = [
  { label: 'Connecting to ClickUp', detail: 'Secure OAuth · read-only' },
  { label: 'Mapping workspace structure', detail: '6 Spaces · 31 Folders · 214 Lists' },
  { label: 'Analysing 14,217 tasks', detail: 'Pagination · retries · rate limits' },
  { label: 'Reviewing workflow configuration', detail: 'Statuses · Custom Fields · views' },
  { label: 'Calculating Health Score', detail: '7 categories · 39 findings' },
  { label: 'Generating recommendations', detail: 'AI explanations grounded in metrics' },
  { label: 'Report ready', detail: '74 / 100' },
]
