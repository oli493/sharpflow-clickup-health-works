import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { buildReportPdf } from '@/lib/report-pdf'
import type { ScanResult } from '@/lib/types'

export const dynamic = 'force-dynamic'

// Server-generated branded PDF report.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const admin = supabaseAdmin()
  const { data } = await admin.from('scans').select('result').eq('id', params.id).single()
  if (!data?.result) return NextResponse.json({ error: 'report_not_ready' }, { status: 409 })

  const bytes = await buildReportPdf(data.result as ScanResult)
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="sharpflow-report-${params.id}.pdf"`,
      'Cache-Control': 'no-store',
    },
  })
}
