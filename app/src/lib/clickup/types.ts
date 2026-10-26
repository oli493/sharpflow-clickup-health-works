// Minimal ClickUp API types (v2) — extended as the scan grows.

export interface ClickUpTeam {
  id: string
  name: string
  members?: { user: { id: number; username: string; email: string; role: number } }[]
}

export interface ClickUpSpace {
  id: string
  name: string
  archived?: boolean
  date_created?: string
  statuses?: { status: string; type: string; orderindex: number }[]
}

export interface ClickUpFolder {
  id: string
  name: string
  archived?: boolean
  lists?: ClickUpList[]
}

export interface ClickUpList {
  id: string
  name: string
  archived?: boolean
  task_count?: number
  date_created?: string
  folder?: { id: string; name: string }
  space?: { id: string; name: string }
}

export interface ClickUpTask {
  id: string
  name: string
  status: { status: string; type: string }
  date_created?: string
  date_updated?: string
  date_closed?: string
  due_date?: string | null
  assignees?: { id: number; username: string }[]
  creator?: { id: number; username: string }
  parent?: string | null
  priority?: { id: string; priority: string } | null
  time_estimate?: string | number
  time_spent?: string | number
  dependencies?: unknown[]
  custom_fields?: { id: string; name: string; type: string; value: unknown; required?: boolean }[]
}

export interface ClickUpCustomField {
  id: string
  name: string
  type: string
  /** Present on some field payloads; true when the field is required. */
  required?: boolean
}

export interface ClickUpView {
  id: string
  name: string
  type: string
}

export interface ClickUpGoal {
  id: string
  name: string
}

export interface ClickUpCustomItem {
  id: string
  name: string
}

export interface ClickUpComment {
  id: string
  comment_text?: string
  user?: { id: number; username?: string }
  date?: string
}

export interface ClickUpTimeEntry {
  id: string
  task?: { id: string }
  user?: { id: number }
  duration?: string | number
  start?: string | number
  end?: string | number
}

export interface ClickUpMember {
  id: number
  username: string
  email: string
  role: number // 1 owner, 2 admin, 3 member, 4 guest-ish (varies)
}
