import { CATEGORIES, type Signal } from '../scoring/model'
import { severityFor } from '../scoring/engine'
import { SIGNAL_COPY, SIGNAL_GOOD } from '../scoring/copy'
import type { DrillDataset, DrillRow, ScanResult, Severity, SignalExplanation, SignalStatus } from '../types'

const SPACES = ['Studio Ops', 'Client Delivery', 'Sales & Pipeline', 'Marketing', 'Finance', 'People & Culture']
const MEMBERS = ['Emily B.', 'Marcus H.', 'Priya S.', 'Tom R.', 'Ava L.', 'Diego M.', 'Sofia K.', 'Liam O.', 'Nadia F.', 'Jonas W.', 'Ivy C.', 'Ben T.']
const CLIENTS = ['Northwind', 'Halcyon', 'Riverbank', 'Meridian', 'Cobalt', 'Lumen', 'Vantage', 'Orchard']
const FIELD_NAMES = ['Client', 'Project Code', 'Budget', 'Campaign', 'Asset Type', 'Region', 'Priority Score', 'Effort', 'Sprint', 'Approval', 'Channel', 'Deadline Type']

function seeded(n: number) {
  const x = Math.sin(n * 12.9898) * 43758.5453
  return x - Math.floor(x)
}
function pick<T>(arr: T[], n: number) {
  return arr[Math.floor(seeded(n) * arr.length)]
}

/* ------------------------------- scan result ------------------------------ */

const BASE_MOCK_SCAN: ScanResult = {
  id: 'mock',
  workspaceName: 'Northwind Creative',
  plan: 'Business Plus',
  members: 42,
  spaces: 6,
  folders: 31,
  lists: 214,
  activeTasks: 14217,
  scannedAt: 'just now',
  overallScore: 74,
  overallGrade: 'C+',
  summaryHeadline: 'Good foundation, weak operational discipline.',
  summaryBody:
    'Structure and reporting are strong, but overdue work and data hygiene are dragging the score down. Fixing overdue tasks and retiring unused fields would lift the workspace meaningfully without new process overhead.',
  projectedScore: 84,
  coverage: { scored: 7, total: 7 },
  coverageLimited: false,
  categories: [
    { key: 'architecture', name: 'Architecture & Structure', score: 81, scored: true, blurb: 'Hierarchy is broadly healthy, with a few fragmented Lists worth consolidating.', metrics: [
      { label: 'Spaces', value: '6' }, { label: 'Avg tasks / List', value: '66.4', tone: 'up' }, { label: 'Dormant Lists', value: '23', tone: 'down', drill: 'dormant-lists-90' } ] },
    { key: 'workflow', name: 'Workflow Design', score: 77, scored: true, blurb: 'Status workflows are consistent, though some duplication and unused statuses remain.', metrics: [
      { label: 'Statuses / Space', value: '6.4' }, { label: 'Unused statuses', value: '9', tone: 'down', drill: 'unused-statuses' }, { label: 'Avg time in status', value: '4.2d' } ] },
    { key: 'governance', name: 'Data & Governance', score: 62, scored: true, blurb: 'Custom Field sprawl and low completion rates are pulling the score down.', metrics: [
      { label: 'Custom Fields', value: '148', tone: 'down', drill: 'custom-fields' }, { label: 'Field completion', value: '43%', tone: 'down', drill: 'custom-fields' }, { label: '0% filled fields', value: '61', tone: 'down', drill: 'custom-fields' } ] },
    { key: 'operational', name: 'Operational Health', score: 68, scored: true, blurb: 'A high overdue rate and a growing stale backlog are the biggest risks.', metrics: [
      { label: 'Overdue rate', value: '24.1%', tone: 'down', drill: 'overdue' }, { label: 'Stale 90d+', value: '612', tone: 'down', drill: 'stale-90' }, { label: 'Completion rate', value: '84%', tone: 'up' } ] },
    { key: 'adoption', name: 'Adoption & Activity', score: 79, scored: true, blurb: 'Most members are active, with a handful of quiet members and Spaces.', metrics: [
      { label: 'Active members', value: '34 / 42', tone: 'up' }, { label: 'Inactive members', value: '8', tone: 'down', drill: 'inactive-members' }, { label: 'Guests', value: '38%' } ] },
    { key: 'utilisation', name: 'Platform Utilisation', score: 57, scored: true, blurb: 'Several high-value ClickUp capabilities are enabled but barely used.', metrics: [
      { label: 'Scored signals', value: '3', tone: 'down' }, { label: 'Time tracking', value: '3%', tone: 'down' }, { label: 'Views / Space', value: '1.8', tone: 'down' } ] },
    { key: 'reporting', name: 'Reporting Readiness', score: 83, scored: true, blurb: 'Strong due-date and ownership coverage — reporting data is in good shape.', metrics: [
      { label: 'Due-date coverage', value: '91%', tone: 'up' }, { label: 'Ownership', value: '88%', tone: 'up' }, { label: 'Estimate coverage', value: '34%', tone: 'down' } ] },
  ],
  findingsSummary: { critical: 4, high: 11, opportunity: 24, total: 39 },
  findings: [
    { id: 'f-overdue', title: 'High overdue task rate', category: 'Operational Health', severity: 'critical', metric: '31.4%', metricLabel: 'of active tasks overdue', explanation: '31.4% of active tasks (4,466 of 14,217) are past their due date — above the 30% Critical threshold. Overdue work concentrates in 3 of 6 Spaces.', recommendation: 'Review ageing work and decide what to close, reschedule, reassign or remove from active workflows. Set a weekly overdue sweep per Space.', affected: '3 Spaces · 4,466 tasks', drill: 'overdue' },
    { id: 'f-frag', title: 'Potential List fragmentation', category: 'Architecture & Structure', severity: 'high', metric: '38%', metricLabel: 'of active Lists under 5 tasks', explanation: '81 of 214 active Lists contain fewer than 5 active tasks, suggesting structure has drifted into thin, hard-to-manage Lists.', recommendation: 'Consolidate thin Lists by client, workstream or sprint. Consider Folders instead of Lists for long-running groupings.', affected: '81 Lists', drill: 'fragmented-lists' },
    { id: 'f-subtasks', title: 'Open subtasks under closed parents', category: 'Operational Health', severity: 'medium', metric: '312', metricLabel: 'open subtasks under Done parents', explanation: '312 open subtasks sit under parents already marked Done/Closed, which hides live work and skews completion reporting.', recommendation: 'Reopen the parent tasks, or promote the remaining subtasks so active work is visible.', affected: '312 subtasks' },
    { id: 'f-stale', title: 'Large stale backlog', category: 'Operational Health', severity: 'high', metric: '612', metricLabel: 'tasks untouched 90+ days', explanation: '612 open tasks have not been updated in over 90 days, and 2,140 in over 30 days, inflating WIP and skewing reporting.', recommendation: 'Introduce a 60-day stale rule that auto-flags old tasks for triage. Close or archive what is no longer relevant.', affected: '612 tasks', drill: 'stale-90' },
    { id: 'f-customfields', title: 'Custom Fields never filled', category: 'Data & Governance', severity: 'high', metric: '61', metricLabel: 'fields at 0% filled', explanation: '148 Custom Fields exist and 61 sit at 0% filled on the tasks where they apply. Average field completion is 43%, weakening reporting.', recommendation: 'Retire unused fields and make key fields required in the Spaces where they drive reporting.', affected: '61 fields', drill: 'custom-fields' },
    { id: 'f-undated', title: 'Tasks missing due dates or owners', category: 'Data & Governance', severity: 'medium', metric: '1,284', metricLabel: 'active tasks without a due date', explanation: '1,284 active tasks have no due date and 731 have no assignee, which undermines accountability and on-time reporting.', recommendation: 'Add an automation that flags new tasks without an owner or due date, and default due-date rules per List.', affected: '1,284 tasks', drill: 'missing-due' },
    { id: 'f-timetracking', title: 'Time tracking enabled but unused', category: 'Platform Utilisation', severity: 'opportunity', metric: '3%', metricLabel: 'of tasks with any time logged', explanation: 'Time tracking is available across the workspace, but only 3% of tasks have time logged — capacity and forecasting data is unavailable.', recommendation: 'Roll out light time tracking on client-billable Lists only, so estimates and workload views become usable.' },
    { id: 'f-views', title: 'Views under-used', category: 'Platform Utilisation', severity: 'medium', metric: '1.8', metricLabel: 'Views per Space', explanation: 'Only ~1.8 saved views per Space exist, and 4 Spaces have no dashboard at all.', recommendation: 'Create one operational dashboard per Space for delivery, workload and overdue visibility.', affected: '4 Spaces without dashboards' },
    { id: 'f-quiet', title: 'Inactive members', category: 'Adoption & Activity', severity: 'medium', metric: '8', metricLabel: 'members inactive for 30d', explanation: '8 of 42 members (about 19%) have not created, completed or commented on work in 30 days. Roles are exposed by the API, not billing, so this is activity-based.', recommendation: 'Confirm whether these members still need access, or reduce their seat type.', affected: '8 members', drill: 'inactive-members' },
  ],
  performingWell: [
    { title: 'Reporting readiness is strong', detail: '91% due-date coverage and 88% ownership make management reporting reliable.' },
    { title: 'Most of the team is genuinely active', detail: '34 of 42 members created, completed or commented on work in the last 30 days.' },
    { title: 'Completion keeps ahead of creation', detail: '9,120 tasks completed vs 10,804 created in 90 days — a manageable, not runaway, backlog.' },
    { title: 'Structure is mostly healthy', detail: 'Only 6 Spaces and a 66-task average per List — no severe hierarchy bloat.' },
  ],
  utilisation: [
    { capability: 'Views', status: 'detected', detail: '~1.8 views per Space' },
    { capability: 'Time Tracking', status: 'detected', detail: 'Enabled, 3% of tasks logged' },
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
  ],
  aiSummary: [
    'Northwind Creative scores 74/100. The workspace is structurally sound and the team actively uses it, but operational discipline and data hygiene are the weak points.',
    'The single biggest risk is overdue work: nearly a third of active tasks are past due, concentrated in three Spaces. This typically signals unclear ownership or unrealistic scheduling rather than lack of activity.',
    'Quick wins sit in governance and utilisation. Retiring the 61 never-filled Custom Fields and adopting time tracking on client work would lift both the Data & Governance and Platform Utilisation scores without new process overhead.',
    'If overdue work is brought back under 15% and time tracking is adopted on client work, the projected score rises to approximately 84/100.',
  ],
  rules: [
    { name: 'Overdue rate', condition: 'overdue / active', threshold: '> 15% High / > 30% Critical', severity: 'High', weight: '30%' },
    { name: 'Fragmented Lists', condition: 'Lists with < 5 open tasks', threshold: '> 25% of Lists', severity: 'Medium', weight: '35%' },
    { name: 'Unused statuses', condition: 'statuses used on few tasks', threshold: '> 3 per workflow', severity: 'Medium', weight: '25%' },
    { name: 'Stale backlog', condition: 'open tasks untouched 90d+', threshold: '> 20% of open', severity: 'High', weight: '25%' },
    { name: 'Field completion', condition: 'custom field fill rate', threshold: '< 50% where in scope', severity: 'High', weight: '35%' },
    { name: 'Inactive members', condition: 'members with no activity', threshold: '> 15% of members', severity: 'Medium', weight: '25%' },
    { name: 'Guest vs member ratio', condition: 'guests / total users', threshold: '> 30% guests', severity: 'Medium', weight: '15%' },
    { name: 'Open subtasks under closed parents', condition: 'open subtasks under Done', threshold: '> 2% of subtasks', severity: 'Medium', weight: '15%' },
  ],
}

const MOCK_PCT_KEYS = new Set([
  'dormantList60to90Pct', 'dormantList90PlusPct', 'fragmentedListsPct', 'emptyFoldersPct', 'cfCompletionPct', 'cfZeroFilledPct',
  'missingRequiredCfPct', 'overdueRate', 'stale30to60Pct', 'stale60to90Pct', 'stale90PlusPct', 'openSubtasksUnderClosedPct',
  'inactiveMemberPct', 'guestRatio', 'activityConcentration', 'dormantSpacesPct', 'creationVsCompletionPct',
  'dueDateCoverage', 'ownershipCoverage', 'estimateCoverage', 'timeTrackedPct',
])

function mockValue(metricKey: string, value: number): string {
  if (MOCK_PCT_KEYS.has(metricKey)) return `${Math.round(value * 100)}%`
  return String(Math.round(value * 10) / 10).replace(/\.0$/, '')
}

function mockTarget(sig: Signal): string {
  const band = sig.bands[sig.bands.length - 1]
  if (!band) return sig.threshold
  const targetCmp = band.cmp === '>' ? '<=' : band.cmp === '>=' ? '<' : band.cmp === '<' ? '>=' : '>'
  const value = MOCK_PCT_KEYS.has(sig.metricKey)
    ? `${Math.round(band.value * 100)}%`
    : String(Math.round(band.value * 100) / 100).replace(/\.0$/, '')
  return `${targetCmp} ${value}`
}

const MOCK_SIGNAL_ROWS: Record<string, { value: number; categoryPoints: number; overallPoints?: number; severity?: Severity }> = {
  avgTasksPerList: { value: 66.4, categoryPoints: 0 },
  dormantList60to90Pct: { value: 0.04, categoryPoints: 0 },
  dormantList90PlusPct: { value: 0.11, categoryPoints: 0.7, overallPoints: 0.1 },
  fragmentedListsPct: { value: 0.38, categoryPoints: 2.2, overallPoints: 0.3, severity: 'high' },
  emptyFoldersPct: { value: 0.08, categoryPoints: 0 },
  statusesPerWorkflow: { value: 8, categoryPoints: 0 },
  unusedStatuses: { value: 9, categoryPoints: 1.8, overallPoints: 0.3 },
  duplicateStatusNames: { value: 2, categoryPoints: 1.2, overallPoints: 0.2 },
  avgTimeInStatusDays: { value: 4.2, categoryPoints: 0 },
  customFieldCount: { value: 148, categoryPoints: 1.6, overallPoints: 0.2 },
  cfCompletionPct: { value: 0.43, categoryPoints: 2.4, overallPoints: 0.4 },
  cfZeroFilledPct: { value: 0.412, categoryPoints: 1.4, overallPoints: 0.2, severity: 'high' },
  missingRequiredCfPct: { value: 0.07, categoryPoints: 0 },
  overdueRate: { value: 0.314, categoryPoints: 4.2, overallPoints: 0.8 },
  stale30to60Pct: { value: 0.1, categoryPoints: 0.4, overallPoints: 0.1 },
  stale60to90Pct: { value: 0.08, categoryPoints: 0.5, overallPoints: 0.1 },
  stale90PlusPct: { value: 0.12, categoryPoints: 1.6, overallPoints: 0.3 },
  openSubtasksUnderClosedPct: { value: 0.04, categoryPoints: 0.8, overallPoints: 0.2 },
  creationVsCompletionPct: { value: 0.15, categoryPoints: 1, overallPoints: 0.2 },
  wipPerPerson: { value: 19, categoryPoints: 0.6, overallPoints: 0.1 },
  inactiveMemberPct: { value: 0.19, categoryPoints: 1.4, overallPoints: 0.2 },
  guestRatio: { value: 0.38, categoryPoints: 1.1, overallPoints: 0.2 },
  activityConcentration: { value: 0.72, categoryPoints: 0 },
  commentsPerUserPerWeek: { value: 0.8, categoryPoints: 0.6, overallPoints: 0.1 },
  dormantSpacesPct: { value: 0.17, categoryPoints: 0.7, overallPoints: 0.1 },
  timeTrackedPct: { value: 0.03, categoryPoints: 0 },
  viewsPerSpace: { value: 1.8, categoryPoints: 2, overallPoints: 0.2, severity: 'medium' },
  dependenciesUsed: { value: 184, categoryPoints: 0 },
  goalsTracked: { value: 2, categoryPoints: 0 },
  docsUsed: { value: 1, categoryPoints: 0 },
  customTaskTypes: { value: 4, categoryPoints: 0 },
  dueDateCoverage: { value: 0.91, categoryPoints: 0 },
  ownershipCoverage: { value: 0.88, categoryPoints: 0 },
  estimateCoverage: { value: 0.34, categoryPoints: 1.2, overallPoints: 0.1 },
  distinctWorkflows: { value: 6, categoryPoints: 0.5, overallPoints: 0.1 },
}

const MOCK_SIGNAL_DRILL: Record<string, string> = {
  overdue_rate: 'overdue',
  stale_30_60: 'stale-30',
  stale_60_90: 'stale-60',
  stale_90plus: 'stale-90',
  dormant_list_60: 'dormant-lists-60',
  dormant_list_90: 'dormant-lists-90',
  fragmented_lists: 'fragmented-lists',
  unused_statuses: 'unused-statuses',
  custom_field_count: 'custom-fields',
  cf_completion: 'custom-fields',
  cf_never_filled: 'custom-fields',
  missing_required_cf: 'custom-fields',
  inactive_members: 'inactive-members',
  duplicate_statuses: 'duplicate-statuses',
  views: 'views',
  dormant_spaces: 'dormant-spaces',
  due_date_coverage: 'missing-due',
  ownership_coverage: 'missing-owner',
}

const MOCK_CATEGORY_BLURB: Record<string, string> = {
  architecture: 'Architecture & Structure is 81/100. Fragmented and dormant Lists are the main reasons it is not higher.',
  workflow: 'Workflow Design is 77/100. Unused and duplicate statuses are the main reasons it is not higher.',
  governance: 'Data & Governance is 62/100. Low field completion and Custom Field sprawl are the main reasons it is not higher.',
  operational: 'Operational Health is 68/100. Overdue work and stale tasks are the main reasons it is not higher.',
  adoption: 'Adoption & Activity is 79/100. Inactive members and guest access are the main reasons it is not higher.',
  utilisation: 'Platform Utilisation is 57/100. Few saved Views is the main reason it is not higher.',
  reporting: 'Reporting Readiness is 83/100. Estimate coverage and workflow consistency are the main reasons it is not higher.',
}

const MOCK_CATEGORY_IMPACT: Record<string, number> = {
  architecture: 2.9,
  workflow: 3.5,
  governance: 5.7,
  operational: 6.4,
  adoption: 3.2,
  utilisation: 4.3,
  reporting: 1.7,
}

function buildMockExplainers(): Record<string, SignalExplanation[]> {
  const out: Record<string, SignalExplanation[]> = {}
  for (const cat of CATEGORIES) {
    out[cat.key] = cat.signals.map((sig) => {
      const row = MOCK_SIGNAL_ROWS[sig.metricKey]
      const value = row?.value ?? 0
      const severity = sig.insightOnly ? null : (row?.severity ?? severityFor(sig, value))
      const status: SignalStatus = sig.insightOnly
        ? 'insight'
        : severity
          ? sig.direction === 'lower_worse' ? 'below' : 'above'
          : 'within'
      const copy = SIGNAL_COPY[sig.key]
      let why = copy?.explanation ?? `${sig.name} is outside the configured target.`
      if (status === 'within') why = 'This signal is within target, so it is not lowering the score.'
      if (status === 'insight' && !severity) why = 'This is an insight-only signal. It does not affect the score.'
      return {
        key: sig.key,
        name: sig.name,
        value: mockValue(sig.metricKey, value),
        target: mockTarget(sig),
        status,
        severity: severity ?? undefined,
        weight: sig.insightOnly ? 'No score impact' : `${sig.weight}%`,
        categoryPoints: row?.categoryPoints ?? 0,
        overallPoints: row?.overallPoints ?? 0,
        why,
        good: SIGNAL_GOOD[sig.key] ?? `Target: ${sig.threshold}`,
        drill: MOCK_SIGNAL_DRILL[sig.key],
      }
    })
  }
  return out
}

const MOCK_EXPLAINERS = buildMockExplainers()

const MOCK_FINDING_META: Record<string, { target: string; good: string; impact: string }> = {
  'f-overdue': { target: '< 15%', good: SIGNAL_GOOD.overdue_rate, impact: 'Costs 4.2 overall points' },
  'f-frag': { target: '< 25%', good: SIGNAL_GOOD.fragmented_lists, impact: 'Costs 2.2 category points' },
  'f-subtasks': { target: '< 2%', good: SIGNAL_GOOD.subtasks_under_closed, impact: 'Costs 0.8 category points' },
  'f-stale': { target: '< 5%', good: SIGNAL_GOOD.stale_90plus, impact: 'Costs 1.6 category points' },
  'f-customfields': { target: '0 fields at 0%', good: SIGNAL_GOOD.cf_never_filled, impact: 'Costs 1.4 category points' },
  'f-undated': { target: '> 80% coverage', good: 'Keep due-date and ownership coverage above 80%.', impact: 'Costs 1.2 category points' },
  'f-timetracking': { target: '>= 5%', good: SIGNAL_GOOD.time_tracking, impact: 'No score penalty' },
  'f-views': { target: '>= 2 per Space', good: SIGNAL_GOOD.views, impact: 'Costs 2.0 category points' },
  'f-quiet': { target: '< 15%', good: SIGNAL_GOOD.inactive_members, impact: 'Costs 1.4 category points' },
}

export const MOCK_SCAN: ScanResult = {
  ...BASE_MOCK_SCAN,
  categories: BASE_MOCK_SCAN.categories.map((c) => ({
    ...c,
    blurb: MOCK_CATEGORY_BLURB[c.key] ?? c.blurb,
    overallImpact: MOCK_CATEGORY_IMPACT[c.key] ?? 0,
    explainers: MOCK_EXPLAINERS[c.key] ?? [],
  })),
  findings: BASE_MOCK_SCAN.findings.map((f) => ({ ...f, ...(MOCK_FINDING_META[f.id] ?? {}) })),
}

export const MOCK_SCAN_STAGES = [
  { label: 'Connecting to ClickUp', detail: 'Secure OAuth · read-only' },
  { label: 'Mapping workspace structure', detail: '6 Spaces · 31 Folders · 214 Lists' },
  { label: 'Analysing 14,217 tasks', detail: 'Pagination · retries · rate limits' },
  { label: 'Reviewing workflow configuration', detail: 'Statuses · Custom Fields · views' },
  { label: 'Calculating Health Score', detail: '7 categories · 39 findings' },
  { label: 'Generating recommendations', detail: 'AI explanations grounded in metrics' },
  { label: 'Report ready', detail: '74 / 100' },
]

/* ------------------------------ drill datasets ---------------------------- */

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
      status: completion < 8 ? '0% filled' : completion < 25 ? 'Rarely filled' : 'In use',
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
      status: pick(['In Progress', 'To Do', 'In Review', 'Blocked'], i * 9 + 2),
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
      ageDays: days,
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
  return ['Emily B.', 'Tom R.', 'Nadia F.', 'Jonas W.', 'Ivy C.', 'Liam O.', 'Ben T.', 'Ava L.'].map((m, i) => ({
    member: m,
    role: pick(['Member', 'Admin', 'Limited Member'], i * 4 + 1),
    lastActivity: `${Math.round(seeded(i * 7 + 2) * 60) + 30}d ago`,
  }))
}
function unusedStatuses(): DrillRow[] {
  return ['Backlog', 'On Hold', 'Cancelled', 'Awaiting Client', 'Duplicate', 'Deferred', 'QA Failed', 'Post-Launch', 'Archived'].map((s, i) => ({
    status: s,
    space: pick(SPACES, i * 5 + 1),
    tasksUsing: Math.round(seeded(i * 9 + 2) * 4),
    equivalent: pick(['To Do', 'In Progress', 'Done', '— none —'], i * 3 + 1),
  }))
}

export const MOCK_DRILL: Record<string, DrillDataset> = {
  'dormant-lists': { key: 'dormant-lists', title: 'Dormant Lists', subtitle: 'Active Lists with fewer than 5 tasks and no recent activity', unit: '23 Lists', columns: [ { key: 'list', label: 'List' }, { key: 'space', label: 'Space' }, { key: 'tasks', label: 'Tasks', align: 'right' }, { key: 'lastActivity', label: 'Last activity', align: 'right' } ], rows: dormantLists() },
  'custom-fields': { key: 'custom-fields', title: 'Custom Field audit', subtitle: 'Fields by completion rate — lowest first', unit: '148 fields', columns: [ { key: 'field', label: 'Custom Field' }, { key: 'scope', label: 'Scope' }, { key: 'type', label: 'Type' }, { key: 'completion', label: 'Completion', align: 'right' }, { key: 'status', label: 'Status', align: 'right' } ], rows: customFields() },
  overdue: { key: 'overdue', title: 'Overdue tasks', subtitle: 'Active tasks past their due date (worst first)', unit: '4,466 tasks', columns: [ { key: 'task', label: 'Task' }, { key: 'assignee', label: 'Assignee' }, { key: 'space', label: 'Space' }, { key: 'due', label: 'Overdue', align: 'right' }, { key: 'status', label: 'Status', align: 'right' }, { key: 'priority', label: 'Priority', align: 'right' } ], rows: overdueTasks() },
  stale: { key: 'stale', title: 'Stale tasks', subtitle: 'Open tasks untouched for 90+ days', unit: '612 tasks', columns: [ { key: 'task', label: 'Task' }, { key: 'owner', label: 'Owner' }, { key: 'space', label: 'Space' }, { key: 'lastUpdate', label: 'Last update', align: 'right' }, { key: 'status', label: 'Status', align: 'right' } ], rows: staleTasks() },
  'missing-due': { key: 'missing-due', title: 'Tasks without an owner or due date', subtitle: 'Active tasks missing critical scheduling data', unit: '1,284 tasks', columns: [ { key: 'task', label: 'Task' }, { key: 'assignee', label: 'Assignee' }, { key: 'space', label: 'Space' }, { key: 'created', label: 'Created', align: 'right' } ], rows: missingDue() },
  'quiet-seats': { key: 'quiet-seats', title: 'Inactive members', subtitle: 'Members with no activity in the last 30 days', unit: '8 members', columns: [ { key: 'member', label: 'Member' }, { key: 'role', label: 'Role' }, { key: 'lastActivity', label: 'Last activity', align: 'right' } ], rows: quietSeats() },
  'unused-statuses': { key: 'unused-statuses', title: 'Unused & duplicate statuses', subtitle: 'Statuses applied to fewer than 1% of tasks', unit: '9 statuses', columns: [ { key: 'status', label: 'Status' }, { key: 'space', label: 'Space' }, { key: 'tasksUsing', label: 'Tasks using', align: 'right' }, { key: 'equivalent', label: 'Equivalent status', align: 'right' } ], rows: unusedStatuses() },
}

export function mockSpaceDataset(name: string): DrillDataset {
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
    columns: [ { key: 'list', label: 'List' }, { key: 'tasks', label: 'Tasks', align: 'right' }, { key: 'overdue', label: 'Overdue', align: 'right' }, { key: 'lastActivity', label: 'Last activity', align: 'right' }, { key: 'health', label: 'Health', align: 'right' } ],
    rows,
  }
}

export function getMockDrill(key: string): DrillDataset {
  if (key.startsWith('space:')) return mockSpaceDataset(key.slice(6))
  if (key.startsWith('stale-')) {
    const tier = Number(key.slice('stale-'.length)) || 30
    const base = MOCK_DRILL.stale
    return {
      ...base,
      key,
      title: `Stale tasks (${tier}d+)`,
      subtitle: `Sample of open tasks untouched for ${tier}+ days`,
      rows: base.rows.filter((row) => Number(row.ageDays) >= tier),
    }
  }
  if (key.startsWith('dormant-lists-')) {
    const tier = key.endsWith('-90') ? 90 : 60
    const base = MOCK_DRILL['dormant-lists']
    return { ...base, key, title: `Dormant Lists (${tier}d+)` }
  }
  if (key === 'fragmented-lists') {
    const base = MOCK_DRILL['dormant-lists']
    return {
      ...base,
      key,
      title: 'Fragmented Lists',
      subtitle: 'Lists with fewer than 5 open tasks',
      columns: [
        { key: 'list', label: 'List' },
        { key: 'space', label: 'Space' },
        { key: 'openTasks', label: 'Open tasks', align: 'right' },
        { key: 'tasks', label: 'All tasks', align: 'right' },
        { key: 'lastActivity', label: 'Last activity', align: 'right' },
      ],
      rows: base.rows.map((row) => ({
        ...row,
        openTasks: Math.min(4, Number(row.tasks)),
      })),
    }
  }
  if (key === 'inactive-members') {
    return { ...MOCK_DRILL['quiet-seats'], key, title: 'Inactive members' }
  }
  if (key === 'missing-owner') {
    const base = MOCK_DRILL['missing-due']
    return {
      ...base,
      key,
      title: 'Tasks without an owner',
      subtitle: 'Active tasks missing an assignee',
      columns: [
        { key: 'task', label: 'Task' },
        { key: 'space', label: 'Space' },
        { key: 'status', label: 'Status', align: 'right' },
        { key: 'created', label: 'Created', align: 'right' },
      ],
      rows: base.rows.map((row) => ({ task: row.task, space: row.space, status: 'To Do', created: row.created })),
    }
  }
  return MOCK_DRILL[key] ?? MOCK_DRILL['overdue']
}

/* ------------------------------- structure -------------------------------- */

export interface MockStructureSpace {
  name: string
  health: number
  lists: { name: string; health: number; tasks: number }[]
}

/** Sample workspace topology (matches MOCK_SCAN's "Northwind Creative"). */
export const MOCK_STRUCTURE: MockStructureSpace[] = [
  { name: 'Studio Ops', health: 0.86, lists: [
    { name: 'Delivery Board', health: 0.9, tasks: 120 },
    { name: 'Ops Backlog', health: 0.62, tasks: 48 },
    { name: 'QA Queue', health: 0.78, tasks: 33 },
  ] },
  { name: 'Client Delivery', health: 0.72, lists: [
    { name: 'Northwind – Delivery', health: 0.82, tasks: 210 },
    { name: 'Halcyon – Delivery', health: 0.55, tasks: 64 },
    { name: 'Riverbank – Delivery', health: 0.9, tasks: 96 },
  ] },
  { name: 'Sales & Pipeline', health: 0.6, lists: [
    { name: 'Inbound', health: 0.7, tasks: 140 },
    { name: 'Outbound', health: 0.45, tasks: 38 },
    { name: 'Proposals', health: 0.66, tasks: 52 },
  ] },
  { name: 'Marketing', health: 0.5, lists: [
    { name: 'Campaigns', health: 0.58, tasks: 88 },
    { name: 'Content Calendar', health: 0.4, tasks: 26 },
    { name: 'Brand', health: 0.52, tasks: 14 },
  ] },
  { name: 'Finance', health: 0.8, lists: [
    { name: 'Invoices', health: 0.85, tasks: 60 },
    { name: 'Budget', health: 0.74, tasks: 22 },
  ] },
  { name: 'People & Culture', health: 0.44, lists: [
    { name: 'Onboarding', health: 0.5, tasks: 18 },
    { name: 'Recruiting', health: 0.35, tasks: 9 },
    { name: 'Reviews', health: 0.6, tasks: 12 },
  ] },
]
