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
      { key: 'status', label: 'Status', align: 'right' },
      { key: 'priority', label: 'Priority', align: 'right' },
    ],
  },
  stale: {
    title: 'Stale tasks',
    subtitle: 'Sample of open tasks untouched for 30+ days',
    columns: [
      { key: 'task', label: 'Task' },
      { key: 'owner', label: 'Owner' },
      { key: 'space', label: 'Space' },
      { key: 'lastUpdate', label: 'Last update', align: 'right' },
      { key: 'ageDays', label: 'Age (days)', align: 'right' },
      { key: 'status', label: 'Status', align: 'right' },
    ],
  },
  'stale-30': {
    title: 'Stale tasks (30d+)',
    subtitle: 'Sample of open tasks untouched for 30+ days',
    columns: [
      { key: 'task', label: 'Task' },
      { key: 'owner', label: 'Owner' },
      { key: 'space', label: 'Space' },
      { key: 'lastUpdate', label: 'Last update', align: 'right' },
      { key: 'ageDays', label: 'Age (days)', align: 'right' },
      { key: 'status', label: 'Status', align: 'right' },
    ],
  },
  'stale-60': {
    title: 'Stale tasks (60d+)',
    subtitle: 'Sample of open tasks untouched for 60+ days',
    columns: [
      { key: 'task', label: 'Task' },
      { key: 'owner', label: 'Owner' },
      { key: 'space', label: 'Space' },
      { key: 'lastUpdate', label: 'Last update', align: 'right' },
      { key: 'ageDays', label: 'Age (days)', align: 'right' },
      { key: 'status', label: 'Status', align: 'right' },
    ],
  },
  'stale-90': {
    title: 'Stale tasks (90d+)',
    subtitle: 'Sample of open tasks untouched for 90+ days',
    columns: [
      { key: 'task', label: 'Task' },
      { key: 'owner', label: 'Owner' },
      { key: 'space', label: 'Space' },
      { key: 'lastUpdate', label: 'Last update', align: 'right' },
      { key: 'ageDays', label: 'Age (days)', align: 'right' },
      { key: 'status', label: 'Status', align: 'right' },
    ],
  },
  'missing-due': {
    title: 'Tasks without a due date',
    subtitle: 'Active tasks missing a due date',
    columns: [
      { key: 'task', label: 'Task' },
      { key: 'assignee', label: 'Assignee' },
      { key: 'space', label: 'Space' },
      { key: 'created', label: 'Created', align: 'right' },
    ],
  },
  'missing-owner': {
    title: 'Tasks without an owner',
    subtitle: 'Active tasks missing an assignee',
    columns: [
      { key: 'task', label: 'Task' },
      { key: 'space', label: 'Space' },
      { key: 'status', label: 'Status', align: 'right' },
      { key: 'created', label: 'Created', align: 'right' },
    ],
  },
  'fragmented-lists': {
    title: 'Fragmented Lists',
    subtitle: 'Lists with fewer than 5 open tasks',
    columns: [
      { key: 'list', label: 'List' },
      { key: 'space', label: 'Space' },
      { key: 'openTasks', label: 'Open tasks', align: 'right' },
      { key: 'tasks', label: 'All tasks', align: 'right' },
      { key: 'lastActivity', label: 'Last activity', align: 'right' },
    ],
  },
  'custom-fields': {
    title: 'Custom Field audit',
    subtitle: 'Fields by completion rate, lowest first',
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
    subtitle: 'Lists with no task activity in 60+ days',
    columns: [
      { key: 'list', label: 'List' },
      { key: 'space', label: 'Space' },
      { key: 'tasks', label: 'Tasks', align: 'right' },
      { key: 'lastActivity', label: 'Last activity', align: 'right' },
    ],
  },
  'dormant-lists-60': {
    title: 'Dormant Lists (60d+)',
    subtitle: 'Lists with no task activity in 60+ days',
    columns: [
      { key: 'list', label: 'List' },
      { key: 'space', label: 'Space' },
      { key: 'tasks', label: 'Tasks', align: 'right' },
      { key: 'lastActivity', label: 'Last activity', align: 'right' },
    ],
  },
  'dormant-lists-90': {
    title: 'Dormant Lists (90d+)',
    subtitle: 'Lists with no task activity in 90+ days',
    columns: [
      { key: 'list', label: 'List' },
      { key: 'space', label: 'Space' },
      { key: 'tasks', label: 'Tasks', align: 'right' },
      { key: 'lastActivity', label: 'Last activity', align: 'right' },
    ],
  },
  views: {
    title: 'Saved Views',
    subtitle: 'Views defined per Space',
    columns: [
      { key: 'view', label: 'View' },
      { key: 'space', label: 'Space' },
      { key: 'type', label: 'Type', align: 'right' },
    ],
  },
  'dormant-spaces': {
    title: 'Dormant Spaces',
    subtitle: 'Spaces with no task activity in 90+ days',
    columns: [
      { key: 'space', label: 'Space' },
      { key: 'lists', label: 'Lists', align: 'right' },
      { key: 'tasks', label: 'Tasks', align: 'right' },
      { key: 'lastActivity', label: 'Last activity', align: 'right' },
    ],
  },
  'inactive-members': {
    title: 'Inactive members',
    subtitle: 'Members with no task or comment activity in the last 30 days',
    columns: [
      { key: 'member', label: 'Member' },
      { key: 'role', label: 'Role' },
      { key: 'lastActivity', label: 'Last activity', align: 'right' },
    ],
  },
  'duplicate-statuses': {
    title: 'Duplicate status names',
    subtitle: 'Status names reused with different types across Spaces',
    columns: [
      { key: 'status', label: 'Status' },
      { key: 'types', label: 'Types', align: 'right' },
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
