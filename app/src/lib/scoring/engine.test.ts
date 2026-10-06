import { describe, expect, it } from 'vitest'
import { evaluate, grade, magnitudeFor, severityFor } from './engine'
import { CATEGORIES } from './model'

const signal = (cat: string, key: string) => CATEGORIES.find((c) => c.key === cat)!.signals.find((s) => s.key === key)!
const overdueSignal = signal('operational', 'overdue_rate')

describe('overdue tiering (Oli: >15% High / >30% Critical)', () => {
  it('flags Critical above 30%', () => {
    expect(severityFor(overdueSignal, 0.31)).toBe('critical')
  })
  it('flags High between 15% and 30%', () => {
    expect(severityFor(overdueSignal, 0.2)).toBe('high')
  })
  it('does not flag at 15% or below', () => {
    expect(severityFor(overdueSignal, 0.15)).toBeNull()
    expect(severityFor(overdueSignal, 0.1)).toBeNull()
  })
})

describe('tiered stale + dormant (Oli sign-off: 30/60/90 → Low/Medium/High)', () => {
  it('stale 30-60d is Low, 60-90d is Medium, 90d+ is High', () => {
    expect(signal('operational', 'stale_30_60').bands[0].severity).toBe('low')
    expect(signal('operational', 'stale_60_90').bands[0].severity).toBe('medium')
    expect(signal('operational', 'stale_90plus').bands[0].severity).toBe('high')
  })
  it('dormant Lists 60-90d is Medium, 90d+ is High', () => {
    expect(signal('architecture', 'dormant_list_60').bands[0].severity).toBe('medium')
    expect(signal('architecture', 'dormant_list_90').bands[0].severity).toBe('high')
  })
})

describe('magnitude scaling', () => {
  it('deducts 50% of severity at the threshold and 100% at the ceiling', () => {
    // overdue: threshold 15%, ceiling 50%
    expect(magnitudeFor(overdueSignal, 0.15)).toBeCloseTo(0.5, 2)
    expect(magnitudeFor(overdueSignal, 0.325)).toBeCloseTo(0.75, 2)
    expect(magnitudeFor(overdueSignal, 0.5)).toBeCloseTo(1, 2)
    expect(magnitudeFor(overdueSignal, 0.9)).toBeCloseTo(1, 2) // capped
  })
  it('uses the floor for lower-is-worse signals', () => {
    // cf completion: threshold 50%, floor 10%
    const cf = signal('governance', 'cf_completion')
    expect(magnitudeFor(cf, 0.5)).toBeCloseTo(0.5, 2)
    expect(magnitudeFor(cf, 0.3)).toBeCloseTo(0.75, 2)
    expect(magnitudeFor(cf, 0.1)).toBeCloseTo(1, 2)
  })
  it('a worse value deducts more of the category than a marginal one', () => {
    const marginal = evaluate({ overdueRate: 0.16 })
    const severe = evaluate({ overdueRate: 0.45 })
    const a = marginal.categories.find((c) => c.key === 'operational')!.score
    const b = severe.categories.find((c) => c.key === 'operational')!.score
    expect(b).toBeLessThan(a)
  })
})

describe('no double-counting', () => {
  const operational = CATEGORIES.find((c) => c.key === 'operational')!
  const utilisation = CATEGORIES.find((c) => c.key === 'utilisation')!
  const reporting = CATEGORIES.find((c) => c.key === 'reporting')!

  it('due-date coverage is scored only in Reporting', () => {
    expect(operational.signals.some((s) => s.metricKey === 'dueDateCoverage')).toBe(false)
    expect(reporting.signals.some((s) => s.metricKey === 'dueDateCoverage')).toBe(true)
  })
  it('estimate coverage is scored only in Reporting', () => {
    expect(utilisation.signals.some((s) => s.metricKey === 'estimateCoverage' && !s.insightOnly)).toBe(false)
    expect(reporting.signals.some((s) => s.metricKey === 'estimateCoverage')).toBe(true)
  })
})

describe('opportunity findings carry no score penalty', () => {
  it('time tracking at 0 logs stays Opportunity and does not lower the category', () => {
    const res = evaluate({ timeTrackedPct: 0 })
    const utilisation = res.categories.find((c) => c.key === 'utilisation')!
    const finding = res.findings.find((f) => f.signalKey === 'time_tracking')
    expect(finding?.severity).toBe('opportunity')
    expect(utilisation.score).toBe(100)
  })
})

const HEALTHY: Record<string, number> = {
  avgTasksPerList: 30,
  dormantList60to90Pct: 0,
  dormantList90PlusPct: 0,
  fragmentedListsPct: 0,
  emptyFoldersPct: 0,
  statusesPerWorkflow: 6,
  unusedStatuses: 0,
  duplicateStatusNames: 0,
  customFieldCount: 40,
  cfCompletionPct: 0.9,
  cfZeroFilledPct: 0,
  missingRequiredCfPct: 0,
  overdueRate: 0.02,
  stale30to60Pct: 0,
  stale60to90Pct: 0,
  stale90PlusPct: 0,
  openSubtasksUnderClosedPct: 0,
  creationVsCompletionPct: -0.1,
  wipPerPerson: 4,
  inactiveMemberPct: 0.02,
  guestRatio: 0.05,
  activityConcentration: 0.3,
  commentsPerUserPerWeek: 4,
  dormantSpacesPct: 0,
  timeTrackedPct: 0.5,
  viewsPerSpace: 5,
  dependenciesUsed: 10,
  dueDateCoverage: 0.98,
  ownershipCoverage: 0.97,
  estimateCoverage: 0.8,
  distinctWorkflows: 2,
}

describe('category + overall scoring', () => {
  it('a fully healthy workspace scores 100 overall', () => {
    const res = evaluate(HEALTHY)
    expect(res.overall).toBe(100)
    expect(res.grade).toBe('A')
  })

  it('a worsening workspace produces findings and lowers the score', () => {
    const res = evaluate({ ...HEALTHY, overdueRate: 0.4, stale90PlusPct: 0.5, cfCompletionPct: 0.2 })
    expect(res.findings.length).toBeGreaterThan(0)
    expect(res.overall).toBeLessThan(100)
  })

  it('overall is the weight-weighted average of category scores', () => {
    const res = evaluate(HEALTHY)
    const scored = res.categories.filter((c) => c.scored)
    const weightSum = scored.reduce((s, c) => s + c.weight, 0)
    const expected = Math.round(scored.reduce((s, c) => s + c.weight * c.score, 0) / weightSum)
    expect(res.overall).toBe(expected)
  })
})

describe('grade bands', () => {
  it('maps scores to grades', () => {
    expect(grade(90)).toBe('A')
    expect(grade(80)).toBe('B')
    expect(grade(70)).toBe('C')
    expect(grade(50)).toBe('D')
    expect(grade(40)).toBe('F')
  })
})

describe('platform utilisation — time-tracking band (< 5% Opportunity)', () => {
  const sig = signal('utilisation', 'time_tracking')
  it('flags light time tracking as Opportunity', () => {
    expect(severityFor(sig, 0)).toBe('opportunity')
    expect(severityFor(sig, 0.03)).toBe('opportunity')
  })
  it('does not flag once 5% or more is logged', () => {
    expect(severityFor(sig, 0.05)).toBeNull()
    expect(severityFor(sig, 0.4)).toBeNull()
  })
})

describe('newly-measured signals produce findings', () => {
  const keysFor = (m: Record<string, number>) => evaluate({ ...HEALTHY, ...m }).findings.map((f) => f.signalKey)
  it('duplicate status names', () => {
    expect(keysFor({ duplicateStatusNames: 2 })).toContain('duplicate_statuses')
  })
  it('missing required Custom Fields', () => {
    expect(keysFor({ missingRequiredCfPct: 0.4 })).toContain('missing_required_cf')
  })
  it('open subtasks under closed parents', () => {
    expect(keysFor({ openSubtasksUnderClosedPct: 0.1 })).toContain('subtasks_under_closed')
  })
  it('inactive members', () => {
    expect(keysFor({ inactiveMemberPct: 0.5 })).toContain('inactive_members')
  })
  it('dormant Spaces', () => {
    expect(keysFor({ dormantSpacesPct: 0.1 })).toContain('dormant_spaces')
  })
  it('too few Views per Space', () => {
    expect(keysFor({ viewsPerSpace: 1 })).toContain('views')
  })
  it('stale tasks 90d+', () => {
    expect(keysFor({ stale90PlusPct: 0.3 })).toContain('stale_90plus')
  })
})

describe('adoption is scored once its signals are measurable', () => {
  it('reaches full 7/7 category coverage with complete metrics', () => {
    const res = evaluate(HEALTHY)
    const adoption = res.categories.find((c) => c.key === 'adoption')!
    expect(adoption.scored).toBe(true)
    expect(res.coverage.scored).toBe(7)
    expect(res.coverage.total).toBe(7)
  })
})
