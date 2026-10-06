import { describe, expect, it } from 'vitest'
import { evaluate, grade, severityFor } from './engine'
import { CATEGORIES } from './model'

const overdueSignal = CATEGORIES.find((c) => c.key === 'operational')!.signals.find((s) => s.key === 'overdue_rate')!

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

describe('category + overall scoring', () => {
  const healthy = {
    avgTasksPerList: 30,
    dormantListsPct: 0,
    fragmentedListsPct: 0,
    emptyFoldersPct: 0,
    statusesPerWorkflow: 6,
    unusedStatuses: 0,
    duplicateStatusNames: 0,
    avgTimeInStatusDays: 3,
    customFieldCount: 40,
    cfCompletionPct: 0.9,
    cfZeroFilledPct: 0,
    missingRequiredCfPct: 0,
    overdueRate: 0.02,
    staleRate: 0.01,
    openSubtasksUnderClosedPct: 0,
    creationMinusCompletion: -50,
    wipPerPerson: 4,
    inactiveMemberPct: 0.02,
    guestRatio: 0.05,
    activityConcentration: 0.3,
    commentsPerUserPerWeek: 4,
    dormantSpaces: 0,
    timeTrackedPct: 0.5,
    viewsPerSpace: 5,
    dependenciesUsed: 10,
    dueDateCoverage: 0.98,
    ownershipCoverage: 0.97,
    estimateCoverage: 0.8,
    distinctWorkflows: 2,
  }

  it('a fully healthy workspace scores 100 overall', () => {
    const res = evaluate(healthy)
    expect(res.overall).toBe(100)
    expect(res.grade).toBe('A')
  })

  it('a worsening workspace produces findings and lowers the score', () => {
    const res = evaluate({ ...healthy, overdueRate: 0.4, staleRate: 0.5, cfCompletionPct: 0.2 })
    expect(res.findings.length).toBeGreaterThan(0)
    expect(res.overall).toBeLessThan(100)
  })

  it('overall is the weight-weighted average of category scores', () => {
    const res = evaluate(healthy)
    const weightSum = res.categories.reduce((s, c) => s + c.weight, 0)
    const expected = Math.round(res.categories.reduce((s, c) => s + c.weight * c.score, 0) / weightSum)
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

const HEALTHY: Record<string, number> = {
  avgTasksPerList: 30,
  dormantListsPct: 0,
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
  staleRate: 0.01,
  openSubtasksUnderClosedPct: 0,
  creationMinusCompletion: -50,
  wipPerPerson: 4,
  inactiveMemberPct: 0.02,
  guestRatio: 0.05,
  activityConcentration: 0.3,
  commentsPerUserPerWeek: 4,
  dormantSpaces: 0,
  timeTrackedPct: 0.5,
  viewsPerSpace: 5,
  dependenciesUsed: 10,
  dueDateCoverage: 0.98,
  ownershipCoverage: 0.97,
  estimateCoverage: 0.8,
  distinctWorkflows: 2,
}

describe('platform utilisation — time-tracking band (< 5% Opportunity)', () => {
  const sig = CATEGORIES.find((c) => c.key === 'utilisation')!.signals.find((s) => s.key === 'time_tracking')!
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
    expect(keysFor({ dormantSpaces: 2 })).toContain('dormant_spaces')
  })
  it('too few Views per Space', () => {
    expect(keysFor({ viewsPerSpace: 1 })).toContain('views')
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
