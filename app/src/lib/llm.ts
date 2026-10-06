/**
 * LLM layer — explains the deterministic engine's results.
 * The model NEVER computes or changes scores; it only turns the structured
 * findings/metrics into a plain-English executive summary.
 */

interface SummaryInput {
  workspace: string
  overall: number
  grade: string
  categories: { name: string; score: number }[]
  findings: { title: string; severity: string; metric: string; metricLabel: string }[]
  performingWell: { title: string }[]
}

const SYSTEM = [
  'You are the reporting assistant for Sharpflow ClickUp Health.',
  'You receive a workspace health report that has ALREADY been calculated by a deterministic engine.',
  'Write a concise executive summary for a business owner.',
  'Rules: never invent numbers — only use the values provided; never change or re-derive the scores;',
  'be specific about the biggest risks and the strongest areas; keep it plain, business-friendly English.',
  'Return 3 to 4 short paragraphs, separated by blank lines, with no headings, bullets or markdown.',
].join(' ')

function buildPrompt(input: SummaryInput): string {
  const categories = input.categories.map((c) => `${c.name}: ${c.score}/100`).join('\n')
  const findings = input.findings
    .slice(0, 8)
    .map((f) => `- [${f.severity}] ${f.title}: ${f.metric} (${f.metricLabel})`)
    .join('\n')
  const strengths = input.performingWell.map((p) => `- ${p.title}`).join('\n')

  return [
    `Workspace: ${input.workspace}`,
    `Overall Health Score: ${input.overall}/100 (Grade ${input.grade})`,
    '',
    'Category scores:',
    categories,
    '',
    'Findings:',
    findings || '(none)',
    '',
    'Strengths:',
    strengths || '(none)',
    '',
    'Write the executive summary.',
  ].join('\n')
}

/** Returns the summary as an array of paragraphs. Throws on failure. */
export async function generateExecutiveSummary(input: SummaryInput): Promise<string[]> {
  const apiKey = process.env.LLM_API_KEY
  if (!apiKey) throw new Error('LLM_API_KEY is not set')
  const model = process.env.LLM_MODEL ?? 'claude-haiku-4-5-20251001'

  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
  }
  // User-scoped Anthropic keys require a workspace id header.
  if (process.env.LLM_WORKSPACE_ID) headers['anthropic-workspace-id'] = process.env.LLM_WORKSPACE_ID

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      max_tokens: 700,
      system: SYSTEM,
      messages: [{ role: 'user', content: buildPrompt(input) }],
    }),
  })

  if (!res.ok) {
    throw new Error(`Anthropic ${res.status}: ${(await res.text().catch(() => '')).slice(0, 200)}`)
  }

  const data = (await res.json()) as { content?: { text?: string }[] }
  const text = (data.content?.[0]?.text ?? '').trim()
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
}
