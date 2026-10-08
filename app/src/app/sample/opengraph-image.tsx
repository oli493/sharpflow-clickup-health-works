import { healthOgImage, ogSize, ogContentType } from '@/lib/og'
import { MOCK_SCAN } from '@/lib/mock/scan'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const alt = 'Sharpflow ClickUp Health — sample report'
export const size = ogSize
export const contentType = ogContentType

export default function Image() {
  return healthOgImage(MOCK_SCAN)
}
