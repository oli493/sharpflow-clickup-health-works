import type { DrillDataset, ScanStatus } from './types'
import { MOCK_SCAN, getMockDrill } from './mock/scan'

/**
 * Mock mode: on by default in development, off in production.
 * Force it with NEXT_PUBLIC_MOCK=1 (on) or =0 (off).
 */
export const IS_MOCK =
  process.env.NEXT_PUBLIC_MOCK !== undefined
    ? process.env.NEXT_PUBLIC_MOCK === '1'
    : process.env.NODE_ENV !== 'production'

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`${res.status}: ${(await res.text().catch(() => '')).slice(0, 200)}`)
  return (await res.json()) as T
}

export interface ConnectionSummary {
  id: string
  clickup_username?: string
  clickup_email?: string
  workspaces: { id: string; name: string }[]
}

export async function getConnection(id: string): Promise<ConnectionSummary> {
  if (IS_MOCK) {
    return { id, workspaces: [{ id: 'demo', name: 'Northwind Creative' }] }
  }
  const res = await fetch(`/api/connections/${id}`, { cache: 'no-store' })
  return json<ConnectionSummary>(res)
}

export interface SpaceSummary {
  id: string
  name: string
}

export async function getConnectionSpaces(id: string, teamId: string): Promise<SpaceSummary[]> {
  if (IS_MOCK) {
    return [
      { id: 'demo-1', name: 'Studio Ops' },
      { id: 'demo-2', name: 'Client Delivery' },
      { id: 'demo-3', name: 'Template Library' },
    ]
  }
  const res = await fetch(`/api/connections/${id}/spaces?teamId=${encodeURIComponent(teamId)}`, { cache: 'no-store' })
  const data = await json<{ spaces: SpaceSummary[] }>(res)
  return data.spaces ?? []
}

export async function createScan(input: {
  connectionId: string
  teamId: string
  workspaceName?: string
  excludeSpaceIds?: string[]
}): Promise<{ id: string }> {
  if (IS_MOCK) return { id: 'mock' }
  const res = await fetch('/api/scans', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return json<{ id: string }>(res)
}

export async function getScanStatus(id: string): Promise<ScanStatus> {
  if (IS_MOCK) {
    return { id, status: 'complete', progress: 100, stage: 'Report ready', result: MOCK_SCAN }
  }
  const res = await fetch(`/api/scans/${id}`, { cache: 'no-store' })
  return json<ScanStatus>(res)
}

export async function getDrill(scanId: string, key: string): Promise<DrillDataset> {
  if (IS_MOCK) return getMockDrill(key)
  const res = await fetch(`/api/scans/${scanId}/drill/${encodeURIComponent(key)}`, { cache: 'no-store' })
  return json<DrillDataset>(res)
}

export async function getSummary(scanId: string): Promise<string[]> {
  if (IS_MOCK) return MOCK_SCAN.aiSummary
  const res = await fetch(`/api/scans/${scanId}/summary`, { cache: 'no-store' })
  const data = await json<{ summary: string[] }>(res)
  return data.summary
}

export async function postLead(scanId: string, email: string): Promise<void> {
  if (IS_MOCK) return
  await fetch('/api/leads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scanId, email }),
  })
}

export function pdfUrl(scanId: string): string {
  return IS_MOCK ? '#' : `/api/scans/${scanId}/report.pdf`
}
