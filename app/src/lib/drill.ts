import type { DrillColumn } from './types'

export interface DatasetMeta {
  title: string
  subtitle: string
  columns: DrillColumn[]
}

export const DATASET_META: Record<string, DatasetMeta> = {
  overdue: {
    title: 'Overdue tasks',
    subtitle: 'Active tasks past their due date (worst first)',
    columns: [
      { key: 'task', label: 'Task' },
      { key: 'assignee', label: 'Assignee' },
      { key: 'space', label: 'Space' },
      { key: 'due', label: 'Overdue', align: 'right' },
      { key: 'priority', label: 'Priority', align: 'right' },
    ],
  },
  stale: {
    title: 'Stale tasks',
    subtitle: 'Open tasks untouched for 90+ days',
    columns: [
      { key: 'task', label: 'Task' },
      { key: 'owner', label: 'Owner' },
      { key: 'space', label: 'Space' },
      { key: 'lastUpdate', label: 'Last update', align: 'right' },
      { key: 'status', label: 'Status', align: 'right' },
    ],
  },
  'missing-due': {
    title: 'Tasks without an owner or due date',
    subtitle: 'Active tasks missing critical scheduling data',
    columns: [
      { key: 'task', label: 'Task' },
      { key: 'assignee', label: 'Assignee' },
      { key: 'space', label: 'Space' },
      { key: 'created', label: 'Created', align: 'right' },
    ],
  },
  'custom-fields': {
    title: 'Custom Field audit',
    subtitle: 'Fields by completion rate — lowest first',
    columns: [
      { key: 'field', label: 'Custom Field' },
      { key: 'scope', label: 'Scope' },
      { key: 'completion', label: 'Completion', align: 'right' },
      { key: 'status', label: 'Status', align: 'right' },
    ],
  },
  'quiet-seats': {
    title: 'Inactive members',
    subtitle: 'Members with no activity in the last 30 days',
    columns: [
      { key: 'member', label: 'Member' },
      { key: 'role', label: 'Role' },
      { key: 'lastActivity', label: 'Last activity', align: 'right' },
    ],
  },
  'unused-statuses': {
    title: 'Unused & duplicate statuses',
    subtitle: 'Statuses applied to fewer than 1% of tasks',
    columns: [
      { key: 'status', label: 'Status' },
      { key: 'space', label: 'Space' },
      { key: 'tasksUsing', label: 'Tasks using', align: 'right' },
    ],
  },
  'dormant-lists': {
    title: 'Dormant Lists',
    subtitle: 'Active Lists with fewer than 5 tasks and no recent activity',
    columns: [
      { key: 'list', label: 'List' },
      { key: 'space', label: 'Space' },
      { key: 'tasks', label: 'Tasks', align: 'right' },
      { key: 'lastActivity', label: 'Last activity', align: 'right' },
    ],
  },
}

export const SPACE_COLUMNS: DrillColumn[] = [
  { key: 'list', label: 'List' },
  { key: 'tasks', label: 'Tasks', align: 'right' },
  { key: 'overdue', label: 'Overdue', align: 'right' },
  { key: 'lastActivity', label: 'Last activity', align: 'right' },
  { key: 'health', label: 'Health', align: 'right' },
]
