import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { decrypt } from '@/lib/crypto'
import { ClickUpClient } from '@/lib/clickup/client'

export const dynamic = 'force-dynamic'

// Workspaces for a connection. Uses the cached list if present; otherwise fetches
// ClickUp's (potentially slow) /team and caches it. Kept off the OAuth callback
// so a slow/hiccuping ClickUp can't crash the connect flow.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const admin = supabaseAdmin()
  const { data, error } = await admin
    .from('connections')
    .select('id, token_encrypted, workspaces')
    .eq('id', params.id)
    .single()
  if (error || !data) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const existing = (data.workspaces as { id: string; name: string }[] | null) ?? []
  if (existing.length) return NextResponse.json({ workspaces: existing })

  try {
    const client = new ClickUpClient(decrypt(data.token_encrypted))
    const { teams } = await client.getAuthorizedTeams()
    const workspaces = (teams ?? []).map((t) => ({ id: t.id, name: t.name }))
    await admin.from('connections').update({ workspaces, updated_at: new Date().toISOString() }).eq('id', params.id)
    return NextResponse.json({ workspaces })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 })
  }
}
