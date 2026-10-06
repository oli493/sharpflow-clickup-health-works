import { CATEGORIES } from '../scoring/model'
import { CATEGORY_BLURB, SEVERITY_LABEL, SIGNAL_COPY } from '../scoring/copy'
import type { Metrics, ScoreResult } from '../scoring/engine'
import type { CategoryMetric, CategoryResult, FindingResult, ScanResult, Severity, UtilStatus } from '../types'

export interface MapUtilisation {
  capability: string
  status: UtilStatus
  detail: string
}

export interface MapInput {
  id: string
  workspace: { name: string; plan?: string; members: number; spaces: number; folders: number; lists: number; activeTasks: number }
  engine: ScoreResult
  metrics: Metrics
  utilisation: MapUtilisation[]
  scannedAt?: string
  coverageLimited?: boolean
}

const PCT_KEYS = new Set([
  'dormantListsPct', 'fragmentedListsPct', 'emptyFoldersPct', 'cfCompletionPct', 'cfZeroFilledPct',
  'missingRequiredCfPct', 'overdueRate', 'staleRate', 'openSubtasksUnderClosedPct', 'inactiveMemberPct',
  'guestRatio', 'activityConcentration', 'dueDateCoverage', 'ownershipCoverage', 'estimateCoverage', 'timeTrackedPct',
])

const METRIC_LABEL: Record<string, string> = {
  overdueRate: 'of active tasks overdue', staleRate: 'of open tasks stale 90d+',
  openSubtasksUnderClosedPct: 'open subtasks under closed parents', dormantListsPct: 'of Lists dormant',
  fragmentedListsPct: 'of Lists under 5 tasks', emptyFoldersPct: 'empty Folders', cfCompletionPct: 'average field completion',
  cfZeroFilledPct: 'fields at 0% filled', missingRequiredCfPct: 'missing required fields', customFieldCount: 'Custom Fields',
  inactiveMemberPct: 'members inactive 30d', guestRatio: 'of users are guests', activityConcentration: 'activity in one Space',
  commentsPerUserPerWeek: 'comments / active user / week', dormantSpaces: 'dormant Spaces', timeTrackedPct: 'tasks with time logged',
  viewsPerSpace: 'Views per Space', dependenciesUsed: 'dependencies / links', dueDateCoverage: 'open tasks with a due date',
  ownershipCoverage: 'open tasks with an assignee', estimateCoverage: 'open tasks with an estimate', distinctWorkflows: 'distinct workflows',
  avgTasksPerList: 'average tasks per List', statusesPerWorkflow: 'statuses per workflow', unusedStatuses: 'unused statuses',
  duplicateStatusNames: 'duplicate status names', avgTimeInStatusDays: 'days in an active status', creationMinusCompletion: 'more created than completed (90d)',
  wipPerPerson: 'open tasks per person',
}

const DRILL: Record<string, string> = {
  overdue_rate: 'overdue', stale_rate: 'stale', fragmented_lists: 'dormant-lists', dormant_lists: 'dormant-lists',
  unused_statuses: 'unused-statuses', custom_field_count: 'custom-fields', cf_completion: 'custom-fields',
  cf_never_filled: 'custom-fields', missing_required_cf: 'custom-fields', inactive_members: 'inactive-members',
  duplicate_statuses: 'duplicate-statuses', views: 'views', dormant_spaces: 'dormant-spaces',
}

function fmtValue(metricKey: string, v: number): { metric: string; label: string } {
  if (PCT_KEYS.has(metricKey)) return { metric: `${Math.round(v * 100)}%`, label: METRIC_LABEL[metricKey] ?? '' }
  const rounded = Math.round(v * 10) / 10
  return { metric: rounded.toLocaleString(), label: METRIC_LABEL[metricKey] ?? '' }
}

function chipValue(metricKey: string, v: number): string {
  return PCT_KEYS.has(metricKey) ? `${Math.round(v * 100)}%` : String(Math.round(v * 10) / 10).replace(/\.0$/, '')
}

function chipsFor(key: string, m: Metrics, ws: MapInput['workspace']): CategoryMetric[] {
  const chips: CategoryMetric[] = []
  const add = (metricKey: string, label: string, drill?: string) => {
    const v = m[metricKey]
    if (typeof v === 'number') chips.push({ label, value: chipValue(metricKey, v), drill })
  }
  switch (key) {
    case 'architecture':
      add('avgTasksPerList', 'Avg tasks / List')
      add('dormantListsPct', 'Dormant Lists', 'dormant-lists')
      add('fragmentedListsPct', 'Fragmented Lists', 'dormant-lists')
      break
    case 'workflow':
      add('statusesPerWorkflow', 'Statuses / workflow')
      add('unusedStatuses', 'Unused statuses', 'unused-statuses')
      add('duplicateStatusNames', 'Duplicate statuses')
      break
    case 'governance':
      add('customFieldCount', 'Custom Fields', 'custom-fields')
      add('cfCompletionPct', 'Field completion', 'custom-fields')
      add('cfZeroFilledPct', '0% filled fields', 'custom-fields')
      break
    case 'operational':
      add('overdueRate', 'Overdue rate', 'overdue')
      add('staleRate', 'Stale 90d+', 'stale')
      add('wipPerPerson', 'Open / person')
      break
    case 'adoption':
      add('inactiveMemberPct', 'Inactive members', 'inactive-members')
      add('guestRatio', 'Guests')
      add('dormantSpaces', 'Dormant Spaces', 'dormant-spaces')
      break
    case 'utilisation':
      add('timeTrackedPct', 'Time tracking')
      add('viewsPerSpace', 'Views / Space', 'views')
      add('dependenciesUsed', 'Dependencies')
      break
    case 'reporting':
      add('dueDateCoverage', 'Due-date coverage')
      add('ownershipCoverage', 'Ownership')
      add('estimateCoverage', 'Estimate coverage')
      break
  }
  if (chips.length === 0) chips.push({ label: 'Spaces', value: String(ws.spaces) })
  return chips.slice(0, 3)
}

function headlineFor(score: number): string {
  if (score >= 85) return 'A strong, well-run workspace.'
  if (score >= 75) return 'A healthy workspace with a few gaps.'
  if (score >= 60) return 'Good foundation, weak operational discipline.'
  if (score >= 45) return 'Several structural issues need attention.'
  return 'Significant operational risk.'
}

function buildSummary(input: MapInput): { headline: string; body: string; projected: number; ai: string[] } {
  const { engine, metrics } = input
  const sorted = [...engine.categories].sort((a, b) => a.score - b.score)
  const weakest = sorted[0]
  const strongest = sorted[sorted.length - 1]
  const topCritical = engine.findings.find((f) => f.severity === 'critical') || engine.findings.find((f) => f.severity === 'high')

  const headline = headlineFor(engine.overall)
  const body = `${input.workspace.name} scores ${engine.overall}/100. ${strongest?.name} is the strongest area, while ${weakest?.name} is pulling the score down. Addressing the highest-severity findings would raise the score without new process overhead.`
  const projected = Math.min(100, engine.overall + Math.min(12, engine.findings.filter((f) => f.severity === 'critical' || f.severity === 'high').length * 2))

  const ai = [
    `${input.workspace.name} scores ${engine.overall}/100 (Grade ${engine.grade}). ${engine.findings.length} findings were identified across ${engine.categories.length} categories.`,
    weakest ? `The weakest area is ${weakest.name} at ${weakest.score}/100. ${CATEGORY_BLURB[weakest.key] ?? ''}` : '',
    topCritical ? `The most pressing issue is "${topCritical.title}". Addressing it should improve the Operational Health of the workspace.` : 'No critical issues were detected.',
    `If the top issues are resolved, the projected score rises to approximately ${projected}/100.`,
  ].filter(Boolean)

  return { headline, body, projected, ai }
}

/** Convert the deterministic engine result (+ context) into the report UI model. */
export function toScanResult(input: MapInput): ScanResult {
  const { engine, metrics, workspace } = input

  const categories: CategoryResult[] = engine.categories.map((c) => ({
    key: c.key,
    name: c.name,
    score: c.score,
    scored: c.scored,
    blurb: CATEGORY_BLURB[c.key] ?? '',
    metrics: chipsFor(c.key, metrics, workspace),
  }))

  const findings: FindingResult[] = engine.findings
    .sort((a, b) => rank(a.severity) - rank(b.severity))
    .map((f) => {
      const metricKey = CATEGORIES.flatMap((c) => c.signals).find((s) => s.key === f.signalKey)?.metricKey ?? ''
      const { metric, label } = fmtValue(metricKey, f.metricValue)
      const copy = SIGNAL_COPY[f.signalKey]
      return {
        id: f.signalKey,
        title: f.title,
        category: f.categoryName,
        severity: f.severity,
        metric,
        metricLabel: label || f.threshold,
        explanation: copy?.explanation ?? `${f.title} is outside the configured threshold (${f.threshold}).`,
        recommendation: copy?.recommendation ?? 'Review this area and bring it back within threshold.',
        drill: DRILL[f.signalKey],
      }
    })

  const counts = {
    critical: findings.filter((f) => f.severity === 'critical').length,
    high: findings.filter((f) => f.severity === 'high').length,
    opportunity: findings.filter((f) => f.severity === 'opportunity').length,
    total: findings.length,
  }

  const performingWell = [...engine.categories]
    .filter((c) => c.scored)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((c) => ({ title: `${c.name} is strong`, detail: `${CATEGORY_BLURB[c.key] ?? ''} Scored ${c.score}/100.` }))

  const rules = CATEGORIES.flatMap((c) =>
    c.signals
      .filter((s) => !s.insightOnly)
      .map((s) => ({
        name: s.name,
        condition: s.metricKey,
        threshold: s.threshold,
        severity: SEVERITY_LABEL[(s.bands[0]?.severity ?? 'low') as Severity],
        weight: `${s.weight}%`,
      })),
  )

  const summary = buildSummary(input)

  return {
    id: input.id,
    workspaceName: workspace.name,
    plan: workspace.plan ?? 'Business Plus',
    members: workspace.members,
    spaces: workspace.spaces,
    folders: workspace.folders,
    lists: workspace.lists,
    activeTasks: workspace.activeTasks,
    scannedAt: input.scannedAt ?? 'just now',
    overallScore: engine.overall,
    overallGrade: engine.grade,
    summaryHeadline: summary.headline,
    summaryBody: summary.body,
    projectedScore: summary.projected,
    categories,
    findingsSummary: counts,
    findings,
    coverage: engine.coverage,
    coverageLimited: input.coverageLimited ?? false,
    performingWell,
    utilisation: input.utilisation,
    aiSummary: summary.ai,
    rules,
  }
}

function rank(s: Severity): number {
  return { critical: 0, high: 1, medium: 2, low: 3, opportunity: 4 }[s]
}
