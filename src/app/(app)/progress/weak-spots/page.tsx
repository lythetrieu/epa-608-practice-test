import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { TIER_LIMITS } from '@/lib/tier'
import { getSubtopicLabel, getSubtopicCategory, SUBTOPIC_GROUPS } from '@/lib/subtopics'
import type { Tier, Category } from '@/types'
import { RadarChart } from '../radar-chart'

type BlindSpot = {
  subtopic_id: string
  label: string
  category: Category
  totalAttempts: number
  correctCount: number
  errorRate: number
  lastAttempted: string
}

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

export default async function WeakSpotsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/progress/weak-spots')

  const { data: profile } = await supabase
    .from('users_profile')
    .select('tier')
    .eq('id', user.id)
    .single()

  const tier = (profile?.tier ?? 'free') as Tier

  if (!TIER_LIMITS[tier].hasBlindSpot) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-96">
        <div className="text-5xl mb-4">🎯</div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Weak Spot Training</h2>
        <p className="text-gray-500 mb-6 text-center max-w-sm">
          Unlock AI-powered weak spot detection and targeted practice with Starter or higher.
        </p>
        <Link
          href="https://epa608practicetest.net/checkout.html"
          className="px-6 py-3 bg-blue-800 text-white rounded-xl font-semibold hover:bg-blue-900 transition-colors"
        >
          Upgrade to Pro — $14.99
        </Link>
      </div>
    )
  }

  const admin = createAdminClient()
  const { data: spots } = await admin.rpc('get_blind_spots', {
    p_user_id: user.id,
    p_min_attempts: 2,
  })

  const enriched: BlindSpot[] = (spots ?? []).map((s: any) => ({
    subtopic_id: s.subtopic_id,
    label: getSubtopicLabel(s.subtopic_id),
    category: getSubtopicCategory(s.subtopic_id),
    totalAttempts: s.total_attempts,
    correctCount: s.correct_count,
    errorRate: s.error_rate,
    lastAttempted: s.last_attempted,
  }))

  // Sort by error rate descending
  enriched.sort((a, b) => b.errorRate - a.errorRate)

  // Group by category
  const grouped: Record<string, BlindSpot[]> = {}
  enriched.forEach((spot) => {
    if (!grouped[spot.category]) grouped[spot.category] = []
    grouped[spot.category].push(spot)
  })

  // Build radar chart data — average accuracy per major topic
  const radarData = RADAR_TOPICS.map((topic) => {
    // Collect all subtopic_ids that belong to this radar axis
    const subtopicIds = topic.groupKeys.flatMap((gk) => {
      const group = SUBTOPIC_GROUPS.find((g) => g.key === gk)
      return group ? group.subtopicIds : []
    })
    // Find matching blind spots
    const matching = enriched.filter((s) => subtopicIds.includes(s.subtopic_id))
    const totalAttempts = matching.reduce((a, s) => a + s.totalAttempts, 0)
    const totalCorrect = matching.reduce((a, s) => a + s.correctCount, 0)
    return {
      label: topic.label,
      score: totalAttempts > 0 ? totalCorrect : 0,
      maxScore: totalAttempts > 0 ? totalAttempts : 0,
    }
  }).filter((d) => d.maxScore > 0)

  return (
    <div className="p-6 sm:p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-gray-900">Weak Spots Report</h1>
        <Link
          href="/progress"
          className="text-sm text-blue-800 hover:underline font-medium"
        >
          &larr; Back to Progress
        </Link>
      </div>
      <p className="text-gray-500 text-sm mb-8">
        Subtopics where you struggle the most, ranked by error rate.
      </p>

      {enriched.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-gray-500 font-medium mb-2">No weak spots detected yet</p>
          <p className="text-gray-400 text-sm mb-6">
            Take a few tests first to identify your weak areas. We need at least 2 attempts per
            subtopic.
          </p>
          <Link
            href="/dashboard"
            className="px-5 py-2.5 bg-blue-800 text-white rounded-lg text-sm font-semibold hover:bg-blue-900 transition-colors"
          >
            Start a Practice Test
          </Link>
        </div>
      ) : (
        <>
          {/* CTA */}
          <Link
            href="/test/weak-spots"
            className="mb-8 flex items-center justify-center gap-2 w-full px-5 py-3.5 bg-blue-800 text-white rounded-xl font-semibold hover:bg-blue-900 transition-colors text-center"
          >
            <span>🎯</span>
            <span>Start Weak Spot Test</span>
          </Link>

          {/* Proficiency Radar Chart */}
          {radarData.length >= 3 && (
            <section className="mb-8">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 text-center">
                  Topic Proficiency
                </h2>
                <RadarChart data={radarData} />
              </div>
            </section>
          )}

          {Object.entries(grouped).map(([category, items]) => (
            <section key={category} className="mb-8">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                {category}
              </h2>
              <div className="space-y-2">
                {items.map((spot) => {
                  const errorPct = Math.round(spot.errorRate * 100)
                  const barColor =
                    errorPct > 50
                      ? 'bg-red-500'
                      : errorPct >= 30
                        ? 'bg-orange-400'
                        : 'bg-green-500'
                  const labelColor =
                    errorPct > 50
                      ? 'text-red-600'
                      : errorPct >= 30
                        ? 'text-orange-500'
                        : 'text-green-600'

                  return (
                    <div
                      key={spot.subtopic_id}
                      className="bg-white rounded-xl border border-gray-200 px-5 py-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-800 text-sm">{spot.label}</span>
                        <span className={`text-sm font-bold ${labelColor}`}>{errorPct}% errors</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-1.5">
                        <div
                          className={`h-full rounded-full transition-all ${barColor}`}
                          style={{ width: `${errorPct}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                        <span>
                          {spot.correctCount}/{spot.totalAttempts} correct
                        </span>
                        <span>
                          Last attempted{' '}
                          {new Date(spot.lastAttempted).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Link href="/learn" className="text-xs px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 font-medium hover:bg-blue-100">
                          Study This Topic
                        </Link>
                        <Link href={`/test/${spot.category === 'Type I' ? 'type-1' : spot.category === 'Type II' ? 'type-2' : spot.category === 'Type III' ? 'type-3' : 'core'}?mode=practice`}
                          className="text-xs px-3 py-1.5 rounded-lg bg-green-50 text-green-700 font-medium hover:bg-green-100">
                          Practice {spot.category}
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          ))}
        </>
      )}
    </div>
  )
}
