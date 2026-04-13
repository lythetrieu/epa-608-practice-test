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
  Play, Award, BookOpen,
} from 'lucide-react'
import ActivityHeatmap from './ActivityHeatmap'

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

  // Activity heatmap data (tests per day for the last year)
  const activityData: Record<string, number> = {}
  if (allSessions) {
    for (const s of allSessions) {
      if (s.submitted_at) {
        const day = s.submitted_at.slice(0, 10)
        activityData[day] = (activityData[day] || 0) + 1
      }
    }
  }

  // Determine recommended next step
  let recommendedAction: { text: string; href: string; desc: string } | null = null
  if (totalTests === 0) {
    recommendedAction = { text: 'Start Core Practice', href: '/test/core?mode=practice', desc: 'New here? Start with practice mode — no timer, instant feedback.' }
  } else if (!bestScores['Core'] || bestScores['Core'] < 70) {
    recommendedAction = { text: 'Practice Core Again', href: '/test/core?mode=practice', desc: 'Keep practicing Core until you consistently score above 70%.' }
  } else if (isFree) {
    recommendedAction = { text: 'Upgrade to Unlock More', href: '/pricing', desc: 'You passed Core! Upgrade to access Type I, II, III.' }
  } else {
    const nextUnpassed = CATEGORIES.find(c => c.category !== 'Universal' && (!bestScores[c.category] || bestScores[c.category] < 70))
    if (nextUnpassed) {
      recommendedAction = { text: `Practice ${nextUnpassed.label}`, href: `/test/${nextUnpassed.slug}?mode=practice`, desc: `Focus on ${nextUnpassed.label} next to prepare for Universal.` }
    } else {
      recommendedAction = { text: 'Take Universal Test', href: '/test/universal', desc: 'You\'ve passed all sections! Try the full Universal exam.' }
    }
  }

  // Pass predictor color
  const passColor = readinessScore >= 90 ? 'text-yellow-600' : readinessScore >= 70 ? 'text-green-600' : readinessScore >= 50 ? 'text-orange-500' : 'text-red-500'
  const passBg = readinessScore >= 90 ? 'bg-yellow-50' : readinessScore >= 70 ? 'bg-green-50' : readinessScore >= 50 ? 'bg-orange-50' : 'bg-red-50'

  return (
    <div className="p-3 sm:p-5 max-w-6xl">
      {totalTests === 0 && <GuidedTour />}

      {/* ═══ ROW 1: Header + Quick Start ═══ */}
      <div className="flex items-center justify-between mb-3" data-tour="header">
        <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">Welcome, {name}!</h1>
        <div className="flex items-center gap-2 shrink-0 ml-3">
          {totalTests >= 3 && (
            <Link href="/progress" className={`${passBg} ${passColor} px-2.5 py-1.5 rounded-lg text-xs font-bold`}>
              {readinessScore}%
            </Link>
          )}
          {currentStreak > 0 && (
            <span className="bg-orange-50 text-orange-600 px-2.5 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1">
              <Flame size={14} />{currentStreak}
            </span>
          )}
        </div>
      </div>

      {/* ═══ QUICK START ═══ */}
      {recommendedAction && (
        <Link href={recommendedAction.href} data-tour="core"
          className="block rounded-xl bg-blue-800 px-4 py-3 mb-3 hover:bg-blue-900 transition-colors">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-bold text-white text-base">{recommendedAction.text}</p>
              <p className="text-blue-200 text-xs mt-0.5">{recommendedAction.desc}</p>
            </div>
            <Play size={28} className="text-white shrink-0" />
          </div>
        </Link>
      )}

      {/* ═══ STUDY PATH CTA ═══ */}
      <Link href="/learn" data-tour="learn"
        className="block rounded-xl bg-green-600 px-4 py-3 mb-3 hover:bg-green-700 transition-colors">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-bold text-white text-base">{totalTests === 0 ? 'Start Learning' : 'Continue Study Path'}</p>
            <p className="text-green-100 text-xs mt-0.5">
              {totalTests === 0 ? 'Learn every concept step by step before testing.' : 'Master all 23 concepts with guided lessons and quizzes.'}
            </p>
          </div>
          <BookOpen size={28} className="text-white shrink-0" />
        </div>
      </Link>

      {/* ═══ UPGRADE (free only, compact) ═══ */}
      {isFree && (
        <div className="bg-gradient-to-r from-blue-700 to-blue-500 rounded-xl px-4 py-3 text-white mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="font-bold text-sm">Unlock all 4 exam types</p>
            <p className="text-blue-100 text-xs">$19.99 one-time — lifetime access</p>
          </div>
          <Link href="/pricing" className="shrink-0 px-4 py-2 bg-white text-blue-800 rounded-lg font-bold text-xs min-h-[40px] inline-flex items-center">
            Upgrade
          </Link>
        </div>
      )}

      {/* ═══ PRACTICE (full width, horizontal scroll on mobile) ═══ */}
      <section className="mb-3">
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Practice</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {CATEGORIES.map(c => {
            const locked = c.paidOnly && isFree
            const best = bestScores[c.category]
            const passed = best !== undefined && best >= 70
            return (
              <Link
                key={c.slug}
                href={locked ? '/pricing' : `/test/${c.slug}`}
                className={`flex flex-col items-center p-3 rounded-xl text-center transition-all min-h-[80px] justify-center ${
                  locked
                    ? 'bg-gray-50 border border-dashed border-gray-300'
                    : 'bg-white border border-gray-200 hover:border-blue-300 hover:shadow-sm'
                }`}
              >
                <span className={`mb-1 ${locked ? 'text-gray-300' : ''}`}>{c.icon}</span>
                <span className={`font-bold text-sm ${locked ? 'text-gray-400' : 'text-gray-900'}`}>{c.label}</span>
                {locked && <Lock size={12} className="text-gray-400 mt-1" />}
                {!locked && best !== undefined && (
                  <span className={`text-xs font-bold mt-1 px-2 py-0.5 rounded-full ${passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                    {best}%
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      </section>

      {/* ═══ STUDY TOOLS + MY RESULTS (side by side) ═══ */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {/* Study Tools */}
        <div className="bg-white rounded-xl border border-gray-200 p-3" data-tour="tools">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Study Tools</h2>
          <div className="space-y-0.5">
            <CompactLink href="/learn" icon={<BookOpen size={16} />} label="Study Path" />
            <CompactLink href="/flashcards" icon={<Layers size={16} />} label="Flashcards" />
            <CompactLink href="/podcast" icon={<Headphones size={16} />} label="Listen & Learn" />
            <CompactLink href="/tutor" icon={<Bot size={16} />} label="AI Helper" dataTour="ai-tutor" />
          </div>
        </div>

        {/* My Results */}
        <div className="bg-white rounded-xl border border-gray-200 p-3">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">My Results</h2>
          <div className="space-y-0.5">
            <CompactLink href="/progress" icon={<BarChart3 size={16} />} label="Progress" />
            <CompactLink href="/progress/weak-spots" icon={<Target size={16} />} label="Weak Areas" />
            <CompactLink href="/certificate" icon={<Award size={16} />} label="Certificates" />
          </div>
        </div>
      </div>

      {/* ═══ RECENT TESTS (inline, compact) ═══ */}
      {recentSessions.length > 0 && (
        <div className="flex items-center gap-2 mb-3 overflow-x-auto">
          <span className="text-xs font-bold text-gray-500 uppercase shrink-0">Recent:</span>
          {recentSessions.map(s => {
            const pct = s.score !== null ? Math.round((s.score / s.total) * 100) : 0
            const passed = pct >= 70
            return (
              <span key={s.id} className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium shrink-0 ${
                passed ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
              }`}>
                {s.category} {pct}%
              </span>
            )
          })}
          <Link href="/progress" className="text-xs text-blue-700 shrink-0 hover:underline">All →</Link>
        </div>
      )}

      {/* ═══ HEATMAP + OFFLINE ═══ */}
      <ActivityHeatmap activityData={activityData} />
      <div className="mt-3">
        <OfflineSyncCard />
      </div>
    </div>
  )
}

function CompactLink({ href, icon, label, dataTour }: { href: string; icon: ReactNode; label: string; dataTour?: string }) {
  return (
    <Link href={href} data-tour={dataTour}
      className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium text-gray-700 hover:text-blue-800 min-h-[40px]">
      <span className="text-gray-500 shrink-0">{icon}</span>
      <span className="truncate">{label}</span>
    </Link>
  )
}
