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
  parent?: string | null
}

export interface ClickUpCustomField {
  id: string
  name: string
  type: string
}

export interface ClickUpMember {
  id: number
  username: string
  email: string
  role: number // 1 owner, 2 admin, 3 member, 4 guest-ish (varies)
}
