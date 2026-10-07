import { NextRequest, NextResponse } from 'next/server'
import { exchangeCodeForToken } from '@/lib/clickup/oauth'
import { ClickUpClient } from '@/lib/clickup/client'
import { supabaseAdmin } from '@/lib/supabase/server'
import { encrypt } from '@/lib/crypto'

export const dynamic = 'force-dynamic'

// Step 2: ClickUp redirects back here with ?code=...&state=...
// We only do the fast work here (token + user); the potentially-slow workspace
// list is fetched lazily on /workspaces so a ClickUp hiccup can't crash connect.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const expected = req.cookies.get('cu_oauth_state')?.value
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const fail = () => {
    const res = NextResponse.redirect(new URL('/?connect=error', base))
    res.cookies.delete('cu_oauth_state')
    return res
  }

  if (!code || !state || !expected || state !== expected) return fail()

  try {
    const token = await exchangeCodeForToken(code)
    const client = new ClickUpClient(token)
    const { user } = await client.getAuthorizedUser()

    const admin = supabaseAdmin()
    const { data, error } = await admin
      .from('connections')
      .insert({
        clickup_user_id: String(user.id),
        clickup_username: user.username,
        clickup_email: user.email,
        token_encrypted: encrypt(token),
        workspaces: [],
      })
      .select('id')
      .single()

    if (error || !data) throw new Error(error?.message ?? 'insert_failed')

    const res = NextResponse.redirect(new URL(`/workspaces?connection=${data.id}`, base))
    res.cookies.delete('cu_oauth_state')
    return res
  } catch (e) {
    console.error('[clickup/callback]', (e as Error).message)
    return fail()
  }
}
