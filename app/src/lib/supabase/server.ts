import { createClient } from '@supabase/supabase-js'

/**
 * Server-side Supabase client using the service-role key.
 * Used for token storage, scans, findings, scores and leads.
 * Never import this into client components.
 */
export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase env vars are not configured')
  return createClient(url, key, { auth: { persistSession: false } })
}
