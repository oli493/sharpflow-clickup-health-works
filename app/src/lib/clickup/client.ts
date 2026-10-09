import type {
  ClickUpComment,
  ClickUpCustomField,
  ClickUpCustomItem,
  ClickUpFolder,
  ClickUpGoal,
  ClickUpList,
  ClickUpSpace,
  ClickUpTask,
  ClickUpTeam,
  ClickUpView,
} from './types'

const API = 'https://api.clickup.com/api/v2'
const REQUEST_TIMEOUT_MS = 30_000

interface RequestOptions {
  query?: Record<string, string | number | boolean | undefined>
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: unknown
}

/** Error carrying the HTTP status and ClickUp's error code (e.g. OAUTH_192). */
export class ClickUpError extends Error {
  status: number
  code: string | null

  constructor(status: number, body: string, path: string) {
    super(`ClickUp ${status} on ${path}: ${body.slice(0, 200)}`)
    this.name = 'ClickUpError'
    this.status = status
    let code: string | null = null
    try {
      code = (JSON.parse(body) as { ECODE?: string }).ECODE ?? null
    } catch {
      code = null
    }
    this.code = code
  }
}

/**
 * Thin ClickUp v2 client with basic rate-limit handling.
 * ClickUp rate limits are per-token and plan-gated (~100 req/min below Business Plus),
 * so we serialise requests and back off on 429.
 */
export class ClickUpClient {
  constructor(private readonly token: string) {}

  private async request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
    const url = new URL(`${API}${path}`)
    if (opts.query) {
      for (const [k, v] of Object.entries(opts.query)) {
        if (v !== undefined && v !== null) url.searchParams.set(k, String(v))
      }
    }

    let attempt = 0
    // Retry with exponential backoff on timeouts / 429 / 5xx. Every request has a
    // hard timeout so a stalled connection errors (and is retried) rather than
    // hanging the whole step forever.
    while (true) {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
      let res: Response | null = null
      try {
        res = await fetch(url, {
          method: opts.method ?? 'GET',
          headers: {
            Authorization: this.token,
            'Content-Type': 'application/json',
          },
          body: opts.body ? JSON.stringify(opts.body) : undefined,
          cache: 'no-store',
          signal: controller.signal,
        })
      } catch {
        res = null // network error or request timeout
      } finally {
        clearTimeout(timer)
      }

      if (res === null || res.status === 429 || res.status >= 500) {
        attempt += 1
        if (attempt > 6) {
          if (res === null) throw new Error(`ClickUp request timed out on ${path}`)
          const text = await res.text().catch(() => '')
          throw new ClickUpError(res.status, text, path)
        }
        const retryAfter = res ? Number(res.headers.get('retry-after') ?? '0') : 0
        const waitMs = retryAfter > 0 ? retryAfter * 1000 : Math.min(8000, 2 ** attempt * 400)
        await new Promise((r) => setTimeout(r, waitMs))
        continue
      }

      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new ClickUpError(res.status, text, path)
      }

      return (await res.json()) as T
    }
  }

  getAuthorizedTeams(): Promise<{ teams: ClickUpTeam[] }> {
    return this.request('/team')
  }

  /** Discover which workspaces this token can access. */
  async getAuthorizedUser(): Promise<{ user: { id: number; username: string; email: string } }> {
    return this.request('/user')
  }

  getSpaces(teamId: string): Promise<{ spaces: ClickUpSpace[] }> {
    return this.request(`/team/${teamId}/space`, { query: { archived: false } })
  }

  getFolders(spaceId: string): Promise<{ folders: ClickUpFolder[] }> {
    return this.request(`/space/${spaceId}/folder`, { query: { archived: false } })
  }

  getFolderlessLists(spaceId: string): Promise<{ lists: ClickUpList[] }> {
    return this.request(`/space/${spaceId}/list`, { query: { archived: false } })
  }

  getLists(folderId: string): Promise<{ lists: ClickUpList[] }> {
    return this.request(`/folder/${folderId}/list`, { query: { archived: false } })
  }

  getCustomFields(listId: string): Promise<{ fields: ClickUpCustomField[] }> {
    return this.request(`/list/${listId}/field`)
  }

  /** Get tasks for a list, one page at a time (100 per page). */
  getTasks(listId: string, page = 0): Promise<{ tasks: ClickUpTask[]; last_page?: boolean }> {
    return this.request(`/list/${listId}/task`, {
      query: { page, subtasks: true, include_closed: true },
    })
  }

  /** Iterate all tasks for a list, following pagination. */
  async *iterateTasks(listId: string): AsyncGenerator<ClickUpTask> {
    for (let page = 0; page < 500; page += 1) {
      const { tasks, last_page } = await this.getTasks(listId, page)
      for (const t of tasks) yield t
      if (last_page || tasks.length === 0) break
    }
  }

  /** Views defined at the Space level (saved Views). */
  getViews(spaceId: string): Promise<{ views: ClickUpView[] }> {
    return this.request(`/space/${spaceId}/view`)
  }

  /** Goals for a workspace (used as an insight signal only). */
  getGoals(teamId: string): Promise<{ goals: ClickUpGoal[] }> {
    return this.request(`/team/${teamId}/goal`)
  }

  /** Custom Task Types for a workspace (insight signal only). */
  getCustomTaskTypes(teamId: string): Promise<{ custom_items: ClickUpCustomItem[] }> {
    return this.request(`/team/${teamId}/custom_item`)
  }

  /** Comments on a task (sampled — one call per task). */
  getTaskComments(taskId: string): Promise<{ comments: ClickUpComment[] }> {
    return this.request(`/task/${taskId}/comment`)
  }

  /** Create a task in a List (used for lead capture into the Sharpflow CRM). */
  createTask(listId: string, payload: { name: string; markdown_description?: string; description?: string }): Promise<{ id: string }> {
    return this.request(`/list/${listId}/task`, { method: 'POST', body: payload })
  }
}
