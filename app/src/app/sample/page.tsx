import type { Metadata } from 'next'
import ReportView from '@/components/report/ReportView'
import { MOCK_SCAN } from '@/lib/mock/scan'

export const metadata: Metadata = {
  title: 'Sample report · Sharpflow ClickUp Health',
  description:
    'See a full example ClickUp workspace health report — score, findings and recommendations — before you connect your own workspace.',
}

export default function SampleReportPage() {
  return <ReportView result={MOCK_SCAN} scanId="sample" sample />
}
