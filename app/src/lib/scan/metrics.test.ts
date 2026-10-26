import { describe, expect, it } from 'vitest'
import {
  DAY_MS,
  activityConcentration,
  commentRate,
  dormantStats,
  fieldInventory,
  listCoverage,
  openTaskCoverage,
  timeTrackingCoverage,
  workflowStats,
} from './metrics'

describe('open task coverage', () => {
  it('uses open tasks, not all tasks', () => {
    const result = openTaskCoverage({
      openTasks: 2,
      openNoDue: 1,
      openNoAssignee: 1,
      openWithEstimate: 1,
    })
    expect(result.dueDateCoverage).toBeCloseTo(0.5)
    expect(result.ownershipCoverage).toBeCloseTo(0.5)
    expect(result.estimateCoverage).toBeCloseTo(0.5)
  })

  it('returns undefined when there are no open tasks', () => {
    expect(
      openTaskCoverage({ openTasks: 0, openNoDue: 0, openNoAssignee: 0, openWithEstimate: 0 }),
    ).toEqual({})
  })
})

describe('dormant items', () => {
  const now = Date.UTC(2026, 9, 26)

  it('does not treat a new empty List as dormant', () => {
    const stats = dormantStats(
      [
        {
          id: 'l1',
          name: 'New List',
          spaceId: 's1',
          spaceName: 'Space',
          tasks: 0,
          openTasks: 0,
          overdue: 0,
          createdAt: now - 5 * DAY_MS,
        },
      ],
      [],
      now,
    )
    expect(stats.dormantList90).toBe(0)
    expect(stats.emptyLists).toBe(1)
  })

  it('treats an old empty List as dormant', () => {
    const stats = dormantStats(
      [
        {
          id: 'l1',
          name: 'Old List',
          spaceId: 's1',
          spaceName: 'Space',
          tasks: 0,
          openTasks: 0,
          overdue: 0,
          createdAt: now - 120 * DAY_MS,
        },
      ],
      [],
      now,
    )
    expect(stats.dormantList90).toBe(1)
  })

  it('treats a new empty Space as not dormant', () => {
    const stats = dormantStats(
      [],
      [{ id: 's1', name: 'New Space', tasks: 0, createdAt: now - 2 * DAY_MS }],
      now,
    )
    expect(stats.dormantSpaces).toBe(0)
    expect(stats.emptySpaces).toBe(1)
  })
})

describe('workflow signatures', () => {
  const statuses = [
    { status: 'To Do', type: 'open' },
    { status: 'Done', type: 'closed' },
  ]

  it('counts identical workflows once, not per Space', () => {
    const spaces = Array.from({ length: 10 }, (_, index) => ({
      id: `s${index}`,
      name: `Space ${index}`,
      statuses,
    }))
    const stats = workflowStats(spaces, {})
    expect(stats.distinctWorkflows).toBe(1)
    expect(stats.statusesPerWorkflow).toBe(2)
    expect(stats.unusedStatuses).toBe(2)
  })

  it('counts different status sets separately', () => {
    const stats = workflowStats(
      [
        { id: 's1', name: 'One', statuses },
        { id: 's2', name: 'Two', statuses: [{ status: 'Open', type: 'open' }] },
      ],
      {},
    )
    expect(stats.distinctWorkflows).toBe(2)
  })

  it('counts a status used in any Space of a workflow as used', () => {
    const spaces = [
      { id: 's1', name: 'One', statuses },
      { id: 's2', name: 'Two', statuses },
    ]
    const stats = workflowStats(spaces, {
      s1: { 'To Do': 3, Done: 1 },
      s2: { 'To Do': 2 },
    })
    expect(stats.unusedStatuses).toBe(0)
  })

  it('reports the worst workflow, not the sum across workflows', () => {
    const stats = workflowStats(
      [
        { id: 's1', name: 'One', statuses },
        { id: 's2', name: 'Two', statuses: [{ status: 'Open', type: 'open' }] },
      ],
      {},
    )
    expect(stats.unusedStatuses).toBe(2)
  })
})

describe('custom field inventory', () => {
  it('counts configured fields that never appear on tasks', () => {
    const definitions = Array.from({ length: 200 }, (_, index) => ({
      id: `f${index}`,
      name: `Field ${index}`,
      type: 'text',
      scope: 'List',
    }))
    const stats = definitions.slice(0, 5).map((definition) => ({
      id: definition.id,
      filled: 1,
      slots: 1,
    }))
    const audit = fieldInventory(definitions, stats)
    expect(audit.customFieldCount).toBe(200)
    expect(audit.cfZeroFilledPct).toBeCloseTo(195 / 200)
    expect(audit.rows.filter((row) => row.status === 'Never filled')).toHaveLength(195)
  })
})

describe('activity and coverage helpers', () => {
  it('calculates comment rate from the 30-day sample', () => {
    expect(commentRate(20, 2)).toBeCloseTo(20 / 2 / (30 / 7))
    expect(commentRate(0, 0)).toBeUndefined()
  })

  it('calculates activity concentration from recent activity', () => {
    expect(activityConcentration({ a: 1, b: 9 })).toBeCloseTo(0.9)
    expect(activityConcentration({ a: 0, b: 0 })).toBeUndefined()
  })

  it('flags list sampling when the cap is exceeded', () => {
    expect(listCoverage(1500, 1000)).toEqual({
      listsTotal: 1500,
      listsScanned: 1000,
      sampled: true,
      pct: 1000 / 1500,
    })
  })

  it('marks time tracking as 90d when the endpoint returns data', () => {
    expect(timeTrackingCoverage(10, 100, 20)).toEqual({
      timeTrackedPct: 0.1,
      measured: true,
      source: '90d',
    })
  })

  it('falls back when the time endpoint is unavailable', () => {
    expect(timeTrackingCoverage(undefined, 100, 20)).toEqual({
      timeTrackedPct: 0.2,
      measured: false,
      source: 'fallback',
    })
  })
})
