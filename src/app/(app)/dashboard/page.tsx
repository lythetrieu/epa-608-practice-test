import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { TIER_LIMITS, type Tier, type Category } from '@/types'
import { PassPredictor } from './pass-predictor'
import { StreakBoard } from './streak-board'
import { OfflineSyncCard } from '@/components/OfflineSyncCard'
import { Onboarding } from './onboarding'

const CATEGORIES: { slug: string; label: string; category: Category | 'Universal'; emoji: string; desc: string; paidOnly: boolean }[] = [
  { slug: 'core', label: 'Core', category: 'Core', emoji: '📝', desc: 'Refrigerant fundamentals & regulations', paidOnly: false },
  { slug: 'type-1', label: 'Type I', category: 'Type I', emoji: '❄️', desc: 'Small appliances (under 5 lbs)', paidOnly: true },
  { slug: 'type-2', label: 'Type II', category: 'Type II', emoji: '🔧', desc: 'High-pressure appliances', paidOnly: true },
  { slug: 'type-3', label: 'Type III', category: 'Type III', emoji: '🏭', desc: 'Low-pressure appliances', paidOnly: true },
  { slug: 'universal', label: 'Universal', category: 'Universal', emoji: '🎯', desc: 'All 4 sections combined (100 questions)', paidOnly: true },
]

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/dashboard')

  const { data: profile } = await supabase
    .from('users_profile')
    .select('tier, lifetime_access, ai_queries_today')
    .eq('id', user.id)
    .single()

  const tier = (profile?.tier ?? 'free') as Tier
  const isFree = tier === 'free'
  const limits = TIER_LIMITS[tier]
  const name = user.email?.split('@')[0] ?? 'there'

  // All completed sessions
  const { data: allSessions } = await supabase
    .from('test_sessions')
    .select('id, category, score, total, started_at, submitted_at')
    .eq('user_id', user.id)
    .not('submitted_at', 'is', null)
    .order('submitted_at', { ascending: false })

  const totalTests = allSessions?.length ?? 0
  const recentSessions = allSessions?.slice(0, 5) ?? []

  // Activity dates for streak
  const activityDates: string[] = []
  if (allSessions) {
    const dateSet = new Set<string>()
    for (const s of allSessions) {
      if (s.started_at) dateSet.add(s.started_at.slice(0, 10))
      if (s.submitted_at) dateSet.add(s.submitted_at.slice(0, 10))
    }
    activityDates.push(...Array.from(dateSet).sort())
  }

  // Pass Predictor
  let readinessScore = 0
  if (totalTests >= 3 && allSessions) {
    const byCategory: Record<string, { score: number; total: number }[]> = {}
    for (const s of allSessions) {
      if (s.score === null) continue
      if (!byCategory[s.category]) byCategory[s.category] = []
      if (byCategory[s.category].length < 5) byCategory[s.category].push({ score: s.score, total: s.total })
    }
    let tw = 0, totalW = 0
    for (const cat of [...TIER_LIMITS[tier].categories, 'Universal']) {
      const cs = byCategory[cat]
      if (!cs?.length) continue
      const avg = (cs.reduce((a, s) => a + s.score, 0) / cs.reduce((a, s) => a + s.total, 0)) * 100
      tw += avg * cs.length
      totalW += cs.length
    }
    readinessScore = totalW > 0 ? Math.round(tw / totalW) : 0
  }

  // Best scores per category
  const bestScores: Record<string, number> = {}
  if (allSessions) {
    for (const s of allSessions) {
      if (s.score === null) continue
      const pct = Math.round((s.score / s.total) * 100)
      if (!bestScores[s.category] || pct > bestScores[s.category]) bestScores[s.category] = pct
    }
  }
  const hasPassedAny = Object.values(bestScores).some(s => s >= 70)

  // Determine recommended next step
  let recommendedAction: { text: string; href: string; desc: string } | null = null
  if (totalTests === 0) {
    recommendedAction = { text: 'Start Core Practice', href: '/practice/core', desc: 'New here? Start with practice mode — no timer, instant feedback.' }
  } else if (!bestScores['Core'] || bestScores['Core'] < 70) {
    recommendedAction = { text: 'Practice Core Again', href: '/practice/core', desc: 'Keep practicing Core until you consistently score above 70%.' }
  } else if (isFree) {
    recommendedAction = { text: 'Upgrade to Unlock More', href: '/pricing', desc: 'You passed Core! Upgrade to access Type I, II, III.' }
  } else {
    const nextUnpassed = CATEGORIES.find(c => c.category !== 'Universal' && (!bestScores[c.category] || bestScores[c.category] < 70))
    if (nextUnpassed) {
      recommendedAction = { text: `Practice ${nextUnpassed.label}`, href: `/practice/${nextUnpassed.slug}`, desc: `Focus on ${nextUnpassed.label} next to prepare for Universal.` }
    } else {
      recommendedAction = { text: 'Take Universal Test', href: '/test/universal', desc: 'You\'ve passed all sections! Try the full Universal exam.' }
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl">
      <Onboarding show={totalTests === 0} />

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Welcome back, {name}!</h1>
        <p className="text-gray-400 text-sm mt-1">{user.email}</p>
      </div>

      {/* Upgrade banner */}
      {isFree && (
        <div className="bg-gradient-to-r from-blue-800 to-blue-600 rounded-2xl p-5 text-white mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <p className="font-bold text-lg">Unlock all 4 exam types</p>
            <p className="text-blue-100 text-sm mt-0.5">One-time $19.99 — lifetime access, no subscription.</p>
          </div>
          <Link href="/pricing" className="shrink-0 px-5 py-2.5 bg-white text-blue-800 rounded-xl font-bold hover:bg-blue-50 transition-colors">
            Upgrade
          </Link>
        </div>
      )}

      {/* ═══ YOUR STUDY PATH ═══ */}
      <section className="mb-8">
        <h2 className="text-lg font-bold text-gray-900 mb-3">Your Study Path</h2>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Link href="/flashcards" className="rounded-xl border border-gray-200 bg-white p-4 text-center hover:border-blue-300 hover:bg-blue-50/50 transition-all group">
            <div className="text-2xl mb-1">1</div>
            <div className="font-semibold text-sm text-gray-800 group-hover:text-blue-800">Learn</div>
            <div className="text-xs text-gray-400 mt-1">Flashcards & Podcast</div>
          </Link>
          <Link href="/practice/core" className="rounded-xl border border-gray-200 bg-white p-4 text-center hover:border-green-300 hover:bg-green-50/50 transition-all group">
            <div className="text-2xl mb-1">2</div>
            <div className="font-semibold text-sm text-gray-800 group-hover:text-green-800">Practice</div>
            <div className="text-xs text-gray-400 mt-1">No timer, instant feedback</div>
          </Link>
          <Link href="/test/core" className="rounded-xl border border-gray-200 bg-white p-4 text-center hover:border-red-300 hover:bg-red-50/50 transition-all group">
            <div className="text-2xl mb-1">3</div>
            <div className="font-semibold text-sm text-gray-800 group-hover:text-red-800">Test</div>
            <div className="text-xs text-gray-400 mt-1">Timed exam simulation</div>
          </Link>
        </div>

        {/* Recommended next step */}
        {recommendedAction && (
          <Link href={recommendedAction.href}
            className="block rounded-xl border-2 border-blue-200 bg-blue-50 p-4 hover:border-blue-400 transition-all group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-600 font-medium uppercase tracking-wide">Recommended next step</p>
                <p className="font-bold text-blue-900 mt-0.5">{recommendedAction.text}</p>
                <p className="text-sm text-blue-700/70 mt-0.5">{recommendedAction.desc}</p>
              </div>
              <span className="text-blue-800 font-medium text-sm shrink-0 group-hover:underline">Go &rarr;</span>
            </div>
          </Link>
        )}
      </section>

      {/* ═══ READINESS ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <PassPredictor readinessScore={readinessScore} totalTests={totalTests} />
        <StreakBoard activityDates={activityDates} />
      </div>

      {/* Certificate card */}
      {hasPassedAny && (
        <Link href="/certificate"
          className="block rounded-xl border-2 border-amber-300 bg-gradient-to-r from-blue-900 to-blue-800 p-4 mb-8 hover:from-blue-800 hover:to-blue-700 transition-all group">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🏆</span>
            <div>
              <p className="font-semibold text-white">View Your Certificate</p>
              <p className="text-xs text-blue-200/70">Download and share your achievement.</p>
            </div>
            <span className="ml-auto text-amber-300 text-sm group-hover:underline">View &rarr;</span>
          </div>
        </Link>
      )}

      {/* ═══ EXAM SECTIONS ═══ */}
      <section className="mb-8">
        <h2 className="text-lg font-bold text-gray-900 mb-1">Exam Sections</h2>
        <p className="text-sm text-gray-400 mb-4">Choose a section, then pick your study mode.</p>

        <div className="space-y-3">
          {CATEGORIES.map(c => {
            const locked = c.paidOnly && isFree
            const best = bestScores[c.category]
            const passed = best !== undefined && best >= 70

            if (locked) {
              return (
                <div key={c.slug} className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 flex items-center gap-4">
                  <span className="text-2xl">{c.emoji}</span>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-400">{c.label}</div>
                    <div className="text-xs text-gray-400">{c.desc}</div>
                  </div>
                  <Link href="/pricing" className="text-xs text-blue-700 font-medium hover:underline">Upgrade 🔒</Link>
                </div>
              )
            }

            return (
              <div key={c.slug} className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{c.emoji}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{c.label}</span>
                      {passed && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Passed {best}%</span>}
                      {best !== undefined && !passed && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">Best: {best}%</span>}
                    </div>
                    <div className="text-xs text-gray-400">{c.desc}</div>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Link href={`/flashcards`} className="text-xs px-3 py-1.5 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors font-medium">
                    🃏 Flashcards
                  </Link>
                  <Link href={`/practice/${c.slug}`} className="text-xs px-3 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors font-medium">
                    📖 Practice
                  </Link>
                  <Link href={`/test/${c.slug}`} className="text-xs px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors font-medium">
                    ⏱️ Timed Test
                  </Link>
                  <Link href={`/podcast`} className="text-xs px-3 py-1.5 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors font-medium">
                    🎧 Podcast
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ═══ STUDY TOOLS ═══ */}
      <section className="mb-8">
        <h2 className="text-lg font-bold text-gray-900 mb-1">Study Tools</h2>
        <p className="text-sm text-gray-400 mb-4">Extra tools to help you prepare.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <ToolCard href="/progress/weak-spots" icon="🎯" title="Weak Spots" desc="AI finds your weak areas" />
          <ToolCard href="/tutor" icon="🎓" title="AI Tutor" desc={`Ask questions (${limits.aiQueriesPerDay}/day)`} />
          <ToolCard href="/progress" icon="📊" title="Progress" desc="Scores & analytics" />
        </div>
      </section>

      {/* AI queries + offline */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {limits.aiQueriesPerDay > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              <span className="font-medium text-gray-900">AI Queries</span>
              <span className="text-gray-400 ml-2">
                {profile?.ai_queries_today ?? 0} / {limits.aiQueriesPerDay === Infinity ? '∞' : limits.aiQueriesPerDay}
              </span>
            </div>
            <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-medium">Daily</span>
          </div>
        )}
        <OfflineSyncCard />
      </div>

      {/* ═══ RECENT TESTS ═══ */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Recent Tests</h2>
          <Link href="/progress" className="text-sm text-blue-800 hover:underline font-medium">View all &rarr;</Link>
        </div>
        {recentSessions.length > 0 ? (
          <div className="space-y-2">
            {recentSessions.map(s => {
              const pct = s.score !== null ? Math.round((s.score / s.total) * 100) : 0
              const passed = pct >= 70
              return (
                <div key={s.id} className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center justify-between">
                  <div>
                    <span className="font-medium text-gray-800">{s.category}</span>
                    <span className="text-sm text-gray-400 ml-3">{new Date(s.submitted_at!).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`font-bold text-lg ${passed ? 'text-green-600' : 'text-red-500'}`}>{pct}%</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {passed ? 'Pass' : 'Fail'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
            <p className="text-gray-400 text-sm">No completed tests yet. Start with Practice above!</p>
          </div>
        )}
      </section>
    </div>
  )
}

function ToolCard({ href, icon, title, desc }: { href: string; icon: string; title: string; desc: string }) {
  return (
    <Link href={href} className="rounded-xl border border-gray-200 bg-white p-4 hover:border-blue-300 hover:bg-blue-50/30 transition-all group">
      <div className="text-2xl mb-2">{icon}</div>
      <div className="font-semibold text-sm text-gray-800 group-hover:text-blue-800">{title}</div>
      <div className="text-xs text-gray-400 mt-0.5">{desc}</div>
    </Link>
  )
}
