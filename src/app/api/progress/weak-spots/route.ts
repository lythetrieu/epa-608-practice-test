import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  const catStats: Record<string, { wrong: number; total: number }> = {}

  // Fast path: aggregate GROUP BY category in Postgres (migration 029).
  const { data: agg, error: rpcError } = await admin.rpc('weak_spots_by_category', {
    p_user_id: user.id,
  })

  if (!rpcError && Array.isArray(agg)) {
    for (const row of agg as { category: string; wrong: number; total: number }[]) {
      const cat = row.category || 'Core'
      catStats[cat] = { wrong: Number(row.wrong) || 0, total: Number(row.total) || 0 }
    }
  } else {
    // Fallback: RPC not present yet — original per-row scan (capped at 5000).
    const { data, error } = await admin
      .from('user_progress')
      .select('correct, question_id, questions!inner(category)')
      .eq('user_id', user.id)
      .limit(5000)

    if (error || !data) {
      return NextResponse.json({ spots: [] })
    }

    for (const row of data) {
      const cat = ((row.questions as unknown) as { category: string }).category || 'Core'
      if (!catStats[cat]) catStats[cat] = { wrong: 0, total: 0 }
      catStats[cat].total++
      if (!row.correct) catStats[cat].wrong++
    }
  }

  const spots = Object.entries(catStats)
    .filter(([, s]) => s.total >= 2)
    .map(([category, s]) => ({
      category,
      label: category,
      errorPct: Math.round((s.wrong / s.total) * 100),
      wrongCount: s.wrong,
      totalCount: s.total,
    }))
    .sort((a, b) => b.errorPct - a.errorPct)

  return NextResponse.json({ spots })
}
