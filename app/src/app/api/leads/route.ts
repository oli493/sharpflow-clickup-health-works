import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/server'
import { ClickUpClient } from '@/lib/clickup/client'

export const dynamic = 'force-dynamic'

const schema = z.object({
  scanId: z.string().optional(),
  email: z.string().email(),
  source: z.string().optional(),
})

// Lead capture from the results page: stored in Supabase, then pushed to the
// Sharpflow ClickUp CRM List (and/or an optional webhook).
export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'invalid_body', issues: parsed.error.issues }, { status: 400 })

  const { scanId, email, source } = parsed.data
  const admin = supabaseAdmin()
  await admin.from('leads').insert({
    scan_id: scanId ?? null,
    email,
    source: source ?? 'results',
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

  // Create a task in the Sharpflow ClickUp CRM List.
  const listId = process.env.LEAD_CAPTURE_LIST_ID
  const token = process.env.LEAD_CAPTURE_CLICKUP_TOKEN
  if (listId && token) {
    try {
      let workspace = ''
      let score = ''
      if (scanId) {
        const { data } = await admin
          .from('scans')
          .select('workspace_name, overall_score, grade')
          .eq('id', scanId)
          .single()
        if (data) {
          workspace = data.workspace_name ?? ''
          score = data.overall_score != null ? `${data.overall_score}/100 (${data.grade ?? ''})`.trim() : ''
        }
      }

      const base = process.env.NEXT_PUBLIC_APP_URL ?? ''
      const lines = [
        `**Email:** ${email}`,
        workspace ? `**Workspace:** ${workspace}` : '',
        score ? `**Health Score:** ${score}` : '',
        scanId && base ? `**Report:** ${base}/report/${scanId}` : '',
        `**Source:** ${source ?? 'results'}`,
        `**Captured:** ${new Date().toISOString()}`,
      ].filter(Boolean)

      const client = new ClickUpClient(token)
      await client.createTask(listId, {
        name: `New ClickUp Health lead: ${email}`,
        markdown_description: lines.join('\n'),
      })
    } catch {
      // Lead is stored; CRM delivery can be retried.
    }
  }

  return NextResponse.json({ ok: true })
}
