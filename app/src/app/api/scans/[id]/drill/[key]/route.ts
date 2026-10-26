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

  if (key.startsWith('dormant-lists')) {
    const days = key.endsWith('-90') ? 90 : 60
    const { data } = await admin
      .from('scan_samples')
      .select('rows')
      .eq('scan_id', params.id)
      .eq('dataset', 'dormant-lists')
      .maybeSingle()
    const allRows = (data?.rows as Record<string, unknown>[]) ?? []
    if (allRows.length) {
      const rows = allRows
        .filter((row) => Number(row.tier ?? 0) >= days)
        .sort((a, b) => String(a.lastActivity).localeCompare(String(b.lastActivity)))
      return NextResponse.json({ key, ...meta, unit: `${rows.length} Lists`, rows })
    }

    const cutoff = new Date(Date.now() - days * 86_400_000).toISOString()
    const fallback = await admin
      .from('list_stats')
      .select('*')
      .eq('scan_id', params.id)
      .or(`last_activity.is.null,last_activity.lt.${cutoff}`)
      .order('last_activity', { ascending: true, nullsFirst: true })
    const rows = (fallback.data ?? []).map((row) => ({
      list: row.list_name,
      space: row.space_name ?? '—',
      tasks: row.tasks,
      lastActivity: row.last_activity
        ? new Date(row.last_activity).toLocaleDateString('en-GB')
        : '— none —',
    }))
    return NextResponse.json({ key, ...meta, unit: `${rows.length} Lists`, rows })
  }

  if (key === 'fragmented-lists') {
    const { data } = await admin
      .from('list_stats')
      .select('*')
      .eq('scan_id', params.id)
      .lt('open_tasks', 5)
      .order('open_tasks', { ascending: true })
    const rows = (data ?? []).map((r) => ({
      list: r.list_name,
      space: r.space_name ?? '—',
      openTasks: r.open_tasks,
      tasks: r.tasks,
      lastActivity: r.last_activity ? new Date(r.last_activity).toLocaleDateString('en-GB') : '—',
    }))
    return NextResponse.json({ key, ...meta, unit: `${rows.length} Lists`, rows })
  }

  if (key.startsWith('stale-')) {
    const tier = Number(key.slice('stale-'.length)) || 30
    const { data } = await admin
      .from('scan_samples')
      .select('rows')
      .eq('scan_id', params.id)
      .eq('dataset', 'stale')
      .maybeSingle()
    const allRows = (data?.rows as Record<string, unknown>[]) ?? []
    const hasAge = allRows.some((row) => row.ageDays !== undefined)
    const rows = hasAge ? allRows.filter((row) => Number(row.ageDays ?? 0) >= tier) : allRows
    return NextResponse.json({ key, ...meta, unit: `${rows.length} sampled tasks`, rows })
  }

  const { data } = await admin
    .from('scan_samples')
    .select('rows')
    .eq('scan_id', params.id)
    .eq('dataset', key)
    .maybeSingle()
  const rows = (data?.rows as Record<string, unknown>[]) ?? []
  return NextResponse.json({ key, ...meta, unit: `${rows.length} sampled rows`, rows })
}
