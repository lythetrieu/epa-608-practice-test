import { createAdminClient } from '@/lib/supabase/server'
import { getSubtopicLabel, getSubtopicCategory, SUBTOPIC_GROUPS } from '@/lib/subtopics'
import type { Category } from '@/types'

export type BlindSpot = {
  subtopic_id: string
  label: string
  category: Category
  totalAttempts: number
  correctCount: number
  errorRate: number
  lastAttempted: string
}

export type RadarDatum = { label: string; score: number; maxScore: number }

// The 4 exam sections — always all 4 axes so the fallback radar has a shape
// even when some sections have zero attempts (score 0, maxScore 0 → 0%).
const SECTION_AXES: Category[] = ['Core', 'Type I', 'Type II', 'Type III']

// Collapse 23 subtopic groups into 8 major radar axes
const RADAR_TOPICS: { label: string; groupKeys: string[] }[] = [
  { label: 'Environment', groupKeys: ['core-env'] },
  { label: 'Clean Air Act', groupKeys: ['core-caa', 'core-regs'] },
  { label: 'Refrigerants', groupKeys: ['core-sub', 'core-ref', 't2-ref', 't3-ref'] },
  { label: 'Recovery', groupKeys: ['core-3rs', 'core-rec', 't1-rec', 't2-rec', 't3-rec'] },
  { label: 'Evacuation', groupKeys: ['core-evac'] },
  { label: 'Safety', groupKeys: ['core-safe', 't1-safe'] },
  { label: 'Leak & Repair', groupKeys: ['t2-leak', 't2-repair', 't3-leak', 't3-repair'] },
  { label: 'Techniques', groupKeys: ['t1-tech', 't2-tech', 't3-rech', 'core-ship'] },
]

/**
 * Loads the user's weak spots (get_blind_spots RPC, min 2 attempts per
 * subtopic) enriched with labels/categories, with a category-level fallback
 * when no subtopic has enough attempts yet, plus radar chart data aggregated
 * into the 8 major topic axes, plus a 4-axis section-level radar (Core /
 * Type I / Type II / Type III) used as a fallback when the subtopic radar has
 * too few axes. Server-only.
 */
export async function getWeakSpotsData(
  userId: string
): Promise<{ spots: BlindSpot[]; radarData: RadarDatum[]; sectionRadar: RadarDatum[] }> {
  const admin = createAdminClient()
  const { data: rpcSpots } = await admin.rpc('get_blind_spots', {
    p_user_id: userId,
    p_min_attempts: 2,
  })

  const enriched: BlindSpot[] = (rpcSpots ?? []).map((s: {
    subtopic_id: string
    total_attempts: number
    correct_count: number
    error_rate: number
    last_attempted: string
  }) => ({
    subtopic_id: s.subtopic_id,
    label: getSubtopicLabel(s.subtopic_id),
    category: getSubtopicCategory(s.subtopic_id),
    totalAttempts: s.total_attempts,
    correctCount: s.correct_count,
    errorRate: s.error_rate,
    lastAttempted: s.last_attempted,
  }))

  enriched.sort((a, b) => b.errorRate - a.errorRate)

  // Section-level accuracy (correct/total per category). Filled from whichever
  // rows this function already fetched — RPC subtopic spots above, or the
  // category fallback query below — so it costs ZERO extra DB round-trips.
  const sectionAgg: Partial<Record<Category, { correct: number; total: number }>> = {}

  // Fallback: get_blind_spots needs >=2 attempts on the SAME subtopic, which a
  // single 10-question test almost never produces (its questions spread across
  // many subtopics). When there are no subtopic-level spots yet, fall back to a
  // category-level breakdown so weak areas still surface right after one test.
  if (enriched.length === 0) {
    const { data: rows } = await admin
      .from('user_progress')
      .select('correct, answered_at, questions!inner(category)')
      .eq('user_id', userId)
      .limit(5000)
    const byCat: Record<string, { wrong: number; total: number; last: string }> = {}
    for (const r of rows ?? []) {
      const cat = ((r.questions as unknown) as { category: string }).category || 'Core'
      if (!byCat[cat]) byCat[cat] = { wrong: 0, total: 0, last: '' }
      byCat[cat].total++
      if (!r.correct) byCat[cat].wrong++
      const at = (r as { answered_at?: string }).answered_at ?? ''
      if (at > byCat[cat].last) byCat[cat].last = at
    }
    for (const [cat, s] of Object.entries(byCat)) {
      // Section radar counts every attempt (even a single one) — a spot below
      // still requires >=2 attempts to be meaningful as a "weak spot".
      sectionAgg[cat as Category] = { correct: s.total - s.wrong, total: s.total }
      if (s.total < 2) continue
      enriched.push({
        subtopic_id: `cat:${cat}`,
        label: cat,
        category: cat as Category,
        totalAttempts: s.total,
        correctCount: s.total - s.wrong,
        errorRate: s.wrong / s.total,
        lastAttempted: s.last || new Date().toISOString(),
      })
    }
    enriched.sort((a, b) => b.errorRate - a.errorRate)
  }

  // Build radar chart data — average accuracy per major topic
  const radarData: RadarDatum[] = RADAR_TOPICS.map((topic) => {
    const subtopicIds = topic.groupKeys.flatMap((gk) => {
      const group = SUBTOPIC_GROUPS.find((g) => g.key === gk)
      return group ? group.subtopicIds : []
    })
    const matching = enriched.filter((s) => subtopicIds.includes(s.subtopic_id))
    const totalAttempts = matching.reduce((a, s) => a + s.totalAttempts, 0)
    const totalCorrect = matching.reduce((a, s) => a + s.correctCount, 0)
    return {
      label: topic.label,
      score: totalAttempts > 0 ? totalCorrect : 0,
      maxScore: totalAttempts > 0 ? totalAttempts : 0,
    }
  }).filter((d) => d.maxScore > 0)

  // When the RPC returned subtopic spots, the category fallback query never
  // ran — aggregate the sections from those spots instead.
  if (Object.keys(sectionAgg).length === 0) {
    for (const s of enriched) {
      const agg = sectionAgg[s.category] ?? { correct: 0, total: 0 }
      agg.correct += s.correctCount
      agg.total += s.totalAttempts
      sectionAgg[s.category] = agg
    }
  }

  // 4-axis section radar — ALWAYS all 4 axes (a spider needs shape); sections
  // with no attempts render at 0. Used by the Progress page as a fallback when
  // the subtopic radar above has fewer than 3 axes.
  const sectionRadar: RadarDatum[] = SECTION_AXES.map((label) => ({
    label,
    score: sectionAgg[label]?.correct ?? 0,
    maxScore: sectionAgg[label]?.total ?? 0,
  }))

  return { spots: enriched, radarData, sectionRadar }
}
