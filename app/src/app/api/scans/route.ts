import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/server'
import { inngest } from '@/inngest/client'

export const dynamic = 'force-dynamic'

const schema = z.object({
  connectionId: z.string().min(1),
  teamId: z.string().min(1),
  workspaceName: z.string().optional(),
  excludeSpaceIds: z.array(z.string()).optional().default([]),
})

// Create a scan and dispatch the background job.
export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_body', issues: parsed.error.issues }, { status: 400 })
  }
  const { connectionId, teamId, workspaceName, excludeSpaceIds } = parsed.data
  const admin = supabaseAdmin()

  const { data, error } = await admin
    .from('scans')
    .insert({ connection_id: connectionId, team_id: teamId, workspace_name: workspaceName ?? null, status: 'queued', progress: 0, stage: 'Queued' })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  try {
    await inngest.send({
      name: 'scan/requested',
      data: { scanId: data.id, connectionId, teamId, excludeSpaceIds },
    })
  } catch {
    // The scan row exists; the worker can be retried.
  }

  return NextResponse.json({ id: data.id })
}
