import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { DATASET_META, SPACE_COLUMNS } from '@/lib/drill'

export const dynamic = 'force-dynamic'

function healthOf(overdue: number, open: number) {
  if (open <= 0) return 'Dormant'
  const rate = overdue / open
  if (rate < 0.1) return 'Healthy'
  if (rate < 0.3) return 'Needs attention'
  return 'At risk'
}

// Drill-down rows for a metric/finding dataset (or a Space node).
export async function GET(_req: NextRequest, { params }: { params: { id: string; key: string } }) {
  const admin = supabaseAdmin()
  const key = decodeURIComponent(params.key)

  if (key.startsWith('space:')) {
    const name = key.slice(6)
    const { data } = await admin
      .from('list_stats')
      .select('*')
      .eq('scan_id', params.id)
      .eq('space_name', name)
      .order('tasks', { ascending: false })
    const rows = (data ?? []).map((r) => ({
      list: r.list_name,
      tasks: r.tasks,
      overdue: r.overdue,
      lastActivity: r.last_activity ? new Date(r.last_activity).toLocaleDateString('en-GB') : '—',
      health: healthOf(r.overdue, r.open_tasks),
    }))
    return NextResponse.json({ key, title: name, subtitle: 'Lists in this Space and their health', unit: `${rows.length} Lists`, columns: SPACE_COLUMNS, rows })
  }

  const meta = DATASET_META[key]
  if (!meta) return NextResponse.json({ error: 'unknown_dataset' }, { status: 404 })

  if (key === 'dormant-lists') {
    const cutoff = new Date(Date.now() - 60 * 86_400_000).toISOString()
    const { data } = await admin
      .from('list_stats')
      .select('*')
      .eq('scan_id', params.id)
      .or(`last_activity.is.null,last_activity.lt.${cutoff}`)
      .order('last_activity', { ascending: true, nullsFirst: true })
    const rows = (data ?? []).map((r) => ({
      list: r.list_name,
      space: r.space_name ?? '—',
      tasks: r.tasks,
      lastActivity: r.last_activity ? new Date(r.last_activity).toLocaleDateString('en-GB') : '— none —',
    }))
    return NextResponse.json({ key, ...meta, unit: `${rows.length} Lists`, rows })
  }

  const { data } = await admin
    .from('scan_samples')
    .select('rows')
    .eq('scan_id', params.id)
    .eq('dataset', key)
    .maybeSingle()
  const rows = (data?.rows as Record<string, unknown>[]) ?? []
  return NextResponse.json({ key, ...meta, unit: `${rows.length} rows`, rows })
}
