import { randomUUID } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import { ClickUpClient } from '../src/lib/clickup/client'
import { decrypt } from '../src/lib/crypto'
import { supabaseAdmin } from '../src/lib/supabase/server'
import type { ScanResult } from '../src/lib/types'

const RUN = process.env.RUN_SCAN_VALIDATION === '1'
const WORKSPACE = process.env.VALIDATION_WORKSPACE ?? 'Studio'
const TEAM_ID = process.env.VALIDATION_TEAM_ID
const CONNECTION_ID = process.env.VALIDATION_CONNECTION_ID
const EXCLUDE_IDS = (process.env.VALIDATION_EXCLUDE_SPACE_IDS ?? '')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean)

interface ScanRow {
  id: string
  connection_id: string
  team_id: string
  workspace_name: string | null
  status: string
  overall_score: number | null
  grade: string | null
  metrics: Record<string, unknown> | null
  category_scores: unknown
  result: ScanResult | null
  created_at: string
}

interface ConnectionRow {
  id: string
  workspaces: { id: string; name: string }[] | null
  token_encrypted?: string
}

function findWorkspace(
  scans: ScanRow[],
  connections: ConnectionRow[],
): { connectionId: string; teamId: string; workspaceName: string; baseline?: ScanRow } {
  if (CONNECTION_ID && TEAM_ID) {
    const baseline = scans.find((scan) => scan.team_id === TEAM_ID)
    return {
      connectionId: CONNECTION_ID,
      teamId: TEAM_ID,
      workspaceName: baseline?.workspace_name ?? WORKSPACE,
      baseline,
    }
  }

  const scan = scans.find((row) =>
    (row.workspace_name ?? '').toLowerCase().includes(WORKSPACE.toLowerCase()),
  )
  if (scan) {
    return {
      connectionId: scan.connection_id,
      teamId: scan.team_id,
      workspaceName: scan.workspace_name ?? WORKSPACE,
      baseline: scan,
    }
  }

  for (const connection of connections) {
    const match = (connection.workspaces ?? []).find((workspace) =>
      workspace.name.toLowerCase().includes(WORKSPACE.toLowerCase()),
    )
    if (match) {
      return {
        connectionId: connection.id,
        teamId: match.id,
        workspaceName: match.name,
      }
    }
  }

  throw new Error(
    `No connection found for "${WORKSPACE}". Set VALIDATION_CONNECTION_ID and VALIDATION_TEAM_ID.`,
  )
}

function categoryMap(result?: ScanResult | null): Record<string, number> {
  return Object.fromEntries((result?.categories ?? []).map((category) => [category.key, category.score]))
}

function findingKeys(result?: ScanResult | null): Record<string, string> {
  return Object.fromEntries(
    (result?.findings ?? []).map((finding) => [finding.id, `${finding.severity}:${finding.metric}`]),
  )
}

function changedMetrics(
  baseline: Record<string, unknown> | null | undefined,
  branch: Record<string, unknown>,
): Record<string, { baseline: unknown; branch: unknown }> {
  const keys = new Set([...Object.keys(baseline ?? {}), ...Object.keys(branch)])
  const changed: Record<string, { baseline: unknown; branch: unknown }> = {}
  for (const key of keys) {
    const before = baseline?.[key]
    const after = branch[key]
    if (JSON.stringify(before) !== JSON.stringify(after)) {
      changed[key] = { baseline: before, branch: after }
    }
  }
  return changed
}

describe.skipIf(!RUN)('real workspace scan validation', () => {
  beforeAll(() => {
    try {
      process.loadEnvFile('.env.local')
    } catch {
      // CI and normal test runs have no .env.local.
    }
    process.env.SCAN_DRY_RUN = '1'
  })

  it(
    `runs the branch scanner against ${WORKSPACE} without writing to Supabase`,
    async () => {
      const admin = supabaseAdmin()
      const [{ data: scans, error: scansError }, { data: connections, error: connectionsError }] =
        await Promise.all([
          admin
            .from('scans')
            .select(
              'id, connection_id, team_id, workspace_name, status, overall_score, grade, metrics, category_scores, result, created_at',
            )
            .eq('status', 'complete')
            .order('created_at', { ascending: false })
            .limit(200),
          admin.from('connections').select('id, workspaces, token_encrypted'),
        ])

      if (scansError) throw new Error(`scans read failed: ${scansError.message}`)
      if (connectionsError) throw new Error(`connections read failed: ${connectionsError.message}`)

      if (process.env.VALIDATION_PROBE === '1') {
        console.log('\nTOKEN PROBE')
        const limit = Number(process.env.VALIDATION_PROBE_LIMIT ?? '25')
        const matching = ((connections ?? []) as ConnectionRow[])
          .filter((connection) =>
            (connection.workspaces ?? []).some((workspace) =>
              workspace.name.toLowerCase().includes(WORKSPACE.toLowerCase()),
            ),
          )
          .slice(0, limit)
        for (const connection of matching) {
          const names = (connection.workspaces ?? []).map((workspace) => workspace.name).join(' | ')
          try {
            const token = decrypt(connection.token_encrypted ?? '')
            const { teams } = await new ClickUpClient(token).getAuthorizedTeams()
            const teamList = teams.map((team) => `${team.id}:${team.name}`).join(', ')
            console.log(`- ${connection.id} | ${names} | OK (${teamList})`)
          } catch (error) {
            console.log(`- ${connection.id} | ${names} | FAILED: ${(error as Error).message.slice(0, 160)}`)
          }
        }
        return
      }

      if (process.env.VALIDATION_LIST === '1') {
        console.log('\nCONNECTIONS')
        for (const connection of (connections ?? []) as ConnectionRow[]) {
          console.log(`- ${connection.id}: ${(connection.workspaces ?? []).map((w) => w.name).join(' | ') || '(none cached)'}`)
        }
        console.log('\nRECENT COMPLETE SCANS')
        for (const scan of (scans ?? []) as ScanRow[]) {
          console.log(
            `- ${scan.workspace_name ?? '(unnamed)'} | team ${scan.team_id} | connection ${scan.connection_id} | ${scan.overall_score ?? 'n/a'} | ${scan.created_at}`,
          )
        }
        return
      }

      const target = findWorkspace(
        (scans ?? []) as ScanRow[],
        (connections ?? []) as ConnectionRow[],
      )

      const { scanWorkspace } = await import('../src/inngest/scan')
      const fn = (scanWorkspace as unknown as { fn?: (args: unknown) => Promise<unknown> }).fn
      if (!fn) throw new Error('scanWorkspace.fn is not available')

      const step = {
        run: async (_id: string, callback: () => Promise<unknown>) => callback(),
      }

      const started = Date.now()
      const output = (await fn({
        event: {
          data: {
            scanId: randomUUID(),
            connectionId: target.connectionId,
            teamId: target.teamId,
            workspaceName: target.workspaceName,
            excludeSpaceIds: EXCLUDE_IDS,
          },
        },
        step,
      })) as {
        result?: ScanResult
        metrics?: Record<string, unknown>
        overall?: number
        grade?: string
        findings?: number
        failedLists?: { listId: string; listName: string; error: string }[]
      }
      const durationMs = Date.now() - started

      expect(output.result).toBeDefined()
      const branch = output.result as ScanResult
      const baseline = target.baseline?.result ?? null

      const report = {
        workspace: target.workspaceName,
        teamId: target.teamId,
        connectionId: target.connectionId,
        generatedAt: new Date().toISOString(),
        durationMs,
        baseline: baseline
          ? {
              scanId: target.baseline?.id,
              createdAt: target.baseline?.created_at,
              overallScore: target.baseline?.overall_score,
              grade: target.baseline?.grade,
              categories: categoryMap(baseline),
              findings: findingKeys(baseline),
              metrics: target.baseline?.metrics,
            }
          : null,
        branch: {
          overallScore: branch.overallScore,
          grade: branch.overallGrade,
          categories: categoryMap(branch),
          findings: findingKeys(branch),
          dataQuality: branch.dataQuality,
          failedLists: output.failedLists ?? [],
          metrics: output.metrics ?? {},
        },
        changedMetrics: changedMetrics(target.baseline?.metrics, output.metrics ?? {}),
      }

      const dir = path.join(os.tmpdir(), 'opencode', 'sharpflow-validation')
      mkdirSync(dir, { recursive: true })
      const file = path.join(
        dir,
        `${target.workspaceName.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${Date.now()}.json`,
      )
      writeFileSync(file, JSON.stringify(report, null, 2), 'utf8')

      const baselineScore = target.baseline?.overall_score ?? 'n/a'
      console.log(
        `\nVALIDATION ${target.workspaceName}: baseline ${baselineScore} -> branch ${branch.overallScore} (${branch.overallGrade}), ${Math.round(durationMs / 1000)}s`,
      )
      console.log(`Baseline scan: ${target.baseline?.id ?? 'none'} (${target.baseline?.created_at ?? 'n/a'})`)
      console.log('Category scores:', JSON.stringify(categoryMap(branch)))
      console.log('Data quality:', JSON.stringify(branch.dataQuality ?? null))
      console.log('Report:', file)
    },
    60 * 60 * 1000,
  )
})
