import { env } from '../env'

const AUTHORIZE_URL = 'https://app.clickup.com/api'
const TOKEN_URL = 'https://api.clickup.com/api/v2/oauth/token'

/** Build the ClickUp authorization URL the user is redirected to. */
export function authorizeUrl(state: string): string {
  const e = env()
  const url = new URL(AUTHORIZE_URL)
  url.searchParams.set('client_id', e.CLICKUP_CLIENT_ID)
  url.searchParams.set('redirect_uri', e.CLICKUP_REDIRECT_URI)
  url.searchParams.set('state', state)
  return url.toString()
}

/** Exchange the OAuth code for an access token. */
export async function exchangeCodeForToken(code: string): Promise<string> {
  const e = env()
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: e.CLICKUP_CLIENT_ID,
      client_secret: e.CLICKUP_CLIENT_SECRET,
      code,
    }),
  })
  if (!res.ok) {
    throw new Error(`ClickUp token exchange failed: ${res.status} ${await res.text().catch(() => '')}`)
  }
  const data = (await res.json()) as { access_token?: string }
  if (!data.access_token) throw new Error('ClickUp did not return an access token')
  return data.access_token
}
