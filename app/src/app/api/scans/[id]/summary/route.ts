import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// AI executive summary (stored on the scan; placeholder until the LLM layer is wired).
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const admin = supabaseAdmin()
  const { data } = await admin.from('scans').select('result').eq('id', params.id).single()
  const summary: string[] = data?.result?.aiSummary ?? ['The executive summary will appear once the scan completes.']
  return NextResponse.json({ summary })
}
