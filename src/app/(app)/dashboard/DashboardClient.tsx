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
  FileText, Snowflake, Wrench, Factory,
  ArrowRight, Lightbulb, AlertTriangle, Timer, Bot, Lock,
} from 'lucide-react'
import { formatSecsLong } from '@/components/quiz/pacing'
import { PaceBar } from '@/components/quiz/pacing-bar'
import { ActivityHeatmap } from './ActivityHeatmap'
import { RankInsignia } from '@/components/gamification/BadgeIcons'
import { BadgeToasts } from '@/components/gamification/BadgeToasts'

// Icon per section — chips share ONE muted navy-tint family (approved skin:
// fewer hues; state lives in labels, never in decorative chip colors).
const SECTION_STYLE: Record<string, { icon: ReactNode; chip: string }> = {
  Core:       { icon: <FileText size={16} />,  chip: 'bg-blue-50 text-blue-800' },
  'Type I':   { icon: <Snowflake size={16} />, chip: 'bg-blue-50 text-blue-800' },
  'Type II':  { icon: <Wrench size={16} />,    chip: 'bg-blue-50 text-blue-800' },
  'Type III': { icon: <Factory size={16} />,   chip: 'bg-blue-50 text-blue-800' },
}

// SVG progress-ring math (r=50 in a 120 viewBox, like the prototype)
const RING_R = 50
const RING_C = 2 * Math.PI * RING_R // ≈ 314.16

// First-ever-visit skeleton (no cached snapshot yet): one tall navy hero
// block (welcome + ring + stat chips all live inside it now) and the 2×2
// grid of section tile placeholders.
function DashboardSkeleton() {
  return (
    <div className="animate-pulse" aria-hidden>
      <div className="rounded-2xl mb-3 h-[170px]" style={{ background: '#001d57' }} />
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-gray-100 rounded-2xl h-[140px]" />
        <div className="bg-gray-100 rounded-2xl h-[140px]" />
        <div className="bg-gray-100 rounded-2xl h-[140px]" />
        <div className="bg-gray-100 rounded-2xl h-[140px]" />
      </div>
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
  // Same guard: pre-achievements cached payloads lack this key entirely.
  const achievements = data.achievements ?? null
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

      {/* ═══ HERO — welcome + rank, readiness ring + coach, stat chips: one navy card.
          (Standalone header row, rank strip, and white stat-card grid all merged here.) ═══ */}
      <section
        className="rounded-2xl p-4 sm:p-5 mb-3 text-white"
        style={{ background: '#001d57' }}
        data-tour="header"
      >
        {/* Row 1: rank (left) + welcome (right corner). Row 1.5: full-width XP
            bar → the whole block links to /progress. Guarded: pre-achievements
            cached payloads show only the welcome line. */}
        {achievements ? (
          <Link
            href="/progress"
            className="block mb-3 rounded-lg -m-1 p-1 hover:bg-white/10 transition-colors"
            aria-label={`Rank: ${achievements.rank.label}, ${achievements.xp.toLocaleString()} XP — view achievements`}
          >
            <div className="flex items-center justify-between gap-3 mb-2">
              <span className="flex items-center gap-1.5 min-w-0">
                <RankInsignia rank={achievements.rank.id} size={18} />
                <span className="text-sm font-bold truncate">{achievements.rank.label}</span>
              </span>
              <span className="font-serif text-base sm:text-lg font-black text-white/90 truncate shrink-0">
                Welcome, {name}!
              </span>
            </div>
            {(() => {
              const { xp, rank } = achievements
              const span = rank.nextMinXp === null ? null : rank.nextMinXp - rank.minXp
              const pct =
                span === null || span <= 0
                  ? 100
                  : Math.min(100, Math.max(0, ((xp - rank.minXp) / span) * 100))
              return (
                <div className="flex items-center gap-2">
                  <span className="flex-1 h-2 rounded-full bg-white/15 overflow-hidden" aria-hidden="true">
                    <span
                      className="block h-full rounded-full bg-[#f5b840]"
                      style={{ width: `${pct}%` }}
                    />
                  </span>
                  <span className="text-[10px] font-mono tabular-nums text-white/70 shrink-0">
                    {xp.toLocaleString()}
                    {rank.nextMinXp !== null ? ` / ${rank.nextMinXp.toLocaleString()}` : ''} XP
                  </span>
                </div>
              )
            })()}
          </Link>
        ) : (
          <div className="mb-3">
            <h1 className="font-serif text-xl sm:text-2xl font-black text-white truncate">Welcome, {name}!</h1>
          </div>
        )}

        {/* Row 2: readiness ring + coach line (unchanged) */}
        <div className="flex items-center gap-4" data-tour="readiness">
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
              stroke="#f5b840"
              strokeWidth="13"
              strokeLinecap="round"
              strokeDasharray={RING_C.toFixed(1)}
              strokeDashoffset={(RING_C * (1 - overall / 100)).toFixed(1)}
              transform="rotate(-90 60 60)"
            />
          )}
          <text x="60" y="58" textAnchor="middle" fontSize="28" fontWeight="700" fill="#fff" className="font-mono">
            {readiness.enoughData ? `${overall}%` : '—'}
          </text>
          <text x="60" y="78" textAnchor="middle" fontSize="12" fill="rgba(255,255,255,0.7)">
            ready
          </text>
        </svg>
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-widest text-white/60 mb-1">Exam readiness</p>
          <p className="text-sm font-medium leading-relaxed">
            <Lightbulb size={15} className="inline align-[-2px] mr-1" aria-hidden="true" />
            {coachLine}
          </p>
        </div>
        </div>

        {/* Row 3: compact stat chips — streak · tests · avg (replaced the white
            stat-card grid). Numbers mono white; labels small white/70. */}
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <span className="inline-flex items-center gap-1 bg-white/10 rounded-full px-3 py-1.5 text-[10px] text-white/70">
            <span aria-hidden="true">🔥</span>
            <span className="font-mono font-bold text-xs text-white tabular-nums">{currentStreak}</span>
            day streak
          </span>
          {/* after:-inset-y-2 grows the tap target past 40px without inflating the pill */}
          <Link
            href="/progress"
            className="relative inline-flex items-center gap-1 bg-white/10 rounded-full px-3 py-1.5 text-[10px] text-white/70 hover:bg-white/20 transition-colors after:absolute after:-inset-y-2 after:inset-x-0 after:content-['']"
            aria-label={`${totalTests} tests taken — view progress`}
          >
            <span className="font-mono font-bold text-xs text-white tabular-nums">{totalTests}</span>
            tests
          </Link>
          <span className="inline-flex items-center gap-1 bg-white/10 rounded-full px-3 py-1.5 text-[10px] text-white/70">
            <span className="font-mono font-bold text-xs text-white tabular-nums">
              {avgScore !== null ? `${avgScore}%` : '—'}
            </span>
            avg
          </span>
        </div>
      </section>

      {/* ═══ PROGRESS BY SECTION — the tiles ARE the call to action ═══ */}
      <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mt-1 mb-2 px-0.5">
        Progress by section
      </h2>
      {/* 2×2 grid — one glance answers "what next?" and "how far am I?".
          Exactly ONE tile gets the "Next up" highlight (brand navy ring):
          1) the weakest attempted section when it isn't ready yet;
          2) else the first section (SECTION_CATEGORIES order) with an
             unfinished study path (mastered < total) or no readiness data;
          3) else none — everything is mastered and ready. */}
      {(() => {
        const nextUp: string | null =
          (readiness.weakest && !readiness.weakest.ready
            ? readiness.weakest.category
            : null) ??
          SECTION_CATEGORIES.find(category => {
            const cat = readiness.byCategory.find(c => c.category === category)
            const mastered = masteredByCat[category] ?? 0
            const total = totalsByCat[category] ?? 0
            return mastered < total || !cat
          }) ??
          null

        return (
          <div className="grid grid-cols-2 gap-2 mb-3" data-tour="sections">
            {SECTION_CATEGORIES.map(category => {
              const style = SECTION_STYLE[category]
              const cat = readiness.byCategory.find(c => c.category === category)
              const isWeakest =
                !!readiness.weakest &&
                readiness.weakest.category === category &&
                !readiness.weakest.ready
              const isNext = nextUp === category
              const mastered = masteredByCat[category] ?? 0
              const total = totalsByCat[category] ?? 0
              // null = RPC failed → omit the number; otherwise missing category = 0 practiced
              const practiced = practicedByCat === null ? undefined : (practicedByCat[category] ?? 0)

              return (
                <Link
                  key={category}
                  href={`/learn?section=${encodeURIComponent(category)}`}
                  data-tour={category === 'Core' ? 'core' : undefined}
                  className={`relative block bg-white rounded-2xl px-4 py-4 transition-colors ${
                    isNext
                      ? 'border-[1.5px] border-orange-500 hover:border-orange-600'
                      : isWeakest
                        ? 'border border-red-200 hover:border-red-300'
                        : 'border border-gray-200 hover:border-blue-300'
                  }`}
                >
                  {/* Featured "Start here" — slim orange border + small tag (approved skin) */}
                  {isNext && (
                    <span className="absolute -top-2.5 left-3 z-10 bg-orange-500 text-white font-mono text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded">
                      Start here →
                    </span>
                  )}
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${style.chip}`}>
                      {style.icon}
                    </span>
                    <span className="text-[15px] font-semibold text-gray-900 truncate">{category}</span>
                    {isWeakest && (
                      <span className="shrink-0 text-[9px] font-bold uppercase bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">
                        weakest
                      </span>
                    )}
                    {/* Numbers: one ink color — state lives in the small label below */}
                    <span className="ml-auto text-xl font-bold font-mono text-primary-900">
                      {cat ? `${cat.readinessPct}%` : '—'}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-blue-50 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-800"
                      style={{ width: `${cat?.readinessPct ?? 0}%` }}
                    />
                  </div>
                  <div className="text-[11px] text-gray-500 mt-2 leading-relaxed">
                    <p>Study path: {mastered}/{total} levels</p>
                    {practiced !== undefined && <p>{practiced} questions practiced</p>}
                  </div>
                  <p
                    className={`text-[11px] font-semibold mt-1.5 ${
                      cat?.ready ? 'text-green-600' : isWeakest ? 'text-red-600' : cat ? 'text-gray-500' : 'text-gray-400'
                    }`}
                  >
                    {cat?.ready ? 'Ready ✓' : cat ? 'Keep practicing' : 'Not started'}
                  </p>
                </Link>
              )
            })}
          </div>
        )
      })()}

      {/* ═══ AI TUTOR — prominent entry with the orange accent (owner wants the
          AI feature visible on Home; icon + "Ask →" are accents, the screen's
          one orange BUTTON remains the Start-here tile) ═══ */}
      <Link
        href="/tutor"
        className="flex items-center gap-3 bg-white border border-gray-200 rounded-2xl px-4 py-3 mb-3 min-h-[56px] hover:border-orange-300 transition-colors"
      >
        <span className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
          <Bot size={20} aria-hidden="true" />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-bold text-gray-900">AI Tutor</span>
          <span className="block text-[11px] text-gray-500 truncate">
            Stuck on a concept? Ask anything about EPA 608
          </span>
        </span>
        {isFree ? (
          <span className="ml-auto shrink-0 inline-flex items-center gap-1 text-[10px] font-bold text-orange-600 bg-orange-50 rounded-full px-2 py-0.5">
            <Lock size={10} aria-hidden="true" /> Pro
          </span>
        ) : (
          <span className="ml-auto shrink-0 inline-flex items-center gap-1 text-xs font-bold text-orange-600">
            Ask <ArrowRight size={14} aria-hidden="true" />
          </span>
        )}
      </Link>

      {/* ═══ PACE (72s/question is a hard LIMIT — over it you won't finish) ═══ */}
      {paceMs !== null && (
        <Link
          href="/progress"
          className="block bg-white border border-gray-200 rounded-2xl px-4 py-3 mb-3 min-h-[44px] hover:border-blue-300 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Timer size={18} className="text-gray-500 shrink-0" aria-hidden="true" />
            <span className="text-sm font-semibold text-gray-800">Pace</span>
            <span className="text-sm font-bold font-mono text-primary-900">{formatSecsLong(paceMs)}/question</span>
            <span
              className={`ml-auto shrink-0 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                paceMs <= 72_000 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
              }`}
            >
              {paceMs <= 72_000 ? 'will finish in time' : "won't finish in time"}
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
        <div className="rounded-xl px-4 py-3 text-white flex items-center justify-between gap-3" style={{ background: '#001d57' }}>
          <div>
            <p className="font-bold text-sm">Unlock Pro features</p>
            <p className="text-blue-100 text-xs"><span className="font-mono">$14.99</span> one-time — lifetime access</p>
          </div>
          <Link href="/checkout.html" className="shrink-0 px-4 bg-white rounded-lg font-bold text-xs min-h-[44px] inline-flex items-center" style={{ color: '#003087' }}>
            Upgrade
          </Link>
        </div>
      )}

      {/* Unlock toasts — diff only on FRESH payloads (stale cache was already seen) */}
      <BadgeToasts userId={userId} achievements={fresh ? achievements : null} />
    </div>
  )
}
