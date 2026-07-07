import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserProfile } from '@/lib/supabase/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { TIER_LIMITS, type Tier } from '@/types'
import { computeReadiness } from '@/lib/readiness'
import {
  SECTION_CATEGORIES,
  totalConceptsByCategory,
  masteredConceptsByCategory,
} from '@/lib/section-progress'
import { GuidedTour } from './guided-tour'
import { Onboarding } from './onboarding'
import { ProActivatedBanner } from './pro-activated-banner'
import { AnonymousMigrator } from './anonymous-migrator'
import type { ReactNode } from 'react'
import {
  FileText, Snowflake, Wrench, Factory, Flame, Bot,
  ArrowRight, Lightbulb, AlertTriangle, Lock,
} from 'lucide-react'

// Icon + chip color per section (matches the prototype's colored icon chips)
const SECTION_STYLE: Record<string, { icon: ReactNode; chip: string }> = {
  Core:       { icon: <FileText size={16} />,  chip: 'bg-sky-100 text-sky-700' },
  'Type I':   { icon: <Snowflake size={16} />, chip: 'bg-teal-100 text-teal-700' },
  'Type II':  { icon: <Wrench size={16} />,    chip: 'bg-violet-100 text-violet-700' },
  'Type III': { icon: <Factory size={16} />,   chip: 'bg-amber-100 text-amber-700' },
}

// SVG progress-ring math (r=50 in a 120 viewBox, like the prototype)
const RING_R = 50
const RING_C = 2 * Math.PI * RING_R // ≈ 314.16

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

  // Average score across all completed tests
  let avgScore: number | null = null
  const scored = (allSessions ?? []).filter(s => s.score !== null && s.total > 0)
  if (scored.length > 0) {
    avgScore = Math.round(
      scored.reduce((sum, s) => sum + (s.score! / s.total) * 100, 0) / scored.length
    )
  }

  // ─── Exam readiness (real per-cert pass marks, shared lib) ───
  const pursue = [...TIER_LIMITS[tier].categories, 'Universal']
  const readiness = computeReadiness(allSessions ?? [], pursue)
  const overall = readiness.overall

  // ─── Study Path levels mastered per section (Study X/Y) ───
  // Falls back to 0/Y if the table is missing or the query fails.
  let masteredByCat: Record<string, number> = {}
  try {
    const { data: mastered } = await supabase
      .from('study_path_progress')
      .select('concept_id')
      .eq('user_id', user.id)
      .eq('status', 'mastered')
    masteredByCat = masteredConceptsByCategory(
      (mastered ?? []).map(r => r.concept_id as string)
    )
  } catch {
    masteredByCat = {}
  }
  const totalsByCat = totalConceptsByCategory()

  // ─── Questions practiced per section (RPC; omit the number on failure) ───
  let practicedByCat: Record<string, number> | null = null
  try {
    const admin = createAdminClient()
    const { data: agg, error: rpcError } = await admin.rpc('weak_spots_by_category', {
      p_user_id: user.id,
    })
    if (!rpcError && Array.isArray(agg)) {
      practicedByCat = {}
      for (const row of agg as { category: string; wrong: number; total: number }[]) {
        practicedByCat[row.category || 'Core'] = Number(row.total) || 0
      }
    }
  } catch {
    practicedByCat = null
  }

  // ─── Coach line: the single clear next step ───
  let coachLine: string
  if (totalTests === 0) {
    coachLine = 'Start with Core — the fundamentals every EPA 608 cert builds on.'
  } else if (!readiness.enoughData) {
    coachLine = 'Take a few tests to unlock your readiness score.'
  } else if (readiness.weakest && !readiness.weakest.ready) {
    const w = readiness.weakest
    coachLine = `Focus on ${w.category} — you're at ${w.avgPct}%, need ${w.threshold}%.`
  } else {
    coachLine = "You're exam-ready. Lock it in with a Universal simulation."
  }

  const showWeakestAlert =
    readiness.enoughData && !!readiness.weakest && !readiness.weakest.ready

  return (
    <div className="p-3 sm:p-5 max-w-3xl mx-auto">
      <AnonymousMigrator />
      {totalTests === 0 && <GuidedTour />}
      <Onboarding show={totalTests === 0} />
      <ProActivatedBanner isPro={!isFree && !!profile?.lifetime_access} />

      {/* ═══ HEADER ═══ */}
      <div className="flex items-center justify-between mb-3" data-tour="header">
        <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">Welcome, {name}!</h1>
      </div>

      {/* ═══ READINESS HERO — navy card with progress ring ═══ */}
      <section
        className="flex items-center gap-4 rounded-2xl p-4 sm:p-5 mb-3 text-white"
        style={{ background: '#001d57' }}
        data-tour="readiness"
      >
        <svg
          width="84"
          height="84"
          viewBox="0 0 120 120"
          className="shrink-0"
          role="img"
          aria-label={
            readiness.enoughData
              ? `Exam readiness: ${overall}%`
              : 'Exam readiness not yet available'
          }
        >
          <circle cx="60" cy="60" r={RING_R} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="13" />
          {readiness.enoughData && (
            <circle
              cx="60"
              cy="60"
              r={RING_R}
              fill="none"
              stroke="#38bdf8"
              strokeWidth="13"
              strokeLinecap="round"
              strokeDasharray={RING_C.toFixed(1)}
              strokeDashoffset={(RING_C * (1 - overall / 100)).toFixed(1)}
              transform="rotate(-90 60 60)"
            />
          )}
          <text x="60" y="58" textAnchor="middle" fontSize="30" fontWeight="700" fill="#fff">
            {readiness.enoughData ? `${overall}%` : '—'}
          </text>
          <text x="60" y="78" textAnchor="middle" fontSize="12" fill="rgba(255,255,255,0.7)">
            ready
          </text>
        </svg>
        <div className="min-w-0">
          <p className="text-xs text-blue-200 mb-1">Exam readiness</p>
          <p className="text-sm font-medium leading-relaxed">
            <Lightbulb size={15} className="inline align-[-2px] mr-1" aria-hidden="true" />
            {coachLine}
          </p>
        </div>
      </section>

      {/* ═══ STAT CARDS — streak · tests · avg score ═══ */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-white border border-gray-200 rounded-xl px-2 py-3 text-center">
          <p className="text-lg font-bold text-amber-600 inline-flex items-center justify-center gap-1">
            <Flame size={16} aria-hidden="true" />{currentStreak}
          </p>
          <p className="text-[11px] text-gray-500">day streak</p>
        </div>
        <Link
          href="/progress"
          className="bg-white border border-gray-200 rounded-xl px-2 py-3 text-center hover:border-indigo-300 transition-colors"
        >
          <p className="text-lg font-bold text-gray-900">{totalTests}</p>
          <p className="text-[11px] text-gray-500">tests</p>
        </Link>
        <div className="bg-white border border-gray-200 rounded-xl px-2 py-3 text-center">
          <p className="text-lg font-bold text-gray-900">{avgScore !== null ? `${avgScore}%` : '—'}</p>
          <p className="text-[11px] text-gray-500">avg score</p>
        </div>
      </div>

      {/* ═══ CONTINUE STUDYING ═══ */}
      <Link
        href="/learn"
        data-tour="learn"
        className="flex w-full items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl px-4 font-semibold text-[15px] min-h-[48px] transition-colors"
      >
        Continue studying <ArrowRight size={18} aria-hidden="true" />
      </Link>

      {/* ═══ PROGRESS BY SECTION ═══ */}
      <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mt-5 mb-2 px-0.5">
        Progress by section
      </h2>
      {SECTION_CATEGORIES.map(category => {
        const style = SECTION_STYLE[category]
        const cat = readiness.byCategory.find(c => c.category === category)
        const isWeakest =
          !!readiness.weakest &&
          readiness.weakest.category === category &&
          !readiness.weakest.ready
        const mastered = masteredByCat[category] ?? 0
        const total = totalsByCat[category] ?? 0
        // null = RPC failed → omit the number; otherwise missing category = 0 practiced
        const practiced = practicedByCat === null ? undefined : (practicedByCat[category] ?? 0)

        return (
          <Link
            key={category}
            href={`/learn?section=${encodeURIComponent(category)}`}
            data-tour={category === 'Core' ? 'core' : undefined}
            className={`block bg-white border rounded-2xl px-4 py-3.5 mb-2.5 transition-colors ${
              isWeakest ? 'border-red-200 hover:border-red-300' : 'border-gray-200 hover:border-indigo-300'
            }`}
          >
            <div className="flex items-center gap-2.5 mb-2.5">
              <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${style.chip}`}>
                {style.icon}
              </span>
              <span className="text-[15px] font-semibold text-gray-900">{category}</span>
              {isWeakest && (
                <span className="text-[10px] font-bold uppercase bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                  weakest
                </span>
              )}
              <span
                className={`ml-auto text-sm font-bold ${
                  !cat ? 'text-gray-400' : cat.ready ? 'text-green-600' : 'text-orange-500'
                }`}
              >
                {cat ? `${cat.readinessPct}%` : '—'}
              </span>
            </div>
            <div className="h-[7px] rounded-full bg-indigo-50 overflow-hidden">
              <div
                className={`h-full rounded-full ${cat?.ready ? 'bg-green-600' : 'bg-orange-500'}`}
                style={{ width: `${cat?.readinessPct ?? 0}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-2">
              <span>Study {mastered}/{total} levels</span>
              {practiced !== undefined && <span>{practiced} practiced</span>}
            </div>
          </Link>
        )
      })}

      {/* ═══ WEAKEST ALERT ═══ */}
      {showWeakestAlert && (
        <Link
          href="/progress"
          className="flex items-center gap-2.5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 mb-3 mt-3 min-h-[44px] hover:border-red-300 transition-colors"
        >
          <AlertTriangle size={17} className="text-red-600 shrink-0" aria-hidden="true" />
          <span className="text-sm font-semibold text-red-700 truncate">
            Weakest: {readiness.weakest!.category}
          </span>
          <span className="ml-auto shrink-0 inline-flex items-center gap-1 text-xs font-bold text-red-600">
            Fix now <ArrowRight size={14} aria-hidden="true" />
          </span>
        </Link>
      )}

      {/* ═══ AI TUTOR (compact entry) ═══ */}
      <Link
        href="/tutor"
        data-tour="ai-tutor"
        className="flex items-center gap-3 bg-white border border-gray-200 rounded-2xl px-4 py-3 mb-3 mt-3 min-h-[44px] hover:border-indigo-300 transition-colors"
      >
        <Bot size={18} className="text-gray-500 shrink-0" aria-hidden="true" />
        <span className="text-sm font-semibold text-gray-800">AI Tutor</span>
        {isFree ? (
          <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 rounded-full px-2 py-0.5">
            <Lock size={10} aria-hidden="true" /> Pro
          </span>
        ) : (
          <ArrowRight size={16} className="ml-auto text-gray-400" aria-hidden="true" />
        )}
      </Link>

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
