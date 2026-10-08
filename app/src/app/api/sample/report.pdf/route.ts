import { NextResponse } from 'next/server'
import { buildReportPdf } from '@/lib/report-pdf'
import { MOCK_SCAN } from '@/lib/mock/scan'

export const dynamic = 'force-dynamic'

// Branded PDF for the public sample report (synthetic data).
export async function GET() {
  const bytes = await buildReportPdf(MOCK_SCAN)
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="sharpflow-sample-report.pdf"',
      'Cache-Control': 'no-store',
    },
  })
}
