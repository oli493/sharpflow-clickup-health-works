import { describe, expect, it } from 'vitest'
import { RateGovernor, mapWithConcurrency } from './concurrency'

describe('mapWithConcurrency', () => {
  it('preserves order while limiting concurrency', async () => {
    let active = 0
    let peak = 0
    const result = await mapWithConcurrency([1, 2, 3, 4, 5, 6], 2, async (value) => {
      active += 1
      peak = Math.max(peak, active)
      await new Promise((resolve) => setTimeout(resolve, 5))
      active -= 1
      return value * 2
    })
    expect(result).toEqual([2, 4, 6, 8, 10, 12])
    expect(peak).toBeLessThanOrEqual(2)
  })

  it('handles an empty list', async () => {
    await expect(mapWithConcurrency([], 4, async (value) => value)).resolves.toEqual([])
  })
})

describe('RateGovernor', () => {
  it('updates the limit from ClickUp headers', () => {
    const governor = new RateGovernor(100)
    const headers = new Headers({
      'x-ratelimit-limit': '1000',
      'x-ratelimit-remaining': '900',
    })
    governor.updateFromHeaders(headers)
    expect(governor.getInfo().limit).toBe(1000)
    expect(governor.getInfo().remaining).toBe(900)
  })

  it('ignores invalid limits', () => {
    const governor = new RateGovernor(100)
    governor.setLimit(0)
    expect(governor.getInfo().limit).toBe(100)
  })
})
