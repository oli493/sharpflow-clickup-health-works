import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// A scan still "running" after this long is treated as stuck (the worker's
// steps each finish in seconds, so a normal scan is well under this).
const STALE_MS = 20 * 60 * 1000

// Scan status + progress + (when complete) the report result.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const admin = supabaseAdmin()
  const { data, error } = await admin
    .from('scans')
    .select('id, connection_id, status, progress, stage, result, error, created_at')
    .eq('id', params.id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  // Self-healing: if the worker died without recording a failure, don't leave the
  // scan "running" forever — flip it to failed so the UI can recover.
  if ((data.status === 'running' || data.status === 'queued') && data.created_at) {
    const age = Date.now() - new Date(data.created_at).getTime()
    if (age > STALE_MS) {
      const message = 'The audit timed out before finishing. Please run it again.'
      await admin
        .from('scans')
        .update({ status: 'failed', progress: 100, stage: 'Failed', error: message, finished_at: new Date().toISOString() })
        .eq('id', params.id)
      return NextResponse.json({
        id: data.id,
        connectionId: data.connection_id ?? undefined,
        status: 'failed',
        progress: 100,
        stage: 'Failed',
        error: message,
      })
    }
  }

  return NextResponse.json({
    id: data.id,
    connectionId: data.connection_id ?? undefined,
    status: data.status,
    progress: data.progress ?? 0,
    stage: data.stage ?? '',
    result: data.result ?? undefined,
    error: data.error ?? undefined,
  })
}
