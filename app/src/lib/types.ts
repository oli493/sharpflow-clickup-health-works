export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'opportunity'
export type Tone = 'up' | 'down' | 'neutral'
export type UtilStatus = 'detected' | 'partial' | 'not_measurable'

export interface CategoryMetric {
  label: string
  value: string
  tone?: Tone
  drill?: string
}

export interface CategoryResult {
  key: string
  name: string
  score: number
  scored: boolean
  blurb: string
  metrics: CategoryMetric[]
}

export interface FindingResult {
  id: string
  title: string
  category: string
  severity: Severity
  metric: string
  metricLabel: string
  explanation: string
  recommendation: string
  affected?: string
  drill?: string
}

export interface DrillColumn {
  key: string
  label: string
  align?: 'right'
}

export type DrillRow = Record<string, string | number>

export interface DrillDataset {
  key: string
  title: string
  subtitle: string
  unit: string
  columns: DrillColumn[]
  rows: DrillRow[]
}

export interface ScanResult {
  id: string
  workspaceName: string
  plan: string
  members: number
  spaces: number
  folders: number
  lists: number
  activeTasks: number
  scannedAt: string
  overallScore: number
  overallGrade: string
  summaryHeadline: string
  summaryBody: string
  projectedScore: number
  categories: CategoryResult[]
  findingsSummary: { critical: number; high: number; opportunity: number; total: number }
  findings: FindingResult[]
  coverage: { scored: number; total: number }
  /** True when the connecting user is not an Owner/Admin, so visibility is limited. */
  coverageLimited: boolean
  performingWell: { title: string; detail: string }[]
  utilisation: { capability: string; status: UtilStatus; detail: string }[]
  aiSummary: string[]
  rules: { name: string; condition: string; threshold: string; severity: string; weight: string }[]
}

export interface ScanStatus {
  id: string
  status: 'queued' | 'running' | 'complete' | 'failed'
  progress: number
  stage: string
  result?: ScanResult
  error?: string
}
