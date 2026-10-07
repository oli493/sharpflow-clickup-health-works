import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

function healthScore(overdue: number, open: number): number {
  if (open <= 0) return 0.35
  const rate = overdue / open
  if (rate < 0.1) return 0.9
  if (rate < 0.3) return 0.65
  return 0.35
}

// Real workspace structure for the report topology (Spaces → Lists, with health).
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const admin = supabaseAdmin()
  const { data, error } = await admin
    .from('list_stats')
    .select('list_name, space_name, tasks, open_tasks, overdue')
    .eq('scan_id', params.id)
    .order('space_name', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  type ListAgg = { name: string; health: number; tasks: number }
  type SpaceAgg = { name: string; lists: ListAgg[] }
  const bySpace = new Map<string, SpaceAgg>()
  for (const r of data ?? []) {
    const s: SpaceAgg = bySpace.get(r.space_name) ?? { name: r.space_name, lists: [] }
    s.lists.push({
      name: r.list_name,
      tasks: r.tasks ?? 0,
      health: healthScore(r.overdue ?? 0, r.open_tasks ?? 0),
    })
    bySpace.set(r.space_name, s)
  }

  const spaces = [...bySpace.values()].map((s) => ({
    name: s.name,
    health: s.lists.length ? s.lists.reduce((a, l) => a + l.health, 0) / s.lists.length : 0.35,
    lists: s.lists,
  }))

  return NextResponse.json({ spaces })
}
