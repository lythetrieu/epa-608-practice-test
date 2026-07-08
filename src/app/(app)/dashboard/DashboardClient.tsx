'use client'

// Local-first Dashboard (Perf Phase 3). Renders the last cached snapshot from
// localStorage instantly, fetches /api/app/dashboard in the background, and
// re-renders silently when fresh data lands. JSX is moved verbatim from the
// old server page.tsx — only the data source changed.

import Link from 'next/link'
import { useLocalFirst } from '@/lib/local-first'
import type { DashboardData } from '@/lib/dashboard-data'
import { SECTION_CATEGORIES } from '@/lib/section-progress'
import { GuidedTour } from './guided-tour'
import { Onboarding } from './onboarding'
import { ProActivatedBanner } from './pro-activated-banner'
import { AnonymousMigrator } from './anonymous-migrator'
import type { ReactNode } from 'react'
import {
  FileText, Snowflake, Wrench, Factory, Flame,
  ArrowRight, Lightbulb, AlertTriangle, Timer,
} from 'lucide-react'
import { formatSecsLong, paceDelta } from '@/components/quiz/pacing'
import { PaceBar } from '@/components/quiz/pacing-bar'
import { ActivityHeatmap } from './ActivityHeatmap'

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

// First-ever-visit skeleton (no cached snapshot yet): navy hero block,
// 3 stat placeholders, 4 section card placeholders.
function DashboardSkeleton() {
  return (
    <div className="animate-pulse" aria-hidden>
      <div className="h-6 w-48 bg-gray-200 rounded mb-3" />
      <div className="rounded-2xl mb-3 h-[124px]" style={{ background: '#001d57' }} />
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-gray-100 rounded-xl h-[70px]" />
        <div className="bg-gray-100 rounded-xl h-[70px]" />
        <div className="bg-gray-100 rounded-xl h-[70px]" />
      </div>
      <div className="bg-gray-200 rounded-2xl h-12 mb-5" />
      <div className="bg-gray-100 rounded-2xl h-[104px] mb-2.5" />
      <div className="bg-gray-100 rounded-2xl h-[104px] mb-2.5" />
      <div className="bg-gray-100 rounded-2xl h-[104px] mb-2.5" />
      <div className="bg-gray-100 rounded-2xl h-[104px] mb-2.5" />
    </div>
  )
}

export function DashboardClient({ userId, userName }: { userId: string; userName: string }) {
  const { data, fresh, error, refresh } = useLocalFirst<DashboardData>(
    `dashboard:${userId}`,
    '/api/app/dashboard'
  )

  // No snapshot yet (first-ever visit) — skeleton, or a retry prompt on failure.
  if (data === null) {
    return (
      <div className="p-3 sm:p-5 max-w-3xl mx-auto">
        <AnonymousMigrator />
        {error ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center">
            <p className="text-sm text-gray-500 mb-4">Couldn&apos;t load your dashboard.</p>
            <button
              onClick={() => void refresh()}
              className="px-5 py-2.5 bg-blue-800 text-white rounded-lg text-sm font-semibold hover:bg-blue-900 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : (
          <DashboardSkeleton />
        )}
      </div>
    )
  }

  const {
    isFree, lifetimeAccess, totalTests, currentStreak, avgScore, readiness,
    masteredByCat, totalsByCat, practicedByCat, coachLine, showWeakestAlert,
  } = data
  // Optional-chained: cached payloads from before pacing-v2 lack this key.
  const paceMs = data.paceMs ?? null
  const overall = readiness.overall
  const name = userName

  // Onboarding/tour gate on `fresh` so a stale or absent cache never flashes
  // the new-user tour at an existing user.
  const isNewUser = fresh && totalTests === 0

  return (
    <div className="p-3 sm:p-5 max-w-3xl mx-auto">
      <AnonymousMigrator />
      {isNewUser && <GuidedTour />}
      <Onboarding show={isNewUser} />
      <ProActivatedBanner isPro={!isFree && lifetimeAccess} />

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

      {/* ═══ PROGRESS BY SECTION ═══ */}
      <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mt-1 mb-2 px-0.5">
        Progress by section
      </h2>
      {/* Compact 2×2 grid — the whole overview fits one screen with less scrolling */}
      <div className="grid grid-cols-2 gap-2 mb-3">
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
              className={`block bg-white border rounded-2xl px-3 py-2.5 transition-colors ${
                isWeakest ? 'border-red-200 hover:border-red-300' : 'border-gray-200 hover:border-indigo-300'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${style.chip}`}>
                  {style.icon}
                </span>
                <span className="text-[13px] font-semibold text-gray-900 truncate">{category}</span>
                <span
                  className={`ml-auto text-[13px] font-bold ${
                    !cat ? 'text-gray-400' : cat.ready ? 'text-green-600' : 'text-orange-500'
                  }`}
                >
                  {cat ? `${cat.readinessPct}%` : '—'}
                </span>
              </div>
              {isWeakest && (
                <span className="inline-block text-[9px] font-bold uppercase bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full mb-1.5">
                  weakest
                </span>
              )}
              <div className="h-[6px] rounded-full bg-indigo-50 overflow-hidden">
                <div
                  className={`h-full rounded-full ${cat?.ready ? 'bg-green-600' : 'bg-orange-500'}`}
                  style={{ width: `${cat?.readinessPct ?? 0}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-gray-400 mt-1.5">
                <span>Study {mastered}/{total}</span>
                {practiced !== undefined && <span>{practiced} practiced</span>}
              </div>
            </Link>
          )
        })}
      </div>

      {/* ═══ CONTINUE STUDYING ═══ */}
      <Link
        href="/learn"
        data-tour="learn"
        className="flex w-full items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl px-4 mb-3 font-semibold text-[15px] min-h-[48px] transition-colors"
      >
        Continue studying <ArrowRight size={18} aria-hidden="true" />
      </Link>

      {/* ═══ PACE (vs the real exam's 72s/question) ═══ */}
      {paceMs !== null && (
        <Link
          href="/progress"
          className="block bg-white border border-gray-200 rounded-2xl px-4 py-3 mb-3 min-h-[44px] hover:border-indigo-300 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Timer size={18} className="text-gray-500 shrink-0" aria-hidden="true" />
            <span className="text-sm font-semibold text-gray-800">Pace</span>
            <span className="text-sm font-bold text-gray-900">{formatSecsLong(paceMs)}/question</span>
            <span
              className={`ml-auto shrink-0 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                paceDelta(paceMs, 72_000) === 'green'
                  ? 'bg-green-50 text-green-700'
                  : paceDelta(paceMs, 72_000) === 'amber'
                    ? 'bg-amber-50 text-amber-700'
                    : 'bg-red-50 text-red-600'
              }`}
            >
              {paceDelta(paceMs, 72_000) === 'green' ? 'on pace' : 'behind exam pace'}
            </span>
          </div>
          <PaceBar avgMs={paceMs} />
        </Link>
      )}

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

      {/* ═══ ACTIVITY (GitHub-style heatmap — below the fold by design; the
          section grid is the priority content up top) ═══ */}
      {data.activity ? (
        <div className="mt-3">
          <ActivityHeatmap activity={data.activity} />
        </div>
      ) : null}

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
