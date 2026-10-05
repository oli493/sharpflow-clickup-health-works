import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// Connection summary (workspaces available to scan).
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const admin = supabaseAdmin()
  const { data, error } = await admin
    .from('connections')
    .select('id, clickup_username, clickup_email, workspaces')
    .eq('id', params.id)
    .single()
  if (error || !data) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  return NextResponse.json(data)
}
