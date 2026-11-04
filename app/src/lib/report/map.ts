import { CATEGORIES } from '../scoring/model'
import { CATEGORY_BLURB, SEVERITY_LABEL, SIGNAL_COPY, SIGNAL_GOOD } from '../scoring/copy'
import { colonify } from '../text'
import type { Metrics, ScoreResult, SignalScore } from '../scoring/engine'
import type { CategoryMetric, CategoryResult, FindingResult, ScanResult, Severity, SignalExplanation, SignalStatus, UtilStatus } from '../types'

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
  dataQuality?: {
    partial: boolean
    listsScanned: number
    listsTotal: number
    listsSampled: boolean
    tasksScanned: number
    tasksExpected: number
    truncated: boolean
    failedLists: number
    signalsMeasured?: number
    signalsTotal?: number
    requests?: number
    retries?: number
    rateLimited?: number
    cacheHits?: number
    avgLatencyMs?: number
    rateLimitPerMinute?: number
    peakHeapBytes?: number
  }
}

const PCT_KEYS = new Set([
  'dormantList60to90Pct', 'dormantList90PlusPct', 'fragmentedListsPct', 'emptyFoldersPct', 'cfCompletionPct', 'cfZeroFilledPct',
  'missingRequiredCfPct', 'overdueRate', 'stale30to60Pct', 'stale60to90Pct', 'stale90PlusPct', 'openSubtasksUnderClosedPct',
  'inactiveMemberPct', 'guestRatio', 'activityConcentration', 'dormantSpacesPct', 'creationVsCompletionPct',
  'dueDateCoverage', 'ownershipCoverage', 'estimateCoverage', 'timeTrackedPct',
])

const METRIC_LABEL: Record<string, string> = {
  overdueRate: 'of active tasks overdue', stale30to60Pct: 'of open tasks stale 30-60d', stale60to90Pct: 'of open tasks stale 60-90d',
  stale90PlusPct: 'of open tasks stale 90d+', openSubtasksUnderClosedPct: 'open subtasks under closed parents',
  dormantList60to90Pct: 'of Lists dormant 60-90d', dormantList90PlusPct: 'of Lists dormant 90d+',
  fragmentedListsPct: 'of Lists under 5 tasks', emptyFoldersPct: 'empty Folders', cfCompletionPct: 'average field completion',
  cfZeroFilledPct: 'fields at 0% filled', missingRequiredCfPct: 'missing required fields', customFieldCount: 'Custom Fields',
  inactiveMemberPct: 'members inactive 30d', guestRatio: 'of users are guests', activityConcentration: 'activity in one Space',
  commentsPerUserPerWeek: 'comments / active user / week', dormantSpacesPct: 'of Spaces dormant', timeTrackedPct: 'tasks with time logged',
  viewsPerSpace: 'Views per Space', dependenciesUsed: 'dependencies / links', dueDateCoverage: 'open tasks with a due date',
  ownershipCoverage: 'open tasks with an assignee', estimateCoverage: 'open tasks with an estimate', distinctWorkflows: 'distinct workflows',
  avgTasksPerList: 'average tasks per List', statusesPerWorkflow: 'statuses per workflow', unusedStatuses: 'unused statuses',
  duplicateStatusNames: 'duplicate status names', avgTimeInStatusDays: 'days in an active status', creationVsCompletionPct: 'more created than completed (90d)',
  wipPerPerson: 'open tasks per person',
}

const DRILL: Record<string, string> = {
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

function fmtValue(metricKey: string, v: number): { metric: string; label: string } {
  if (PCT_KEYS.has(metricKey)) return { metric: `${Math.round(v * 100)}%`, label: METRIC_LABEL[metricKey] ?? '' }
  const rounded = Math.round(v * 10) / 10
  return { metric: rounded.toLocaleString(), label: METRIC_LABEL[metricKey] ?? '' }
}

function chipValue(metricKey: string, v: number): string {
  return PCT_KEYS.has(metricKey) ? `${Math.round(v * 100)}%` : String(Math.round(v * 10) / 10).replace(/\.0$/, '')
}

/** Turn the model's "bad when" band into a client-facing target. */
function targetFor(sig: SignalScore): string {
  const model = CATEGORIES.flatMap((c) => c.signals).find((s) => s.key === sig.signalKey)
  const band = model?.bands[model.bands.length - 1]
  if (!band) return sig.threshold
  const targetCmp =
    band.cmp === '>' ? '<=' : band.cmp === '>=' ? '<' : band.cmp === '<' ? '>=' : '>'
  const value = PCT_KEYS.has(sig.metricKey)
    ? `${Math.round(band.value * 100)}%`
    : String(Math.round(band.value * 100) / 100).replace(/\.0$/, '')
  return `${targetCmp} ${value}`
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
      add('dormantList90PlusPct', 'Dormant Lists 90d+', 'dormant-lists-90')
      add('fragmentedListsPct', 'Fragmented Lists', 'fragmented-lists')
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
      add('stale90PlusPct', 'Stale 90d+', 'stale-90')
      add('wipPerPerson', 'Open / person')
      break
    case 'adoption':
      add('inactiveMemberPct', 'Inactive members', 'inactive-members')
      add('guestRatio', 'Guests')
      add('dormantSpacesPct', 'Dormant Spaces', 'dormant-spaces')
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

  return { headline: colonify(headline), body: colonify(body), projected, ai: ai.map(colonify) }
}

function signalStatus(sig: SignalScore): SignalStatus {
  if (sig.insightOnly) return 'insight'
  if (!sig.measured) return 'not_measured'
  if (!sig.severity) return 'within'
  const model = CATEGORIES.flatMap((c) => c.signals).find((s) => s.key === sig.signalKey)
  return model?.direction === 'lower_worse' ? 'below' : 'above'
}

function buildExplainer(
  sig: SignalScore,
  categoryWeight: number,
  measuredWeight: number,
  totalScoredWeight: number,
): SignalExplanation {
  const status = signalStatus(sig)
  const copy = SIGNAL_COPY[sig.signalKey]
  const value = sig.value === null ? 'Not measured' : fmtValue(sig.metricKey, sig.value).metric
  const categoryPoints = measuredWeight > 0 ? (sig.pointsLost / measuredWeight) * 100 : 0
  const overallPoints =
    measuredWeight > 0 && totalScoredWeight > 0
      ? categoryPoints * (categoryWeight / totalScoredWeight)
      : 0

  let why = copy?.explanation ?? `${sig.name} is outside the configured target (${sig.threshold}).`
  if (status === 'within') why = 'This signal is within target, so it is not lowering the score.'
  if (status === 'not_measured') why = 'ClickUp did not return enough data to measure this signal. It is excluded from the score.'
  if (status === 'insight' && !sig.severity) why = 'This is an insight-only signal. It does not affect the score.'

  return {
    key: sig.signalKey,
    name: sig.name,
    value,
    target: targetFor(sig),
    status,
    severity: sig.severity ?? undefined,
    weight: sig.insightOnly ? 'No score impact' : `${sig.weight}%`,
    categoryPoints: Math.round(categoryPoints * 10) / 10,
    overallPoints: Math.round(overallPoints * 10) / 10,
    why: colonify(why),
    good: colonify(SIGNAL_GOOD[sig.signalKey] ?? `Target: ${targetFor(sig)}`),
    drill: DRILL[sig.signalKey],
  }
}

function categorySummary(c: ScoreResult['categories'][number], explainers: SignalExplanation[]): string {
  if (!c.scored) return 'Not enough measurable data to score this category.'
  const bad = explainers
    .filter((e) => e.status === 'below' || e.status === 'above')
    .sort((a, b) => b.categoryPoints - a.categoryPoints)
  if (bad.length === 0) return 'Every measured signal in this category is within target.'
  const top = bad.slice(0, 2).map((e) => `${e.name} (${e.value} vs ${e.target})`)
  return `${c.name} is ${c.score}/100. ${top.join(' and ')} ${bad.length === 1 ? 'is' : 'are'} the main reason it is not higher.`
}

/** Convert the deterministic engine result (+ context) into the report UI model. */
export function toScanResult(input: MapInput): ScanResult {
  const { engine, metrics, workspace } = input

  const totalScoredWeight = engine.categories.filter((c) => c.scored).reduce((sum, c) => sum + c.weight, 0)
  const categories: CategoryResult[] = engine.categories.map((c) => {
    const measuredWeight = c.signals
      .filter((s) => s.measured && !s.insightOnly)
      .reduce((sum, s) => sum + s.weight, 0)
    const explainers = c.signals.map((s) => buildExplainer(s, c.weight, measuredWeight, totalScoredWeight))
    const overallImpact =
      c.scored && totalScoredWeight > 0 ? Math.round((c.pointsLost * c.weight / totalScoredWeight) * 10) / 10 : 0
    return {
      key: c.key,
      name: c.name,
      score: c.score,
      scored: c.scored,
      blurb: colonify(categorySummary(c, explainers)),
      metrics: chipsFor(c.key, metrics, workspace),
      overallImpact,
      explainers,
    }
  })

  const explainersBySignal = new Map(categories.flatMap((c) => (c.explainers ?? []).map((e) => [e.key, e] as const)))

  const findings: FindingResult[] = engine.findings
    .sort((a, b) => rank(a.severity) - rank(b.severity))
    .map((f) => {
      const metricKey = CATEGORIES.flatMap((c) => c.signals).find((s) => s.key === f.signalKey)?.metricKey ?? ''
      const { metric, label } = fmtValue(metricKey, f.metricValue)
      const copy = SIGNAL_COPY[f.signalKey]
      const explainer = explainersBySignal.get(f.signalKey)
      return {
        id: f.signalKey,
        title: f.title,
        category: f.categoryName,
        severity: f.severity,
        metric,
        metricLabel: label || f.threshold,
        explanation: colonify(copy?.explanation ?? `${f.title} is outside the configured threshold (${f.threshold}).`),
        recommendation: colonify(copy?.recommendation ?? 'Review this area and bring it back within threshold.'),
        affected: explainer?.affected,
        drill: DRILL[f.signalKey],
        target: explainer?.target ?? f.threshold,
        good: colonify(SIGNAL_GOOD[f.signalKey] ?? `Target: ${explainer?.target ?? f.threshold}`),
        impact:
          explainer && explainer.overallPoints && explainer.overallPoints > 0
            ? `Costs ${explainer.overallPoints.toFixed(1)} overall points`
            : 'No score penalty',
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
    .map((c) => ({ title: `${c.name} is strong`, detail: colonify(`${CATEGORY_BLURB[c.key] ?? ''} Scored ${c.score}/100.`) }))

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
  const scoredSignals = CATEGORIES.flatMap((category) => category.signals).filter(
    (signal) => !signal.insightOnly && signal.weight > 0,
  )
  const measuredSignals = scoredSignals.filter((signal) => {
    const value = metrics[signal.metricKey]
    return typeof value === 'number' && !Number.isNaN(value)
  }).length

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
    dataQuality: input.dataQuality
      ? {
          ...input.dataQuality,
          signalsMeasured: measuredSignals,
          signalsTotal: scoredSignals.length,
        }
      : undefined,
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
