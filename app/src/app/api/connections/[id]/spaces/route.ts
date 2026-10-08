import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { decrypt } from '@/lib/crypto'
import { ClickUpClient, ClickUpError } from '@/lib/clickup/client'

export const dynamic = 'force-dynamic'

// Spaces available to exclude for a given workspace (used by the audit config page).
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const teamId = req.nextUrl.searchParams.get('teamId')
  if (!teamId) return NextResponse.json({ error: 'teamId_required' }, { status: 400 })

  const admin = supabaseAdmin()
  const { data, error } = await admin
    .from('connections')
    .select('token_encrypted')
    .eq('id', params.id)
    .single()
  if (error || !data) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  try {
    const client = new ClickUpClient(decrypt(data.token_encrypted))
    const { spaces } = await client.getSpaces(teamId)
    return NextResponse.json({
      spaces: (spaces ?? []).map((s) => ({ id: s.id, name: s.name })),
    })
  } catch (e) {
    // ClickUp scopes the OAuth token to the one workspace selected at consent.
    // `/team` still lists every membership, so a workspace can look available but
    // be unauthorised — surface that distinctly so the UI can prompt a reconnect.
    if (e instanceof ClickUpError && (e.status === 401 || e.code === 'OAUTH_192')) {
      // The cached workspace list may include this unauthorised workspace; clear it
      // so the picker re-checks and stops offering it.
      await admin.from('connections').update({ workspaces: [] }).eq('id', params.id)
      return NextResponse.json({ error: 'workspace_not_authorized' }, { status: 403 })
    }
    return NextResponse.json({ error: (e as Error).message }, { status: 502 })
  }
}
