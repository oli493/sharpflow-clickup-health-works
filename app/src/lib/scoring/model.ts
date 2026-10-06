export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'opportunity'
export type Feasibility = 'yes' | 'part' | 'no'

/** A numeric band that maps a metric value to a severity. Worst bands first. */
export interface SignalBand {
  cmp: '>' | '>=' | '<' | '<='
  value: number
  severity: Severity
}

export interface Signal {
  key: string
  name: string
  feasibility: Feasibility
  /** Weight within its category (0-100). */
  weight: number
  /** Key into the metrics map produced by the scan. */
  metricKey: string
  /** Human-readable threshold, used in findings text. */
  threshold: string
  bands: SignalBand[]
  /** Not scored (insight only) — shown as a finding but no score impact. */
  insightOnly?: boolean
  /** Which direction is worse. Defaults to higher-is-worse. */
  direction?: 'higher_worse' | 'lower_worse'
  /** Value at which the deduction reaches the full severity weight (higher-is-worse). */
  ceiling?: number
  /** Value at which the deduction reaches the full severity weight (lower-is-worse). */
  floor?: number
}

export interface Category {
  key: string
  name: string
  /** Weight toward the overall score (0-100). */
  weight: number
  signals: Signal[]
}

/** Severity → score penalty factor (1 = full penalty, 0 = none). */
export const SEVERITY_PENALTY: Record<Severity, number> = {
  critical: 1,
  high: 0.75,
  medium: 0.5,
  low: 0.25,
  opportunity: 0, // Oli: opportunity findings carry little/no score penalty
}

/**
 * Oli's agreed scoring model.
 * Source: docs/scoring-answers.json (completed worksheet) + sign-off 06 Oct 2026.
 * Penalties scale with magnitude: deduction = SEVERITY_PENALTY[sev] × magnitude,
 * where magnitude ramps from the threshold to the ceiling (or floor).
 */
export const CATEGORIES: Category[] = [
  {
    key: 'architecture',
    name: 'Architecture & Structure',
    weight: 15,
    signals: [
      { key: 'avg_tasks_per_list', name: 'Avg tasks per List', feasibility: 'yes', weight: 15, metricKey: 'avgTasksPerList', threshold: '< 10 (median)', bands: [{ cmp: '<', value: 10, severity: 'low' }], direction: 'lower_worse', floor: 0 },
      { key: 'dormant_list_60', name: 'Dormant Lists 60d+', feasibility: 'yes', weight: 15, metricKey: 'dormantList60to90Pct', threshold: '> 5% of Lists (60-90d)', bands: [{ cmp: '>', value: 0.05, severity: 'medium' }], ceiling: 0.5 },
      { key: 'dormant_list_90', name: 'Dormant Lists 90d+', feasibility: 'yes', weight: 15, metricKey: 'dormantList90PlusPct', threshold: '> 5% of Lists (90d+)', bands: [{ cmp: '>', value: 0.05, severity: 'high' }], ceiling: 0.5 },
      { key: 'fragmented_lists', name: 'Fragmented Lists (< 5 tasks)', feasibility: 'yes', weight: 35, metricKey: 'fragmentedListsPct', threshold: '> 25% of Lists', bands: [{ cmp: '>', value: 0.25, severity: 'medium' }], ceiling: 0.8 },
      { key: 'empty_folders', name: 'Hierarchy / folder sprawl', feasibility: 'yes', weight: 20, metricKey: 'emptyFoldersPct', threshold: '> 20% empty Folders', bands: [{ cmp: '>', value: 0.2, severity: 'low' }], ceiling: 0.6 },
    ],
  },
  {
    key: 'workflow',
    name: 'Workflow Design',
    weight: 15,
    signals: [
      { key: 'statuses_per_workflow', name: 'Statuses per workflow', feasibility: 'yes', weight: 25, metricKey: 'statusesPerWorkflow', threshold: '> 12 per workflow', bands: [{ cmp: '>', value: 12, severity: 'low' }], ceiling: 30 },
      { key: 'unused_statuses', name: 'Unused statuses', feasibility: 'yes', weight: 25, metricKey: 'unusedStatuses', threshold: '> 3 per workflow', bands: [{ cmp: '>', value: 3, severity: 'medium' }], ceiling: 15 },
      { key: 'duplicate_statuses', name: 'Duplicate status names', feasibility: 'yes', weight: 20, metricKey: 'duplicateStatusNames', threshold: 'same name, different type', bands: [{ cmp: '>', value: 0, severity: 'medium' }], ceiling: 10 },
      { key: 'time_in_status', name: 'Avg time in a status', feasibility: 'part', weight: 30, metricKey: 'avgTimeInStatusDays', threshold: '> 14d in an active status', bands: [{ cmp: '>', value: 14, severity: 'medium' }], ceiling: 45 },
    ],
  },
  {
    key: 'governance',
    name: 'Data & Governance',
    weight: 15,
    signals: [
      { key: 'custom_field_count', name: 'Custom Field count (bloat)', feasibility: 'yes', weight: 20, metricKey: 'customFieldCount', threshold: '> 100 fields', bands: [{ cmp: '>', value: 100, severity: 'low' }], ceiling: 400 },
      { key: 'cf_completion', name: 'Custom Field completion rate', feasibility: 'yes', weight: 35, metricKey: 'cfCompletionPct', threshold: '< 50% where in scope', bands: [{ cmp: '<', value: 0.5, severity: 'high' }], direction: 'lower_worse', floor: 0.1 },
      { key: 'cf_never_filled', name: 'Fields never filled (0%)', feasibility: 'yes', weight: 25, metricKey: 'cfZeroFilledPct', threshold: '0% filled in scope', bands: [{ cmp: '>', value: 0, severity: 'medium' }], ceiling: 0.5 },
      { key: 'missing_required_cf', name: 'Tasks missing required Custom Fields', feasibility: 'yes', weight: 20, metricKey: 'missingRequiredCfPct', threshold: '> 20%', bands: [{ cmp: '>', value: 0.2, severity: 'medium' }], ceiling: 0.8 },
    ],
  },
  {
    key: 'operational',
    name: 'Operational Health',
    weight: 20,
    signals: [
      { key: 'overdue_rate', name: 'Overdue task rate', feasibility: 'yes', weight: 30, metricKey: 'overdueRate', threshold: '> 15% High / > 30% Critical', bands: [{ cmp: '>', value: 0.3, severity: 'critical' }, { cmp: '>', value: 0.15, severity: 'high' }], ceiling: 0.5 },
      { key: 'stale_30_60', name: 'Stale tasks 30-60d', feasibility: 'yes', weight: 8, metricKey: 'stale30to60Pct', threshold: '> 5% of open (30-60d)', bands: [{ cmp: '>', value: 0.05, severity: 'low' }], ceiling: 0.5 },
      { key: 'stale_60_90', name: 'Stale tasks 60-90d', feasibility: 'yes', weight: 8, metricKey: 'stale60to90Pct', threshold: '> 5% of open (60-90d)', bands: [{ cmp: '>', value: 0.05, severity: 'medium' }], ceiling: 0.5 },
      { key: 'stale_90plus', name: 'Stale tasks 90d+', feasibility: 'yes', weight: 9, metricKey: 'stale90PlusPct', threshold: '> 5% of open (90d+)', bands: [{ cmp: '>', value: 0.05, severity: 'high' }], ceiling: 0.5 },
      { key: 'subtasks_under_closed', name: 'Open subtasks under closed parents', feasibility: 'yes', weight: 15, metricKey: 'openSubtasksUnderClosedPct', threshold: '> 2% of subtasks', bands: [{ cmp: '>', value: 0.02, severity: 'medium' }], ceiling: 0.2 },
      { key: 'creation_vs_completion', name: 'Completion vs creation trend', feasibility: 'yes', weight: 15, metricKey: 'creationVsCompletionPct', threshold: 'created > done over 3 months', bands: [{ cmp: '>', value: 0, severity: 'medium' }], ceiling: 0.5 },
      { key: 'wip', name: 'Work-in-progress level', feasibility: 'yes', weight: 15, metricKey: 'wipPerPerson', threshold: '> 15 open / person', bands: [{ cmp: '>', value: 15, severity: 'low' }], ceiling: 40 },
    ],
  },
  {
    key: 'adoption',
    name: 'Adoption & Activity',
    weight: 15,
    signals: [
      { key: 'inactive_members', name: 'Inactive members', feasibility: 'part', weight: 25, metricKey: 'inactiveMemberPct', threshold: '> 15% of members', bands: [{ cmp: '>', value: 0.15, severity: 'medium' }], ceiling: 0.6 },
      { key: 'guest_ratio', name: 'Guest vs member ratio', feasibility: 'yes', weight: 15, metricKey: 'guestRatio', threshold: '> 30% of users are guests', bands: [{ cmp: '>', value: 0.3, severity: 'medium' }], ceiling: 0.6 },
      { key: 'activity_concentration', name: 'Activity concentration', feasibility: 'part', weight: 15, metricKey: 'activityConcentration', threshold: '> 80% in 1 Space', bands: [{ cmp: '>', value: 0.8, severity: 'low' }], ceiling: 1 },
      { key: 'comment_rate', name: 'Comment / update frequency', feasibility: 'yes', weight: 20, metricKey: 'commentsPerUserPerWeek', threshold: '< 1 per active user / week', bands: [{ cmp: '<', value: 1, severity: 'low' }], direction: 'lower_worse', floor: 0 },
      { key: 'dormant_spaces', name: 'Dormant Spaces', feasibility: 'yes', weight: 25, metricKey: 'dormantSpacesPct', threshold: 'any (after exclusions)', bands: [{ cmp: '>', value: 0, severity: 'medium' }], ceiling: 0.5 },
    ],
  },
  {
    key: 'utilisation',
    name: 'Platform Utilisation',
    weight: 10,
    signals: [
      { key: 'time_tracking', name: 'Time tracking in use', feasibility: 'yes', weight: 35, metricKey: 'timeTrackedPct', threshold: '< 5% of tasks logged', bands: [{ cmp: '<', value: 0.05, severity: 'opportunity' }], direction: 'lower_worse', floor: 0 },
      { key: 'views', name: 'Views', feasibility: 'yes', weight: 30, metricKey: 'viewsPerSpace', threshold: '< 2 Views per Space', bands: [{ cmp: '<', value: 2, severity: 'low' }], direction: 'lower_worse', floor: 0 },
      { key: 'dependencies', name: 'Dependencies / Relationships', feasibility: 'yes', weight: 35, metricKey: 'dependenciesUsed', threshold: 'none used', bands: [{ cmp: '<=', value: 0, severity: 'low' }], direction: 'lower_worse' },
      // Insight-only (no score impact):
      { key: 'goals', name: 'Goals tracked', feasibility: 'yes', weight: 0, metricKey: 'goalsTracked', threshold: 'none', bands: [{ cmp: '<=', value: 0, severity: 'opportunity' }], insightOnly: true },
      { key: 'docs', name: 'Docs used', feasibility: 'yes', weight: 0, metricKey: 'docsUsed', threshold: 'none', bands: [{ cmp: '<=', value: 0, severity: 'opportunity' }], insightOnly: true },
      { key: 'custom_task_types', name: 'Custom Task Types used', feasibility: 'yes', weight: 0, metricKey: 'customTaskTypes', threshold: 'none', bands: [{ cmp: '<=', value: 0, severity: 'opportunity' }], insightOnly: true },
    ],
  },
  {
    key: 'reporting',
    name: 'Reporting Readiness',
    weight: 10,
    signals: [
      { key: 'due_date_coverage', name: 'Due-date coverage', feasibility: 'yes', weight: 30, metricKey: 'dueDateCoverage', threshold: '< 80% of open tasks', bands: [{ cmp: '<', value: 0.8, severity: 'high' }], direction: 'lower_worse', floor: 0.2 },
      { key: 'ownership_coverage', name: 'Ownership (assignee) coverage', feasibility: 'yes', weight: 30, metricKey: 'ownershipCoverage', threshold: '< 80% of open tasks', bands: [{ cmp: '<', value: 0.8, severity: 'high' }], direction: 'lower_worse', floor: 0.2 },
      { key: 'estimate_coverage', name: 'Estimate coverage', feasibility: 'yes', weight: 20, metricKey: 'estimateCoverage', threshold: '< 40% of open tasks', bands: [{ cmp: '<', value: 0.4, severity: 'medium' }], direction: 'lower_worse', floor: 0.05 },
      { key: 'distinct_workflows', name: 'Consistent statuses / workflow', feasibility: 'yes', weight: 20, metricKey: 'distinctWorkflows', threshold: '> 5 distinct workflows', bands: [{ cmp: '>', value: 5, severity: 'medium' }], ceiling: 30 },
    ],
  },
]

export const DEFINITIONS = {
  overdue: 'past due date AND status is not a Done or Closed type',
  stale: 'open, no task update: 30-60d Low, 60-90d Medium, 90d+ High',
  dormant: 'no task activity: 60-90d Medium, 90d+ High',
  fragmentedList: 'fewer than 5 open tasks',
  activeUser: 'created / completed / commented in last 30 days',
} as const
