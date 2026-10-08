import { healthOgImage, ogSize, ogContentType } from '@/lib/og'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const alt = 'Sharpflow ClickUp Health'
export const size = ogSize
export const contentType = ogContentType

export default function Image() {
  return healthOgImage()
}
