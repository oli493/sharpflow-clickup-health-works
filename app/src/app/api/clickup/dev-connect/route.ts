import { NextResponse } from 'next/server'
import { ClickUpClient } from '@/lib/clickup/client'
import { supabaseAdmin } from '@/lib/supabase/server'
import { encrypt } from '@/lib/crypto'

export const dynamic = 'force-dynamic'

/**
 * DEV-ONLY connect: uses a ClickUp personal API token from the environment to
 * create a connection without the OAuth round-trip. This exists purely to work
 * around ClickUp's current OAuth platform bug during development.
 *
 * Returns 404 in production and never reaches the live app.
 */
export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const token = process.env.DEV_CLICKUP_TOKEN
  if (!token) {
    return NextResponse.json({ error: 'DEV_CLICKUP_TOKEN is not set in app/.env.local' }, { status: 400 })
  }

  try {
    const client = new ClickUpClient(token)
    const [{ teams }, { user }] = await Promise.all([
      client.getAuthorizedTeams(),
      client.getAuthorizedUser(),
    ])

    const admin = supabaseAdmin()
    const { data, error } = await admin
      .from('connections')
      .insert({
        clickup_user_id: String(user.id),
        clickup_username: user.username,
        clickup_email: user.email,
        token_encrypted: encrypt(token),
        workspaces: teams.map((t) => ({ id: t.id, name: t.name })),
      })
      .select('id')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    return NextResponse.redirect(new URL(`/workspaces?connection=${data.id}`, base))
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
