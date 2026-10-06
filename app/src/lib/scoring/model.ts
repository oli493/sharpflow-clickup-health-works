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
  /** Weight within its category (0–100). */
  weight: number
  /** Key into the metrics map produced by the scan. */
  metricKey: string
  /** Human-readable threshold, used in findings text. */
  threshold: string
  bands: SignalBand[]
  /** Not scored (insight only) — shown as a finding but no score impact. */
  insightOnly?: boolean
}

export interface Category {
  key: string
  name: string
  /** Weight toward the overall score (0–100). */
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
 * Source: docs/scoring-answers.json (completed worksheet).
 */
export const CATEGORIES: Category[] = [
  {
    key: 'architecture',
    name: 'Architecture & Structure',
    weight: 15,
    signals: [
      { key: 'avg_tasks_per_list', name: 'Avg tasks per List', feasibility: 'yes', weight: 15, metricKey: 'avgTasksPerList', threshold: '< 10 (median)', bands: [{ cmp: '<', value: 10, severity: 'low' }] },
      { key: 'dormant_lists', name: 'Dormant Lists (no activity)', feasibility: 'yes', weight: 30, metricKey: 'dormantListsPct', threshold: '> 20% of Lists', bands: [{ cmp: '>', value: 0.2, severity: 'medium' }] },
      { key: 'fragmented_lists', name: 'Fragmented Lists (< 5 tasks)', feasibility: 'yes', weight: 35, metricKey: 'fragmentedListsPct', threshold: '> 25% of Lists', bands: [{ cmp: '>', value: 0.25, severity: 'medium' }] },
      { key: 'empty_folders', name: 'Hierarchy / folder sprawl', feasibility: 'yes', weight: 20, metricKey: 'emptyFoldersPct', threshold: '> 20% empty Folders', bands: [{ cmp: '>', value: 0.2, severity: 'low' }] },
    ],
  },
  {
    key: 'workflow',
    name: 'Workflow Design',
    weight: 15,
    signals: [
      { key: 'statuses_per_workflow', name: 'Statuses per workflow', feasibility: 'yes', weight: 25, metricKey: 'statusesPerWorkflow', threshold: '> 12 per workflow', bands: [{ cmp: '>', value: 12, severity: 'low' }] },
      { key: 'unused_statuses', name: 'Unused statuses', feasibility: 'yes', weight: 25, metricKey: 'unusedStatuses', threshold: '> 3 per workflow', bands: [{ cmp: '>', value: 3, severity: 'medium' }] },
      { key: 'duplicate_statuses', name: 'Duplicate status names', feasibility: 'yes', weight: 20, metricKey: 'duplicateStatusNames', threshold: 'same name, different type', bands: [{ cmp: '>', value: 0, severity: 'medium' }] },
      { key: 'time_in_status', name: 'Avg time in a status', feasibility: 'part', weight: 30, metricKey: 'avgTimeInStatusDays', threshold: '> 14d in an active status', bands: [{ cmp: '>', value: 14, severity: 'medium' }] },
    ],
  },
  {
    key: 'governance',
    name: 'Data & Governance',
    weight: 15,
    signals: [
      { key: 'custom_field_count', name: 'Custom Field count (bloat)', feasibility: 'yes', weight: 20, metricKey: 'customFieldCount', threshold: '> 100 fields', bands: [{ cmp: '>', value: 100, severity: 'low' }] },
      { key: 'cf_completion', name: 'Custom Field completion rate', feasibility: 'yes', weight: 35, metricKey: 'cfCompletionPct', threshold: '< 50% where in scope', bands: [{ cmp: '<', value: 0.5, severity: 'high' }] },
      { key: 'cf_never_filled', name: 'Fields never filled (0%)', feasibility: 'yes', weight: 25, metricKey: 'cfZeroFilledPct', threshold: '0% filled in scope', bands: [{ cmp: '>', value: 0, severity: 'medium' }] },
      { key: 'missing_required_cf', name: 'Tasks missing required Custom Fields', feasibility: 'yes', weight: 20, metricKey: 'missingRequiredCfPct', threshold: '> 20%', bands: [{ cmp: '>', value: 0.2, severity: 'medium' }] },
    ],
  },
  {
    key: 'operational',
    name: 'Operational Health',
    weight: 20,
    signals: [
      { key: 'overdue_rate', name: 'Overdue task rate', feasibility: 'yes', weight: 30, metricKey: 'overdueRate', threshold: '> 15% High / > 30% Critical', bands: [{ cmp: '>', value: 0.3, severity: 'critical' }, { cmp: '>', value: 0.15, severity: 'high' }] },
      { key: 'stale_rate', name: 'Stale tasks (no update 90d+)', feasibility: 'yes', weight: 25, metricKey: 'staleRate', threshold: '> 20% of open', bands: [{ cmp: '>', value: 0.2, severity: 'high' }] },
      { key: 'subtasks_under_closed', name: 'Open subtasks under closed parents', feasibility: 'yes', weight: 15, metricKey: 'openSubtasksUnderClosedPct', threshold: '> 2% of subtasks', bands: [{ cmp: '>', value: 0.02, severity: 'medium' }] },
      { key: 'creation_vs_completion', name: 'Completion vs creation trend', feasibility: 'yes', weight: 15, metricKey: 'creationMinusCompletion', threshold: 'created > done over 3 months', bands: [{ cmp: '>', value: 0, severity: 'medium' }] },
      { key: 'wip', name: 'Work-in-progress level', feasibility: 'yes', weight: 15, metricKey: 'wipPerPerson', threshold: '> 15 open / person', bands: [{ cmp: '>', value: 15, severity: 'low' }] },
    ],
  },
  {
    key: 'adoption',
    name: 'Adoption & Activity',
    weight: 15,
    signals: [
      { key: 'inactive_members', name: 'Inactive members', feasibility: 'part', weight: 25, metricKey: 'inactiveMemberPct', threshold: '> 15% of members', bands: [{ cmp: '>', value: 0.15, severity: 'medium' }] },
      { key: 'guest_ratio', name: 'Guest vs member ratio', feasibility: 'yes', weight: 15, metricKey: 'guestRatio', threshold: '> 30% of users are guests', bands: [{ cmp: '>', value: 0.3, severity: 'medium' }] },
      { key: 'activity_concentration', name: 'Activity concentration', feasibility: 'part', weight: 15, metricKey: 'activityConcentration', threshold: '> 80% in 1 Space', bands: [{ cmp: '>', value: 0.8, severity: 'low' }] },
      { key: 'comment_rate', name: 'Comment / update frequency', feasibility: 'yes', weight: 20, metricKey: 'commentsPerUserPerWeek', threshold: '< 1 per active user / week', bands: [{ cmp: '<', value: 1, severity: 'low' }] },
      { key: 'dormant_spaces', name: 'Dormant Spaces', feasibility: 'yes', weight: 25, metricKey: 'dormantSpaces', threshold: 'any (after exclusions)', bands: [{ cmp: '>', value: 0, severity: 'medium' }] },
    ],
  },
  {
    key: 'utilisation',
    name: 'Platform Utilisation',
    weight: 10,
    signals: [
      { key: 'time_tracking', name: 'Time tracking in use', feasibility: 'yes', weight: 35, metricKey: 'timeTrackedPct', threshold: '< 5% of tasks logged', bands: [{ cmp: '<', value: 0.05, severity: 'opportunity' }] },
      { key: 'views', name: 'Views', feasibility: 'yes', weight: 30, metricKey: 'viewsPerSpace', threshold: '< 2 Views per Space', bands: [{ cmp: '<', value: 2, severity: 'low' }] },
      { key: 'dependencies', name: 'Dependencies / Relationships', feasibility: 'yes', weight: 35, metricKey: 'dependenciesUsed', threshold: 'none used', bands: [{ cmp: '<=', value: 0, severity: 'low' }] },
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
      { key: 'due_date_coverage', name: 'Due-date coverage', feasibility: 'yes', weight: 30, metricKey: 'dueDateCoverage', threshold: '< 80% of open tasks', bands: [{ cmp: '<', value: 0.8, severity: 'high' }] },
      { key: 'ownership_coverage', name: 'Ownership (assignee) coverage', feasibility: 'yes', weight: 30, metricKey: 'ownershipCoverage', threshold: '< 80% of open tasks', bands: [{ cmp: '<', value: 0.8, severity: 'high' }] },
      { key: 'estimate_coverage', name: 'Estimate coverage', feasibility: 'yes', weight: 20, metricKey: 'estimateCoverage', threshold: '< 40% of open tasks', bands: [{ cmp: '<', value: 0.4, severity: 'medium' }] },
      { key: 'distinct_workflows', name: 'Consistent statuses / workflow', feasibility: 'yes', weight: 20, metricKey: 'distinctWorkflows', threshold: '> 5 distinct workflows', bands: [{ cmp: '>', value: 5, severity: 'medium' }] },
    ],
  },
]

export const DEFINITIONS = {
  overdue: 'past due date AND status is not a Done or Closed type',
  stale: 'open, no task update for 90 days',
  dormant: 'no task activity for 90 days',
  fragmentedList: 'fewer than 5 open tasks',
  activeUser: 'created / completed / commented in last 30 days',
} as const
