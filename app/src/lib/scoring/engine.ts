import { CATEGORIES, SEVERITY_PENALTY, type Severity, type Signal, type SignalBand } from './model'

export interface Metrics {
  [metricKey: string]: number | undefined
}

export interface Finding {
  signalKey: string
  categoryKey: string
  categoryName: string
  title: string
  severity: Severity
  metricValue: number
  threshold: string
}

export interface CategoryScore {
  key: string
  name: string
  weight: number
  score: number
  findings: Finding[]
}

export interface ScoreResult {
  overall: number
  grade: string
  categories: CategoryScore[]
  findings: Finding[]
}

function matches(band: SignalBand, value: number): boolean {
  switch (band.cmp) {
    case '>':
      return value > band.value
    case '>=':
      return value >= band.value
    case '<':
      return value < band.value
    case '<=':
      return value <= band.value
  }
}

export function severityFor(signal: Signal, value: number): Severity | null {
  for (const band of signal.bands) if (matches(band, value)) return band.severity
  return null
}

export function grade(score: number): string {
  if (score >= 85) return 'A'
  if (score >= 75) return 'B'
  if (score >= 60) return 'C'
  if (score >= 45) return 'D'
  return 'F'
}

/**
 * Deterministic scoring: metrics → findings → category scores → overall.
 * The LLM never touches these numbers.
 */
export function evaluate(metrics: Metrics): ScoreResult {
  const categories: CategoryScore[] = []
  const findings: Finding[] = []

  for (const cat of CATEGORIES) {
    let weighted = 0
    let totalWeight = 0

    for (const sig of cat.signals) {
      const value = metrics[sig.metricKey]
      if (value === undefined || Number.isNaN(value)) continue

      const sev = severityFor(sig, value)
      if (sev) {
        findings.push({
          signalKey: sig.key,
          categoryKey: cat.key,
          categoryName: cat.name,
          title: sig.name,
          severity: sev,
          metricValue: value,
          threshold: sig.threshold,
        })
      }

      if (sig.insightOnly || sig.weight === 0) continue
      const health = 1 - (sev ? SEVERITY_PENALTY[sev] : 0)
      weighted += sig.weight * health
      totalWeight += sig.weight
    }

    const score = totalWeight > 0 ? Math.round((weighted / totalWeight) * 100) : 100
    categories.push({
      key: cat.key,
      name: cat.name,
      weight: cat.weight,
      score,
      findings: findings.filter((f) => f.categoryKey === cat.key),
    })
  }

  const weightSum = categories.reduce((s, c) => s + c.weight, 0)
  const overall = Math.round(categories.reduce((s, c) => s + c.weight * c.score, 0) / weightSum)

  return { overall, grade: grade(overall), categories, findings }
}
