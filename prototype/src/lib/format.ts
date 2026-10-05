export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}

export type Band = {
  color: string
  soft: string
  label: string
  grade: string
}

export function scoreBand(score: number): Band {
  if (score >= 85)
    return { color: '#46E0A0', soft: 'rgba(70,224,160,0.16)', label: 'Excellent', grade: 'A' }
  if (score >= 75)
    return { color: '#7DE2B0', soft: 'rgba(125,226,176,0.16)', label: 'Good', grade: 'B' }
  if (score >= 60)
    return { color: '#FFD166', soft: 'rgba(255,209,102,0.16)', label: 'Fair', grade: 'C' }
  if (score >= 45)
    return { color: '#FF9F45', soft: 'rgba(255,159,69,0.16)', label: 'Weak', grade: 'D' }
  return { color: '#FF5C6C', soft: 'rgba(255,92,108,0.16)', label: 'Critical', grade: 'F' }
}

export const severityMeta: Record<
  string,
  { label: string; color: string; soft: string }
> = {
  critical: { label: 'Critical', color: '#FF5C6C', soft: 'rgba(255,92,108,0.14)' },
  high: { label: 'High', color: '#FF9F45', soft: 'rgba(255,159,69,0.14)' },
  medium: { label: 'Medium', color: '#FFD166', soft: 'rgba(255,209,102,0.14)' },
  low: { label: 'Low', color: '#6FB8FF', soft: 'rgba(111,184,255,0.14)' },
  opportunity: { label: 'Opportunity', color: '#7DE2B0', soft: 'rgba(125,226,176,0.14)' },
}

export const utilisationMeta: Record<
  string,
  { label: string; color: string; symbol: string }
> = {
  detected: { label: 'Detected', color: '#46E0A0', symbol: '✓' },
  partial: { label: 'Partial', color: '#FFD166', symbol: '~' },
  not_measurable: { label: 'Not measurable', color: '#6E6C88', symbol: '×' },
}
