import { supabaseAdmin } from '@/lib/supabase/server'
import { healthOgImage, ogSize, ogContentType } from '@/lib/og'
import type { ScanResult } from '@/lib/types'

export const runtime = 'nodejs'
export const alt = 'Sharpflow ClickUp Health report'
export const size = ogSize
export const contentType = ogContentType

export default async function Image({ params }: { params: { id: string } }) {
  const admin = supabaseAdmin()
  const { data } = await admin.from('scans').select('result').eq('id', params.id).maybeSingle()
  return healthOgImage((data?.result as ScanResult) ?? undefined)
}
