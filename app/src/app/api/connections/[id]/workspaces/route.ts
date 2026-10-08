import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { decrypt } from '@/lib/crypto'
import { ClickUpClient, ClickUpError } from '@/lib/clickup/client'

export const dynamic = 'force-dynamic'

// Workspaces for a connection. ClickUp's /team lists every workspace the user
// belongs to, but an OAuth token is only allowed into the workspace chosen at
// consent — so we probe each and return only the ones we can actually read.
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
    const all = teams ?? []

    const probed = await Promise.all(
      all.map(async (t) => {
        try {
          await client.getSpaces(t.id)
          return { id: t.id, name: t.name, unauthorized: false }
        } catch (e) {
          const unauthorized = e instanceof ClickUpError && (e.status === 401 || e.code === 'OAUTH_192')
          return { id: t.id, name: t.name, unauthorized }
        }
      }),
    )

    // Drop only workspaces we've confirmed are unauthorised; keep any we couldn't
    // verify (e.g. a transient ClickUp error) so we never hide a usable workspace.
    const accessible = probed.filter((p) => !p.unauthorized).map(({ id, name }) => ({ id, name }))
    const anyUnauthorized = probed.some((p) => p.unauthorized)

    if (accessible.length) {
      await admin
        .from('connections')
        .update({ workspaces: accessible, updated_at: new Date().toISOString() })
        .eq('id', params.id)
      return NextResponse.json({ workspaces: accessible })
    }

    // Nothing readable — don't cache, so a later reconnect can recover.
    return NextResponse.json({ workspaces: [], unauthorized: anyUnauthorized })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 })
  }
}
