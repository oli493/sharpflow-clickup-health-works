import type { Severity } from '../types'

/** Category blurbs shown on the score cards. */
export const CATEGORY_BLURB: Record<string, string> = {
  architecture: 'How the ClickUp hierarchy is structured — Spaces, Folders and Lists.',
  workflow: 'How statuses and workflows are configured and used.',
  governance: 'Custom Fields, required data and overall data quality.',
  operational: 'Active work: overdue, stale, WIP and completion behaviour.',
  adoption: 'How actively the workspace and its members are used.',
  utilisation: 'Whether valuable ClickUp capabilities are actually being used.',
  reporting: 'Whether the workspace holds enough structure for reliable reporting.',
}

interface Copy {
  explanation: string
  recommendation: string
}

/** Templated finding copy keyed by signal key (deterministic; AI only refines later). */
export const SIGNAL_COPY: Record<string, Copy> = {
  avg_tasks_per_list: {
    explanation: 'The average number of tasks per List is low, which usually means the hierarchy has drifted into thin, hard-to-manage Lists.',
    recommendation: 'Consolidate thin Lists by client, workstream or sprint, and use Folders for long-running groupings.',
  },
  dormant_lists: {
    explanation: 'A meaningful share of active Lists show no recent activity, suggesting abandoned or duplicated structure.',
    recommendation: 'Archive or merge dormant Lists and set a review cadence for new ones.',
  },
  fragmented_lists: {
    explanation: 'Many active Lists contain fewer than five open tasks, which fragments work and makes reporting noisy.',
    recommendation: 'Consolidate fragmented Lists and standardise how work is grouped.',
  },
  empty_folders: {
    explanation: 'A number of Folders are empty or unused, adding clutter without value.',
    recommendation: 'Remove empty Folders and keep the hierarchy focused.',
  },
  statuses_per_workflow: {
    explanation: 'The number of statuses per workflow is high, adding complexity to tracking and reporting.',
    recommendation: 'Reduce to a shared, minimal status set per workflow.',
  },
  unused_statuses: {
    explanation: 'Several statuses are applied to very few tasks, indicating unused or overlapping stages.',
    recommendation: 'Archive unused statuses and align naming across workflows.',
  },
  duplicate_statuses: {
    explanation: 'Statuses with the same or very similar names appear with different types, which confuses reporting.',
    recommendation: 'Standardise status names and types across the workspace.',
  },
  time_in_status: {
    explanation: 'Tasks remain in some statuses for unusually long periods, indicating blockers or unclear ownership.',
    recommendation: 'Review ageing work in long-running statuses and clarify ownership.',
  },
  custom_field_count: {
    explanation: 'A large number of Custom Fields exist across the workspace, which slows usage and reporting.',
    recommendation: 'Retire unused fields and keep a curated set.',
  },
  cf_completion: {
    explanation: 'Average Custom Field completion is low, weakening the reliability of reporting.',
    recommendation: 'Make key fields required where they drive reporting.',
  },
  cf_never_filled: {
    explanation: 'A number of Custom Fields sit at 0% filled on the tasks where they apply.',
    recommendation: 'Delete never-filled fields or make them required where relevant.',
  },
  missing_required_cf: {
    explanation: 'A notable share of tasks are missing required Custom Field values.',
    recommendation: 'Enforce required fields on creation in the relevant Lists.',
  },
  overdue_rate: {
    explanation: 'The overdue rate is above the threshold used by the Health Score, indicating work slipping past its due date.',
    recommendation: 'Run a weekly overdue sweep per Space and close, reschedule or reassign ageing work.',
  },
  stale_rate: {
    explanation: 'A meaningful share of open tasks have not been updated in over 90 days.',
    recommendation: 'Introduce a stale rule that flags old tasks for triage, and archive what is no longer relevant.',
  },
  stale_30_60: {
    explanation: 'A share of open tasks have not been updated in 30 to 60 days, an early sign of drift.',
    recommendation: 'Triage tasks untouched for a month and close, reschedule or reassign them.',
  },
  stale_60_90: {
    explanation: 'A share of open tasks have not been updated in 60 to 90 days, indicating stalled work.',
    recommendation: 'Review work untouched for two months and decide what to close or reassign.',
  },
  stale_90plus: {
    explanation: 'A share of open tasks have not been updated in over 90 days and are effectively abandoned.',
    recommendation: 'Archive or close long-abandoned tasks and add a stale rule to prevent rebuild.',
  },
  dormant_list_60: {
    explanation: 'Some Lists have had no task activity for 60 to 90 days.',
    recommendation: 'Review dormant Lists and merge or archive the ones no longer needed.',
  },
  dormant_list_90: {
    explanation: 'Some Lists have had no task activity for over 90 days.',
    recommendation: 'Archive dormant Lists or re-engage the teams that own them.',
  },
  subtasks_under_closed: {
    explanation: 'Open subtasks sit under parents already marked Done/Closed, hiding live work.',
    recommendation: 'Reopen the parent tasks or promote the remaining subtasks.',
  },
  creation_vs_completion: {
    explanation: 'More work is being created than completed over the last three months.',
    recommendation: 'Rebalance intake against delivery capacity, or close out ageing tasks.',
  },
  wip: {
    explanation: 'Work-in-progress per person is high, which increases context switching and delays.',
    recommendation: 'Limit active work per person and finish before starting new items.',
  },
  inactive_members: {
    explanation: 'A share of members have had no task or comment activity in the last 30 days.',
    recommendation: 'Confirm whether these members still need access or reduce their seat type.',
  },
  guest_ratio: {
    explanation: 'A high proportion of users are guests, which can indicate an access-governance gap.',
    recommendation: 'Review guest access and ensure external users are intended.',
  },
  activity_concentration: {
    explanation: 'Activity is concentrated in a single Space, suggesting uneven adoption elsewhere.',
    recommendation: 'Review whether other Spaces are actively used and consolidate where not.',
  },
  comment_rate: {
    explanation: 'Comment and update frequency per active user is low.',
    recommendation: 'Encourage updates on key tasks to improve visibility.',
  },
  dormant_spaces: {
    explanation: 'One or more Spaces show no recent activity.',
    recommendation: 'Archive dormant Spaces or re-engage the teams that own them.',
  },
  time_tracking: {
    explanation: 'Time tracking is available but almost nothing is logged, so capacity and forecasting data is missing.',
    recommendation: 'Roll out light time tracking on client-billable work.',
  },
  views: {
    explanation: 'Very few saved Views exist per Space, limiting visibility.',
    recommendation: 'Create operational Views/Dashboards for delivery and overdue monitoring.',
  },
  dependencies: {
    explanation: 'Dependencies and Relationships are barely used, so cross-task sequencing is not visible.',
    recommendation: 'Use dependencies on multi-step workstreams.',
  },
  goals: {
    explanation: 'Goals are not being used to track outcomes.',
    recommendation: 'Start with a small set of Goals to connect work to outcomes.',
  },
  docs: {
    explanation: 'Docs are not being used for knowledge or process.',
    recommendation: 'Centralise key process documentation in Docs.',
  },
  custom_task_types: {
    explanation: 'Custom Task Types are not used, so different work types share one generic task.',
    recommendation: 'Introduce a few Custom Task Types (e.g. Bug, Request) where useful.',
  },
  due_date_coverage: {
    explanation: 'A share of open tasks have no due date, undermining scheduling and reporting.',
    recommendation: 'Default due-date rules per List and flag tasks created without one.',
  },
  ownership_coverage: {
    explanation: 'A share of open tasks have no assignee, undermining accountability.',
    recommendation: 'Make ownership explicit and flag unassigned tasks.',
  },
  estimate_coverage: {
    explanation: 'Estimate coverage is low, so forecasting and workload views are weak.',
    recommendation: 'Add estimates on planned work, starting with key Lists.',
  },
  distinct_workflows: {
    explanation: 'There are many distinct workflows across the workspace, which fragments consistency.',
    recommendation: 'Standardise to a smaller set of shared workflows.',
  },
}

export const SEVERITY_LABEL: Record<Severity, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  opportunity: 'Opportunity',
}
