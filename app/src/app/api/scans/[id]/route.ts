import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// Scan status + progress + (when complete) the report result.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const admin = supabaseAdmin()
  const { data, error } = await admin
    .from('scans')
    .select('id, connection_id, status, progress, stage, result, error')
    .eq('id', params.id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'not_found' }, { status: 404 })

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
