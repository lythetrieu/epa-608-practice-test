import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserProfile } from '@/lib/supabase/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { TIER_LIMITS, type Tier, type Category } from '@/types'
import { computeReadiness } from '@/lib/readiness'
import { GuidedTour } from './guided-tour'
import { Onboarding } from './onboarding'
import { ProActivatedBanner } from './pro-activated-banner'
import { AnonymousMigrator } from './anonymous-migrator'
import type { ReactNode } from 'react'
import {
  FileText, Snowflake, Wrench, Factory, Target,
  Bot, BarChart3, Flame, BookOpen, CheckCircle2, ArrowRight, Lock,
} from 'lucide-react'

const CATEGORIES: { slug: string; label: string; category: Category | 'Universal'; icon: ReactNode }[] = [
  { slug: 'core',      label: 'Core',      category: 'Core',      icon: <FileText size={22} /> },
  { slug: 'type-1',   label: 'Type I',    category: 'Type I',    icon: <Snowflake size={22} /> },
  { slug: 'type-2',   label: 'Type II',   category: 'Type II',   icon: <Wrench size={22} /> },
  { slug: 'type-3',   label: 'Type III',  category: 'Type III',  icon: <Factory size={22} /> },
  { slug: 'universal',label: 'Universal', category: 'Universal', icon: <Target size={22} /> },
]

const SLUG_BY_CATEGORY: Record<string, string> = Object.fromEntries(
  CATEGORIES.map(c => [c.category, c.slug])
)

export default async function DashboardPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login?redirect=/dashboard')

  const supabase = await createClient()
  const profile = await getUserProfile(user.id)

  const tier = (profile?.tier ?? 'free') as Tier
  const isFree = tier === 'free'
  const name = user.email?.split('@')[0] ?? 'there'

  // All completed sessions (newest-first)
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

  // ─── Exam readiness (real per-cert pass marks, shared lib) ───
  const pursue = [...TIER_LIMITS[tier].categories, 'Universal']
  const readiness = computeReadiness(allSessions ?? [], pursue)

  const overall = readiness.overall
  const overallColor =
    overall >= 70 ? 'text-green-600' : overall >= 50 ? 'text-orange-500' : 'text-red-500'
  const overallBg =
    overall >= 70 ? 'bg-green-50' : overall >= 50 ? 'bg-orange-50' : 'bg-red-50'
  const barColor =
    overall >= 70 ? 'bg-green-500' : overall >= 50 ? 'bg-orange-400' : 'bg-red-400'

  // Best scores per category (for quick-access badges)
  const bestScores: Record<string, number> = {}
  if (allSessions) {
    for (const s of allSessions) {
      if (s.score === null) continue
      const pct = Math.round((s.score / s.total) * 100)
      if (!bestScores[s.category] || pct > bestScores[s.category]) bestScores[s.category] = pct
    }
  }

  // ─── Coach: the single clear next step ───
  let coach: { title: string; detail: string; primary: { text: string; href: string }; secondary?: { text: string; href: string } }
  if (totalTests === 0) {
    coach = {
      title: 'Start with Core',
      detail: 'Core covers the fundamentals every EPA 608 cert builds on. Begin in practice mode — no timer, instant feedback.',
      primary: { text: 'Start Core Practice', href: '/test/core?mode=practice' },
      secondary: { text: 'Learn first', href: '/learn' },
    }
  } else if (readiness.weakest && !readiness.weakest.ready) {
    const w = readiness.weakest
    const slug = SLUG_BY_CATEGORY[w.category] ?? 'core'
    coach = {
      title: `Focus on ${w.category}`,
      detail: `You're at ${w.avgPct}% and need ${w.threshold}% to pass. Study the concepts, then drill ${w.category} until you clear the bar.`,
      primary: { text: 'Open Study Path', href: '/learn' },
      secondary: { text: `Practice ${w.category}`, href: `/test/${slug}?mode=practice` },
    }
  } else {
    coach = {
      title: "You're exam-ready",
      detail: 'Your recent scores clear every pass mark you\'re pursuing. Lock it in with a full Universal timed simulation.',
      primary: { text: 'Take Universal Simulation', href: '/test/universal' },
    }
  }

  return (
    <div className="p-3 sm:p-5 max-w-3xl mx-auto">
      <AnonymousMigrator />
      {totalTests === 0 && <GuidedTour />}
      <Onboarding show={totalTests === 0} />
      <ProActivatedBanner isPro={!isFree && !!profile?.lifetime_access} />

      {/* ═══ HEADER ═══ */}
      <div className="flex items-center justify-between mb-4" data-tour="header">
        <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">Welcome, {name}!</h1>
        {currentStreak > 0 && (
          <span className="bg-orange-50 text-orange-600 px-2.5 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1 shrink-0 ml-3">
            <Flame size={14} />{currentStreak}
          </span>
        )}
      </div>

      {/* ═══ HOW YOU'RE DOING — Readiness hero ═══ */}
      <section className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 mb-3" data-tour="readiness">
        <div className="flex items-center gap-4">
          <div className={`${overallBg} rounded-2xl px-4 py-3 text-center shrink-0`}>
            <span className={`block text-3xl sm:text-4xl font-extrabold leading-none ${overallColor}`}>
              {readiness.enoughData ? `${overall}%` : '—'}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900">Exam Readiness</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {readiness.enoughData
                ? `Based on your ${readiness.confidence === 'high' ? 'many' : readiness.confidence === 'medium' ? 'recent' : 'few'} most recent tests`
                : 'Measured against the real EPA 608 pass marks'}
            </p>
          </div>
        </div>

        {readiness.enoughData ? (
          <div className="mt-4 space-y-3">
            {readiness.byCategory.map(c => (
              <div key={c.category}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-gray-800">{c.category}</span>
                  <span className={`inline-flex items-center gap-1 font-bold ${c.ready ? 'text-green-600' : 'text-gray-500'}`}>
                    {c.ready
                      ? <><CheckCircle2 size={13} /> Ready</>
                      : <>Keep going</>}
                    <span className="text-gray-400 font-medium ml-1">{c.avgPct}% / {c.threshold}%</span>
                  </span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${c.ready ? 'bg-green-500' : 'bg-orange-400'}`}
                    style={{ width: `${c.readinessPct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4">
            <div className="h-2 rounded-full bg-gray-100 overflow-hidden mb-3">
              <div className={`h-full rounded-full ${barColor}`} style={{ width: `${overall}%` }} />
            </div>
            <p className="text-sm text-gray-600">Take a few tests to unlock your readiness score.</p>
          </div>
        )}
      </section>

      {/* ═══ WHAT TO DO NEXT — Coach ═══ */}
      <section className="rounded-2xl px-4 py-4 mb-3 text-white" style={{ background: '#003087' }} data-tour="coach">
        <p className="text-[11px] font-bold uppercase tracking-wide text-blue-200 mb-1">Next step</p>
        <p className="font-bold text-base">{coach.title}</p>
        <p className="text-blue-100 text-xs mt-1 leading-relaxed">{coach.detail}</p>
        <div className="flex flex-wrap gap-2 mt-3">
          <Link
            href={coach.primary.href}
            className="inline-flex items-center gap-1.5 bg-white rounded-lg px-4 font-bold text-sm min-h-[44px]"
            style={{ color: '#003087' }}
          >
            {coach.primary.text} <ArrowRight size={16} />
          </Link>
          {coach.secondary && (
            <Link
              href={coach.secondary.href}
              className="inline-flex items-center rounded-lg px-4 font-bold text-sm min-h-[44px] border border-white/40 text-white hover:bg-white/10 transition-colors"
            >
              {coach.secondary.text}
            </Link>
          )}
        </div>
      </section>

      {/* ═══ QUICK ACCESS — practice categories ═══ */}
      <section className="mb-3" data-tour="core">
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Practice</h2>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {CATEGORIES.map(c => {
            const best = bestScores[c.category]
            const threshold = c.category === 'Type I' ? 84 : c.category === 'Universal' ? 72 : 70
            const passed = best !== undefined && best >= threshold
            return (
              <Link
                key={c.slug}
                href={`/test/${c.slug}`}
                className="flex flex-col items-center p-3 rounded-xl text-center min-h-[88px] justify-center bg-white border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all"
              >
                <span className="mb-1 text-gray-700">{c.icon}</span>
                <span className="font-bold text-xs text-gray-900">{c.label}</span>
                {best !== undefined && (
                  <span className={`text-[11px] font-bold mt-1 px-1.5 py-0.5 rounded-full ${passed ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {best}%
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      </section>

      {/* ═══ QUICK ACCESS — tools ═══ */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <ToolLink href="/learn" icon={<BookOpen size={18} />} label="Study Path" dataTour="learn" locked={!TIER_LIMITS[tier].hasStudyPath} />
        <ToolLink href="/tutor" icon={<Bot size={18} />} label="AI Tutor" dataTour="ai-tutor" locked={isFree} />
        <ToolLink href="/progress/weak-spots" icon={<Target size={18} />} label="Weak Spots" />
      </div>

      {/* ═══ RECENT TESTS (inline, compact) ═══ */}
      {recentSessions.length > 0 && (
        <div className="flex items-center gap-2 mb-3 overflow-x-auto">
          <span className="text-xs font-bold text-gray-500 uppercase shrink-0">Recent:</span>
          {recentSessions.map(s => {
            const pct = s.score !== null ? Math.round((s.score / s.total) * 100) : 0
            const threshold = s.category === 'Type I' ? 84 : s.category === 'Universal' ? 72 : 70
            const passed = pct >= threshold
            return (
              <span key={s.id} className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium shrink-0 ${
                passed ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {s.category} {pct}%
              </span>
            )
          })}
          <Link href="/progress" className="inline-flex items-center gap-1 text-xs text-blue-700 shrink-0 hover:underline">
            <BarChart3 size={13} /> All
          </Link>
        </div>
      )}

      {/* ═══ UPGRADE (free only, compact) ═══ */}
      {isFree && (
        <div className="rounded-xl px-4 py-3 text-white flex items-center justify-between gap-3" style={{ background: 'linear-gradient(to right, #003087, #0077b6)' }}>
          <div>
            <p className="font-bold text-sm">Unlock Pro features</p>
            <p className="text-blue-100 text-xs">$14.99 one-time — lifetime access</p>
          </div>
          <Link href="/checkout.html" className="shrink-0 px-4 bg-white rounded-lg font-bold text-xs min-h-[44px] inline-flex items-center" style={{ color: '#003087' }}>
            Upgrade
          </Link>
        </div>
      )}
    </div>
  )
}

function ToolLink({ href, icon, label, dataTour, locked }: { href: string; icon: ReactNode; label: string; dataTour?: string; locked?: boolean }) {
  return (
    <Link
      href={href}
      data-tour={dataTour}
      className="relative flex flex-col items-center justify-center gap-1 min-h-[64px] rounded-xl bg-white border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all text-xs font-semibold text-gray-700"
    >
      {locked && (
        <span className="absolute top-1.5 right-1.5 inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-600 bg-amber-50 rounded-full px-1.5 py-0.5">
          <Lock size={9} /> Pro
        </span>
      )}
      <span className="text-gray-500">{icon}</span>
      {label}
    </Link>
  )
}
