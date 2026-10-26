export interface RateLimitInfo {
  limit: number
  remaining?: number
  reset?: number
  updatedAt: number
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, Math.max(1, ms)))

export class RateGovernor {
  private limit: number
  private tokens: number
  private lastRefill: number
  private pausedUntil = 0
  private info: RateLimitInfo

  constructor(initialLimit = Number(process.env.CLICKUP_RATE_LIMIT ?? 1000)) {
    this.limit = Math.max(1, initialLimit)
    this.tokens = this.limit
    this.lastRefill = Date.now()
    this.info = { limit: this.limit, updatedAt: Date.now() }
  }

  getInfo(): RateLimitInfo {
    return { ...this.info }
  }

  setLimit(limit: number) {
    if (!Number.isFinite(limit) || limit <= 0) return
    if (limit === this.limit) return
    this.limit = limit
    this.tokens = Math.min(this.tokens, limit)
    this.lastRefill = Date.now()
    this.info = { ...this.info, limit, updatedAt: Date.now() }
  }

  updateFromHeaders(headers: Headers) {
    const limit = Number(headers.get('x-ratelimit-limit') ?? 0)
    const remaining = Number(headers.get('x-ratelimit-remaining') ?? NaN)
    const reset = Number(headers.get('x-ratelimit-reset') ?? 0)
    if (limit > 0) this.setLimit(limit)
    this.info = {
      limit: this.limit,
      remaining: Number.isFinite(remaining) ? remaining : this.info.remaining,
      reset: reset > 0 ? reset : this.info.reset,
      updatedAt: Date.now(),
    }
  }

  pause(seconds: number) {
    if (!Number.isFinite(seconds) || seconds <= 0) return
    this.pausedUntil = Math.max(this.pausedUntil, Date.now() + seconds * 1000)
  }

  private refill(now: number) {
    const ratePerMs = (this.limit * 0.9) / 60_000
    const elapsed = Math.max(0, now - this.lastRefill)
    this.tokens = Math.min(this.limit, this.tokens + elapsed * ratePerMs)
    this.lastRefill = now
  }

  async acquire(): Promise<void> {
    while (true) {
      const now = Date.now()
      if (now < this.pausedUntil) {
        await sleep(this.pausedUntil - now)
        continue
      }
      this.refill(now)
      if (this.tokens >= 1) {
        this.tokens -= 1
        return
      }
      const ratePerMs = (this.limit * 0.9) / 60_000
      const waitMs = Math.max(5, (1 - this.tokens) / ratePerMs)
      await sleep(waitMs)
    }
  }
}

export async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (!items.length) return []
  const results = new Array<R>(items.length)
  let next = 0
  const workers = Array.from({ length: Math.min(Math.max(1, concurrency), items.length) }, async () => {
    while (true) {
      const index = next
      next += 1
      if (index >= items.length) return
      results[index] = await worker(items[index], index)
    }
  })
  await Promise.all(workers)
  return results
}
