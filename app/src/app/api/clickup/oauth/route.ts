import { NextResponse } from 'next/server'
import { randomBytes } from 'node:crypto'
import { authorizeUrl } from '@/lib/clickup/oauth'

export const dynamic = 'force-dynamic'

// Step 1 of the ClickUp OAuth flow: send the user to ClickUp's consent screen.
export async function GET() {
  const state = randomBytes(16).toString('hex')
  const res = NextResponse.redirect(authorizeUrl(state))
  res.cookies.set('cu_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  })
  return res
}
