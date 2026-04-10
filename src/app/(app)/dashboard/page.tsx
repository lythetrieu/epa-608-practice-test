import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { TIER_LIMITS, type Tier, type Category } from '@/types'
import { GuidedTour } from './guided-tour'
import { OfflineSyncCard } from '@/components/OfflineSyncCard'
import type { ReactNode } from 'react'
import {
  FileText, Snowflake, Wrench, Factory, Target,
  Layers, Headphones, Bot, BarChart3, Lock, Flame,
  Play, Timer, Download,
} from 'lucide-react'

const CATEGORIES: { slug: string; label: string; category: Category | 'Universal'; icon: ReactNode; desc: string; paidOnly: boolean }[] = [
  { slug: 'core', label: 'Core', category: 'Core', icon: <FileText size={24} />, desc: 'Fundamentals & regulations', paidOnly: false },
  { slug: 'type-1', label: 'Type I', category: 'Type I', icon: <Snowflake size={24} />, desc: 'Small appliances', paidOnly: true },
  { slug: 'type-2', label: 'Type II', category: 'Type II', icon: <Wrench size={24} />, desc: 'High-pressure', paidOnly: true },
  { slug: 'type-3', label: 'Type III', category: 'Type III', icon: <Factory size={24} />, desc: 'Low-pressure', paidOnly: true },
  { slug: 'universal', label: 'Universal', category: 'Universal', icon: <Target size={24} />, desc: 'All sections combined', paidOnly: true },
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

  // Streak calculation
  let currentStreak = 0
  if (allSessions) {
    const dateSet = new Set<string>()
    for (const s of allSessions) {
      if (s.started_at) dateSet.add(s.started_at.slice(0, 10))
      if (s.submitted_at) dateSet.add(s.submitted_at.slice(0, 10))
    }
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const d = new Date(today)
    const fmt = (dt: Date) => dt.toISOString().slice(0, 10)
    while (dateSet.has(fmt(d))) {
      currentStreak++
      d.setDate(d.getDate() - 1)
    }
    if (currentStreak === 0) {
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      const y = new Date(yesterday)
      while (dateSet.has(fmt(y))) {
        currentStreak++
        y.setDate(y.getDate() - 1)
      }
    }
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

  // Determine recommended next step
  let recommendedAction: { text: string; href: string; desc: string } | null = null
  if (totalTests === 0) {
    recommendedAction = { text: 'Start Core Practice', href: '/practice/core', desc: 'New here? Start with practice mode \u2014 no timer, instant feedback.' }
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

  // Pass predictor color
  const passColor = readinessScore >= 90 ? 'text-yellow-600' : readinessScore >= 70 ? 'text-green-600' : readinessScore >= 50 ? 'text-orange-500' : 'text-red-500'
  const passBg = readinessScore >= 90 ? 'bg-yellow-50' : readinessScore >= 70 ? 'bg-green-50' : readinessScore >= 50 ? 'bg-orange-50' : 'bg-red-50'

  return (
    <div className="p-4 sm:p-6 max-w-5xl">
      {totalTests === 0 && <GuidedTour />}

      {/* ═══ HEADER ROW: Welcome + Pass Predictor + Streak ═══ */}
      <div data-tour="header" className="flex items-center justify-between mb-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">Welcome, {name}!</h1>
          <p className="text-gray-400 text-xs mt-0.5 truncate">{user.email}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-3">
          {/* Pass Predictor badge */}
          {totalTests >= 3 ? (
            <Link href="/progress" className={`${passBg} ${passColor} px-3 py-1.5 rounded-lg text-sm font-bold hover:opacity-80 transition-opacity`} title="Pass Predictor">
              Pass: {readinessScore}%
            </Link>
          ) : (
            <span className="bg-gray-100 text-gray-400 px-3 py-1.5 rounded-lg text-sm font-medium" title="Take 3+ tests to see pass prediction">
              Pass: --
            </span>
          )}
          {/* Streak badge */}
          {currentStreak > 0 ? (
            <span className="bg-orange-50 text-orange-600 px-2.5 py-1.5 rounded-lg text-sm font-bold inline-flex items-center gap-0.5" title={`${currentStreak} day streak`}>
              <Flame size={16} />{currentStreak}
            </span>
          ) : (
            <span className="bg-gray-100 text-gray-400 px-2.5 py-1.5 rounded-lg text-sm font-medium inline-flex items-center gap-0.5" title="Start a streak by practicing daily">
              <Flame size={16} /> 0
            </span>
          )}
        </div>
      </div>

      {/* ═══ UPGRADE BANNER (free only, compact) ═══ */}
      {isFree && (
        <div className="bg-gradient-to-r from-blue-800 to-blue-600 rounded-xl px-4 py-3 text-white mb-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-bold text-sm sm:text-base">Unlock all 4 exam types</p>
            <p className="text-blue-100 text-xs">One-time $19.99 \u2014 lifetime access</p>
          </div>
          <Link href="/pricing" className="shrink-0 px-4 py-2 bg-white text-blue-800 rounded-lg font-bold text-sm hover:bg-blue-50 transition-colors">
            Upgrade
          </Link>
        </div>
      )}

      {/* ═══ RECOMMENDED NEXT STEP (slim banner) ═══ */}
      {recommendedAction && (
        <Link href={recommendedAction.href}
          className="block rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 mb-4 hover:border-blue-400 transition-all group">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="text-xs text-blue-600 font-medium uppercase tracking-wide">Next step: </span>
              <span className="font-bold text-blue-900 text-sm">{recommendedAction.text}</span>
              <span className="text-xs text-blue-700/70 ml-2 hidden sm:inline">{recommendedAction.desc}</span>
            </div>
            <span className="text-blue-800 font-medium text-sm shrink-0 group-hover:underline">Go &rarr;</span>
          </div>
        </Link>
      )}

      {/* ═══ EXAM SECTIONS: Horizontal cards ═══ */}
      <section className="mb-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Exam Sections</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-3">
          {CATEGORIES.map(c => {
            const locked = c.paidOnly && isFree
            const best = bestScores[c.category]
            const passed = best !== undefined && best >= 70

            return (
              <div
                key={c.slug}
                data-tour={c.slug === 'core' ? 'core' : undefined}
                className={`rounded-xl border p-3 flex flex-col items-center text-center transition-all ${
                  locked
                    ? 'border-dashed border-gray-200 bg-gray-50'
                    : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm'
                }`}
              >
                <span className="mb-1">{c.icon}</span>
                <span className={`font-semibold text-sm ${locked ? 'text-gray-400' : 'text-gray-900'}`}>{c.label}</span>
                <span className="text-[10px] text-gray-400 leading-tight mt-0.5">{c.desc}</span>

                {/* Score or lock indicator */}
                {locked ? (
                  <Link href="/pricing" className="mt-2 text-[10px] text-blue-700 font-medium hover:underline inline-flex items-center gap-0.5"><Lock size={10} /> Upgrade</Link>
                ) : (
                  <>
                    {passed && (
                      <span className="mt-1.5 text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">{best}% \u2713</span>
                    )}
                    {best !== undefined && !passed && (
                      <span className="mt-1.5 text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-medium">{best}%</span>
                    )}
                    <div className="flex gap-1 mt-2">
                      <Link href={`/practice/${c.slug}`} className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-md bg-green-50 text-green-700 hover:bg-green-100 font-medium" title="Practice">
                        <Play size={10} /> Practice
                      </Link>
                      <Link href={`/test/${c.slug}`} className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium" title="Timed Test">
                        <Timer size={10} /> Test
                      </Link>
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* ═══ TOOLS ROW ═══ */}
      <section className="mb-4" data-tour="tools">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Study Tools</h2>
        <div className="flex flex-wrap gap-2">
          <ToolButton href="/flashcards" icon={<Layers size={18} />} label="Flashcards" />
          <ToolButton href="/podcast" icon={<Headphones size={18} />} label="Podcast" />
          <ToolButton href="/tutor" icon={<Bot size={18} />} label="AI Tutor" dataTour="ai-tutor" />
          <ToolButton href="/progress" icon={<BarChart3 size={18} />} label="Progress" />
          <ToolButton href="/progress/weak-spots" icon={<Target size={18} />} label="Weak Spots" />
        </div>
        <div className="mt-3">
          <OfflineSyncCard />
        </div>
      </section>

      {/* ═══ RECENT TESTS (compact, 1-2 rows) ═══ */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Recent Tests</h2>
          {recentSessions.length > 0 && (
            <Link href="/progress" className="text-xs text-blue-800 hover:underline font-medium">View all &rarr;</Link>
          )}
        </div>
        {recentSessions.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {recentSessions.map(s => {
              const pct = s.score !== null ? Math.round((s.score / s.total) * 100) : 0
              const passed = pct >= 70
              return (
                <div key={s.id} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm ${
                  passed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                }`}>
                  <span className="font-medium text-gray-700 text-xs">{s.category}</span>
                  <span className={`font-bold text-xs ${passed ? 'text-green-600' : 'text-red-500'}`}>{pct}%</span>
                  <span className={`text-[10px] ${passed ? 'text-green-500' : 'text-red-400'}`}>{passed ? '\u2713' : '\u2717'}</span>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-gray-400 text-sm">No completed tests yet. Start with Core above!</p>
        )}
      </section>
    </div>
  )
}

function ToolButton({ href, icon, label, dataTour }: { href: string; icon: ReactNode; label: string; dataTour?: string }) {
  return (
    <Link
      href={href}
      data-tour={dataTour}
      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/30 transition-all text-sm font-medium text-gray-700 hover:text-blue-800"
    >
      {icon}
      <span>{label}</span>
    </Link>
  )
}
