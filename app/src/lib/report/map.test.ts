import { describe, expect, it } from 'vitest'
import { evaluate } from '../scoring/engine'
import { toScanResult } from './map'

const workspace = {
  name: 'Test Workspace',
  plan: 'Business Plus',
  members: 42,
  spaces: 6,
  folders: 31,
  lists: 214,
  activeTasks: 14217,
}

function build(metrics: Record<string, number>) {
  const engine = evaluate(metrics)
  return toScanResult({
    id: 'test',
    workspace,
    engine,
    metrics,
    utilisation: [],
    scannedAt: 'just now',
  })
}

describe('why-score mapping', () => {
  it('keeps the deterministic score unchanged', () => {
    const metrics = { overdueRate: 0.4, stale90PlusPct: 0.2, wipPerPerson: 20 }
    const engine = evaluate(metrics)
    const result = build(metrics)
    expect(result.overallScore).toBe(engine.overall)
    expect(result.categories.map((c) => c.score)).toEqual(engine.categories.map((c) => c.score))
  })

  it('creates signal explanations and a category impact from the engine', () => {
    const result = build({ overdueRate: 0.4, stale90PlusPct: 0.2, wipPerPerson: 20 })
    const operational = result.categories.find((c) => c.key === 'operational')!
    const overdue = operational.explainers!.find((e) => e.key === 'overdue_rate')!

    expect(operational.overallImpact).toBeGreaterThan(0)
    expect(operational.explainers).toHaveLength(7)
    expect(overdue.status).toBe('above')
    expect(overdue.severity).toBe('critical')
    expect(overdue.categoryPoints).toBeGreaterThan(0)
    expect(overdue.why.length).toBeGreaterThan(0)
    expect(overdue.good.length).toBeGreaterThan(0)
  })

  it('adds target, good copy and impact to findings', () => {
    const result = build({ overdueRate: 0.4, stale90PlusPct: 0.2, wipPerPerson: 20 })
    const finding = result.findings.find((f) => f.id === 'overdue_rate')!

    expect(finding.target).toBeTruthy()
    expect(finding.good).toBeTruthy()
    expect(finding.impact).toContain('overall points')
  })

  it('marks unmeasured categories honestly', () => {
    const result = build({})
    const operational = result.categories.find((c) => c.key === 'operational')!
    expect(operational.scored).toBe(false)
    expect(operational.explainers!.every((e) => e.status === 'not_measured')).toBe(true)
  })
})
