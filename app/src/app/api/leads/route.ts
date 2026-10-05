import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const schema = z.object({
  scanId: z.string().optional(),
  email: z.string().email(),
  source: z.string().optional(),
})

// Lead capture from the results page (stored + optional CRM webhook).
export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'invalid_body', issues: parsed.error.issues }, { status: 400 })

  const admin = supabaseAdmin()
  await admin.from('leads').insert({
    scan_id: parsed.data.scanId ?? null,
    email: parsed.data.email,
    source: parsed.data.source ?? 'results',
  })

  const webhook = process.env.LEAD_CAPTURE_WEBHOOK
  if (webhook) {
    try {
      await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      })
    } catch {
      // Lead is stored; webhook delivery can be retried.
    }
  }

  return NextResponse.json({ ok: true })
}
