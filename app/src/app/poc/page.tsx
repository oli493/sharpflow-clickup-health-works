import type { Metadata } from 'next'
import PocReport from '@/components/poc/PocReport'

export const metadata: Metadata = {
  title: 'Phase 2 PoC - Sharpflow ClickUp Health',
  description: 'Proof of concept for score explanations and the Action Plan.',
  robots: { index: false, follow: false },
}

export default function PocPage() {
  return <PocReport />
}
