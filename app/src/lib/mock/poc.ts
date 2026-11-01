import type { FindingResult, Severity } from '../types'

export type PocSignalStatus = 'bad' | 'good' | 'watch'

export interface PocSignal {
  name: string
  value: string
  target: string
  status: PocSignalStatus
  severity?: Severity
  impact?: number
  why: string
  good: string
  affected?: string
}

export interface PocCategory {
  key: string
  name: string
  score: number
  overallImpact: number
  summary: string
  signals: PocSignal[]
}

export interface PocAction {
  rank: number
  title: string
  category: string
  severity: Severity
  why: string
  action: string
  effort: 'Quick win' | 'Small project' | 'Consulting project'
  impact: 'High' | 'Medium' | 'Low'
  affected: string
  owner: string
}

export interface PocFinding extends FindingResult {
  good: string
  impact: string
}

export const POC_CATEGORIES: PocCategory[] = [
  {
    key: 'architecture',
    name: 'Architecture & Structure',
    score: 81,
    overallImpact: 2.9,
    summary: 'The hierarchy is broadly healthy, but a large tail of thin Lists is creating unnecessary structure.',
    signals: [
      {
        name: 'Fragmented Lists',
        value: '38%',
        target: '< 25%',
        status: 'bad',
        severity: 'high',
        impact: 2.2,
        why: '81 of 214 active Lists contain fewer than five tasks. Work is spread too thin, which makes ownership and reporting harder.',
        good: 'Fewer than 25% of Lists should have under five open tasks.',
        affected: '81 Lists',
      },
      {
        name: 'Dormant Lists 90d+',
        value: '11%',
        target: '< 5%',
        status: 'bad',
        severity: 'medium',
        impact: 0.7,
        why: '23 Lists have had no activity for over 90 days. They add clutter and make the workspace look busier than it is.',
        good: 'Under 5% of active Lists should be dormant for 90+ days.',
        affected: '23 Lists',
      },
      {
        name: 'Avg tasks per List',
        value: '66.4',
        target: '>= 10',
        status: 'good',
        why: 'The average List carries a healthy amount of work.',
        good: 'At least 10 tasks per List keeps structure useful without becoming bloated.',
      },
      {
        name: 'Empty Folders',
        value: '8%',
        target: '< 20%',
        status: 'good',
        why: 'Most Folders contain active structure.',
        good: 'Keep empty Folders below 20% of the hierarchy.',
      },
    ],
  },
  {
    key: 'workflow',
    name: 'Workflow Design',
    score: 77,
    overallImpact: 3.5,
    summary: 'Status workflows are mostly consistent, but unused and duplicated statuses add friction.',
    signals: [
      {
        name: 'Unused statuses',
        value: '9',
        target: '<= 3',
        status: 'bad',
        severity: 'medium',
        impact: 1.8,
        why: 'Nine statuses are used on very few tasks. They create choices without adding tracking value.',
        good: 'Keep unused statuses at three or fewer per workflow.',
        affected: '9 statuses',
      },
      {
        name: 'Duplicate status names',
        value: '2',
        target: '0',
        status: 'bad',
        severity: 'medium',
        impact: 1.2,
        why: 'The same status name appears with different status types, which confuses rollups and reporting.',
        good: 'Each status name should map to one consistent type.',
        affected: '2 names',
      },
      {
        name: 'Statuses per workflow',
        value: '8',
        target: '<= 12',
        status: 'good',
        why: 'The number of statuses per workflow is within a manageable range.',
        good: 'Aim for 12 or fewer statuses per workflow.',
      },
      {
        name: 'Avg time in status',
        value: '4.2d',
        target: '<= 14d',
        status: 'good',
        why: 'Work is moving through active statuses at a healthy pace.',
        good: 'Active statuses should average under 14 days.',
      },
    ],
  },
  {
    key: 'governance',
    name: 'Data & Governance',
    score: 62,
    overallImpact: 5.7,
    summary: 'Custom Field sprawl and low completion are the main reasons this category is below target.',
    signals: [
      {
        name: 'Custom Field completion',
        value: '43%',
        target: '>= 50%',
        status: 'bad',
        severity: 'high',
        impact: 2.4,
        why: 'Less than half of the fields that should be filled are being filled. Reporting built on them is unreliable.',
        good: 'At least 50% completion where fields are in scope; 80%+ is strong.',
        affected: '148 fields',
      },
      {
        name: 'Custom Field count',
        value: '148',
        target: '< 100',
        status: 'bad',
        severity: 'low',
        impact: 1.6,
        why: 'A large number of Custom Fields slows task creation and makes the important fields harder to find.',
        good: 'Keep the active field set under 100 and retire the rest.',
        affected: '148 fields',
      },
      {
        name: 'Fields at 0% filled',
        value: '61',
        target: '0',
        status: 'bad',
        severity: 'medium',
        impact: 1.4,
        why: '61 fields are never used on the tasks where they apply. They add noise without data.',
        good: 'Delete never-filled fields or make them required where they matter.',
        affected: '61 fields',
      },
      {
        name: 'Missing required fields',
        value: '7%',
        target: '< 20%',
        status: 'good',
        why: 'Only a small share of tasks are missing required field values.',
        good: 'Keep missing required values below 20%.',
      },
    ],
  },
  {
    key: 'operational',
    name: 'Operational Health',
    score: 68,
    overallImpact: 6.4,
    summary: 'Overdue work is the biggest single driver of the score, followed by stale tasks and high WIP.',
    signals: [
      {
        name: 'Overdue rate',
        value: '31.4%',
        target: '< 15%',
        status: 'bad',
        severity: 'critical',
        impact: 4.2,
        why: '31.4% of active tasks are past their due date. Delivery is slipping and the due-date signal can no longer be trusted.',
        good: 'Under 15% overdue; under 5% is best-in-class.',
        affected: '4,466 tasks',
      },
      {
        name: 'Stale tasks 90d+',
        value: '12%',
        target: '< 5%',
        status: 'bad',
        severity: 'high',
        impact: 1.6,
        why: 'A meaningful share of open tasks have not been updated for over 90 days, inflating WIP and hiding abandoned work.',
        good: 'Keep open tasks untouched for 90+ days below 5%.',
        affected: '612 tasks',
      },
      {
        name: 'Work-in-progress per person',
        value: '19',
        target: '< 15',
        status: 'bad',
        severity: 'low',
        impact: 0.6,
        why: 'People are carrying too many open tasks at once, which increases context switching and delays completion.',
        good: 'Aim for fewer than 15 open tasks per person.',
      },
      {
        name: 'Completion vs creation',
        value: '9.1k vs 10.8k',
        target: 'done >= created',
        status: 'watch',
        why: 'More work was created than completed over the last three months.',
        good: 'Completion should keep pace with creation over a 90-day window.',
      },
    ],
  },
  {
    key: 'adoption',
    name: 'Adoption & Activity',
    score: 79,
    overallImpact: 3.2,
    summary: 'Most of the team is active, but quiet members and guest access are pulling the score down.',
    signals: [
      {
        name: 'Inactive members',
        value: '19%',
        target: '< 15%',
        status: 'bad',
        severity: 'medium',
        impact: 1.4,
        why: 'Eight members have not created, completed or commented on work in 30 days. Their seats may no longer be needed.',
        good: 'Keep inactive members below 15% of the workspace.',
        affected: '8 members',
      },
      {
        name: 'Guest ratio',
        value: '38%',
        target: '< 30%',
        status: 'bad',
        severity: 'medium',
        impact: 1.1,
        why: 'A high share of users are guests, which can indicate an access-governance gap.',
        good: 'Keep guests below 30% of total users unless the model requires it.',
      },
      {
        name: 'Activity in one Space',
        value: '72%',
        target: '< 80%',
        status: 'good',
        why: 'Activity is spread across more than one Space.',
        good: 'Avoid concentrating more than 80% of activity in a single Space.',
      },
      {
        name: 'Dormant Spaces',
        value: '17%',
        target: '0%',
        status: 'bad',
        severity: 'medium',
        impact: 0.7,
        why: 'One Space has no recent activity and is adding clutter to the workspace.',
        good: 'Archive dormant Spaces or re-engage the team that owns them.',
        affected: '1 Space',
      },
    ],
  },
  {
    key: 'utilisation',
    name: 'Platform Utilisation',
    score: 57,
    overallImpact: 4.3,
    summary: 'High-value ClickUp capabilities are available but only lightly used, especially Views and time tracking.',
    signals: [
      {
        name: 'Views per Space',
        value: '1.8',
        target: '>= 2',
        status: 'bad',
        severity: 'low',
        impact: 2.0,
        why: 'Most Spaces have fewer than two saved Views, so delivery, workload and overdue work are not visible at a glance.',
        good: 'At least two operational Views per Space.',
        affected: '4 Spaces',
      },
      {
        name: 'Time tracking',
        value: '3%',
        target: '>= 5%',
        status: 'bad',
        severity: 'opportunity',
        impact: 0,
        why: 'Time tracking is enabled but almost nothing is logged, so capacity and forecasting data is missing. This is an opportunity, not a score penalty.',
        good: 'Roll out light tracking on client-billable work first.',
        affected: '6% of tasks',
      },
      {
        name: 'Dependencies / Relationships',
        value: '184',
        target: '> 0',
        status: 'good',
        why: 'Dependencies are being used to show sequencing.',
        good: 'Use dependencies on multi-step workstreams.',
      },
      {
        name: 'Goals',
        value: '2',
        target: '> 0',
        status: 'good',
        why: 'Goals are tracked, connecting work to outcomes.',
        good: 'Keep a small set of active Goals.',
      },
    ],
  },
  {
    key: 'reporting',
    name: 'Reporting Readiness',
    score: 83,
    overallImpact: 1.7,
    summary: 'Due dates and ownership are strong. Estimate coverage and workflow consistency are the remaining gaps.',
    signals: [
      {
        name: 'Estimate coverage',
        value: '34%',
        target: '>= 40%',
        status: 'bad',
        severity: 'medium',
        impact: 1.2,
        why: 'Only a third of open tasks have an estimate, which weakens forecasting and workload planning.',
        good: 'At least 40% of open tasks should carry an estimate.',
        affected: '34% of open tasks',
      },
      {
        name: 'Distinct workflows',
        value: '6',
        target: '<= 5',
        status: 'bad',
        severity: 'medium',
        impact: 0.5,
        why: 'Six different workflows make status reporting harder to standardise.',
        good: 'Aim for five or fewer shared workflows.',
      },
      {
        name: 'Due-date coverage',
        value: '91%',
        target: '>= 80%',
        status: 'good',
        why: 'Most open tasks have a due date, so scheduling data is reliable.',
        good: 'Keep due-date coverage above 80%.',
      },
      {
        name: 'Ownership coverage',
        value: '88%',
        target: '>= 80%',
        status: 'good',
        why: 'Most open tasks have an assignee.',
        good: 'Keep ownership coverage above 80%.',
      },
    ],
  },
]

export const POC_FINDINGS: PocFinding[] = [
  {
    id: 'f-overdue',
    title: 'High overdue task rate',
    category: 'Operational Health',
    severity: 'critical',
    metric: '31.4%',
    metricLabel: 'of active tasks overdue',
    explanation: '31.4% of active tasks (4,466 of 14,217) are past their due date, above the 30% critical threshold. Overdue work is concentrated in three of six Spaces.',
    recommendation: 'Review ageing work and decide what to close, reschedule, reassign or remove from active workflows. Set a weekly overdue sweep per Space.',
    affected: '3 Spaces - 4,466 tasks',
    drill: 'overdue',
    good: 'Under 15% overdue; under 5% is best-in-class.',
    impact: '-4.2 overall points',
  },
  {
    id: 'f-frag',
    title: 'Potential List fragmentation',
    category: 'Architecture & Structure',
    severity: 'high',
    metric: '38%',
    metricLabel: 'of active Lists under five tasks',
    explanation: '81 of 214 active Lists contain fewer than five active tasks, suggesting structure has drifted into thin, hard-to-manage Lists.',
    recommendation: 'Consolidate thin Lists by client, workstream or sprint. Consider Folders instead of Lists for long-running groupings.',
    affected: '81 Lists',
    drill: 'fragmented-lists',
    good: 'Fewer than 25% of Lists should have under five open tasks.',
    impact: '-2.2 overall points',
  },
  {
    id: 'f-customfields',
    title: 'Custom Fields never filled',
    category: 'Data & Governance',
    severity: 'high',
    metric: '61',
    metricLabel: 'fields at 0% filled',
    explanation: '148 Custom Fields exist and 61 sit at 0% filled on the tasks where they apply. Average field completion is 43%, weakening reporting.',
    recommendation: 'Retire unused fields and make key fields required in the Spaces where they drive reporting.',
    affected: '61 fields',
    drill: 'custom-fields',
    good: 'No never-filled fields; at least 50% completion where fields are in scope.',
    impact: '-2.1 overall points',
  },
  {
    id: 'f-quiet',
    title: 'Inactive members',
    category: 'Adoption & Activity',
    severity: 'medium',
    metric: '8',
    metricLabel: 'members inactive for 30 days',
    explanation: '8 of 42 members (about 19%) have not created, completed or commented on work in 30 days. Roles are exposed by the API, not billing, so this is activity-based.',
    recommendation: 'Confirm whether these members still need access, or reduce their seat type.',
    affected: '8 members',
    drill: 'inactive-members',
    good: 'Keep inactive members below 15% of the workspace.',
    impact: '-1.4 overall points',
  },
]

export const POC_ACTIONS: PocAction[] = [
  {
    rank: 1,
    title: 'Reduce overdue work',
    category: 'Operational Health',
    severity: 'critical',
    why: '31.4% of active work is past due, which is the single biggest drag on the score and on delivery trust.',
    action: 'Run a weekly overdue sweep per Space. Close, reschedule, reassign or archive ageing tasks.',
    effort: 'Quick win',
    impact: 'High',
    affected: '4,466 tasks',
    owner: 'Ops leads',
  },
  {
    rank: 2,
    title: 'Retire never-filled Custom Fields',
    category: 'Data & Governance',
    severity: 'high',
    why: '61 fields are never used, while average field completion sits at 43%. The field set is too large to manage.',
    action: 'Archive fields at 0% and make the remaining key fields required where they drive reporting.',
    effort: 'Quick win',
    impact: 'Medium',
    affected: '61 fields',
    owner: 'Workspace admin',
  },
  {
    rank: 3,
    title: 'Consolidate thin Lists',
    category: 'Architecture & Structure',
    severity: 'high',
    why: '38% of Lists have fewer than five tasks, so work is fragmented and hard to report on.',
    action: 'Merge thin Lists by client or workstream and use Folders for long-running groupings.',
    effort: 'Small project',
    impact: 'High',
    affected: '81 Lists',
    owner: 'Space owners',
  },
  {
    rank: 4,
    title: 'Assign owners to unowned work',
    category: 'Reporting Readiness',
    severity: 'medium',
    why: 'Unassigned tasks undermine accountability and make overdue work harder to resolve.',
    action: 'Add an automation that flags new tasks without an assignee, then clear the current backlog.',
    effort: 'Quick win',
    impact: 'High',
    affected: '731 tasks',
    owner: 'Team leads',
  },
  {
    rank: 5,
    title: 'Adopt time tracking on client work',
    category: 'Platform Utilisation',
    severity: 'opportunity',
    why: 'Time tracking is enabled but only 6% of tasks log time, so capacity and forecasting data is missing.',
    action: 'Roll out light time tracking on client-billable Lists first, then expand if the team finds it useful.',
    effort: 'Consulting project',
    impact: 'Medium',
    affected: '6% of tasks',
    owner: 'Delivery leads',
  },
]

export const POC_PDF_URL = '/poc/sharpflow-poc-report.pdf'

export const POC_CTA_URL = 'https://sharpflowconsulting.com'
