import { NextRequest, NextResponse } from 'next/server'
import { exchangeCodeForToken } from '@/lib/clickup/oauth'
import { ClickUpClient } from '@/lib/clickup/client'
import { supabaseAdmin } from '@/lib/supabase/server'
import { encrypt } from '@/lib/crypto'

export const dynamic = 'force-dynamic'

// Step 2: ClickUp redirects back here with ?code=...&state=...
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const expected = req.cookies.get('cu_oauth_state')?.value
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  if (!code || !state || !expected || state !== expected) {
    return NextResponse.json({ error: 'invalid_oauth_state' }, { status: 400 })
  }

  const token = await exchangeCodeForToken(code)
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

  const res = NextResponse.redirect(new URL(`/workspaces?connection=${data.id}`, base))
  res.cookies.delete('cu_oauth_state')
  return res
}
