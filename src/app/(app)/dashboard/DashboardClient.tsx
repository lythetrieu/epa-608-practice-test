'use client'

// Local-first Dashboard (Perf Phase 3). Renders the last cached snapshot from
// localStorage instantly, fetches /api/app/dashboard in the background, and
// re-renders silently when fresh data lands. JSX is moved verbatim from the
// old server page.tsx — only the data source changed.

import Link from 'next/link'
import { useState } from 'react'
import { useLocalFirst } from '@/lib/local-first'
import type { DashboardData } from '@/lib/dashboard-data'
import { SECTION_CATEGORIES } from '@/lib/section-progress'
import { GuidedTour } from './guided-tour'
import { Onboarding } from './onboarding'
import { ProActivatedBanner } from './pro-activated-banner'
import { AnonymousMigrator } from './anonymous-migrator'
import {
  ArrowRight, Lightbulb, AlertTriangle,
} from 'lucide-react'
import { formatSecsLong } from '@/components/quiz/pacing'
import { PaceBar } from '@/components/quiz/pacing-bar'
import { ActivityHeatmap } from './ActivityHeatmap'
import { FixPlanNote, type FixPlanData } from './FixPlanNote'
import { RankInsignia } from '@/components/gamification/BadgeIcons'
import { BadgeToasts } from '@/components/gamification/BadgeToasts'

// Emoji per section — chips sit in ONE soft slate/navy-tint square (approved
// skin: fewer hues; state lives in labels, never in decorative chip colors).
const SECTION_EMOJI: Record<string, string> = {
  Core: '📋',
  'Type I': '❄️',
  'Type II': '🔧',
  'Type III': '🏭',
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
        <div className="bg-gray-100 rounded-xl h-[140px]" />
        <div className="bg-gray-100 rounded-xl h-[140px]" />
        <div className="bg-gray-100 rounded-xl h-[140px]" />
        <div className="bg-gray-100 rounded-xl h-[140px]" />
      </div>
    </div>
  )
}

export function DashboardClient({ userId, userName }: { userId: string; userName: string }) {
  const { data, fresh, error, refresh } = useLocalFirst<DashboardData>(
    `dashboard:${userId}`,
    '/api/app/dashboard'
  )

  // Needs-work "fix plan" note — which flagged section's note is open (null = closed).
  const [fixPlan, setFixPlan] = useState<FixPlanData | null>(null)

  // No snapshot yet (first-ever visit) — skeleton, or a retry prompt on failure.
  if (data === null) {
    return (
      <div className="p-3 sm:p-5 max-w-3xl mx-auto">
        <AnonymousMigrator />
        {error ? (
          <div className="bg-white border border-line rounded-xl shadow-card p-8 text-center">
            <p className="text-sm text-steel mb-4">Couldn&apos;t load your dashboard.</p>
            <button
              onClick={() => void refresh()}
              className="px-5 py-2.5 bg-blue-800 text-white rounded-[7px] text-sm font-semibold hover:bg-blue-900 transition-colors"
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
        {/* Row 1: readiness ring (left) + gold kicker + big status word — with
            "Hi, {name} 👋" in the top-right corner. */}
        <div className="flex items-start justify-between gap-3" data-tour="readiness">
          <div className="flex items-center gap-4 min-w-0">
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
                  stroke="#F97316"
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
              <p className="font-mono text-[10px] uppercase tracking-widest text-orange-400 mb-0.5">
                Readiness
              </p>
              <p className="font-serif text-2xl font-black leading-tight">
                {!readiness.enoughData
                  ? 'Warming up'
                  : overall >= 72
                    ? 'Exam ready'
                    : overall >= 50
                      ? 'Almost there'
                      : 'Building'}
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="font-serif text-lg font-black leading-tight">
              Hi, {name}! <span aria-hidden="true">👋</span>
            </p>
            <p className="text-[11px] text-white/60">Ready for today&apos;s session?</p>
          </div>
        </div>

        {/* Coach line — the single next step, full width under the ring row */}
        <p className="text-sm font-medium leading-relaxed mt-2">
          <Lightbulb size={15} className="inline align-[-2px] mr-1" aria-hidden="true" />
          {coachLine}
        </p>

        {/* Rank bar row: [insignia + rank] ————bar———— [gold %] → /progress */}
        {achievements && (() => {
          const { xp, rank } = achievements
          const span = rank.nextMinXp === null ? null : rank.nextMinXp - rank.minXp
          const pct =
            span === null || span <= 0
              ? 100
              : Math.min(100, Math.max(0, ((xp - rank.minXp) / span) * 100))
          return (
            <Link
              href="/progress"
              className="flex items-center gap-2.5 mt-4 rounded-lg -mx-1 px-1 py-1 min-h-[40px] hover:bg-white/10 transition-colors"
              aria-label={`Rank: ${rank.label}, ${xp.toLocaleString()} XP, ${Math.round(pct)}% to next rank — view achievements`}
            >
              <span className="flex items-center gap-1.5 shrink-0">
                <RankInsignia rank={rank.id} size={18} />
                <span className="text-xs font-bold">{rank.label}</span>
              </span>
              <span className="flex-1 h-2 rounded-full bg-white/15 overflow-hidden" aria-hidden="true">
                <span
                  className="block h-full rounded-full bg-orange-500"
                  style={{ width: `${pct}%` }}
                />
              </span>
              <span className="font-mono text-xs font-bold tabular-nums text-orange-400 shrink-0">
                {Math.round(pct)}%
              </span>
            </Link>
          )
        })()}

        {/* Chips row: streak · tests · avg · XP */}
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
          {achievements && (
            <span className="inline-flex items-center gap-1 bg-white/10 rounded-full px-3 py-1.5 text-[10px] text-white/70">
              <span aria-hidden="true">⭐</span>
              <span className="font-mono font-bold text-xs text-white tabular-nums">
                {achievements.xp.toLocaleString()}
              </span>
              XP
            </span>
          )}
        </div>
      </section>

      {/* ═══ PROGRESS BY SECTION — the tiles ARE the call to action ═══ */}
      <h2 className="font-mono text-[10px] font-semibold text-steel uppercase tracking-[0.12em] mt-1 mb-1.5 px-0.5">
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
          <div className="grid grid-cols-2 gap-2 mb-2.5" data-tour="sections">
            {SECTION_CATEGORIES.map(category => {
              const emoji = SECTION_EMOJI[category] ?? '📋'
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
              // Needs-work flag: HAS readiness data but sits below the 72% mark.
              // Border priority: featured "Start here" (orange-500) wins over the
              // needs-work orange-300; the weakest section keeps its rose pill.
              const needsWork = !!cat && !cat.ready

              // A <Link> can't contain a <button> (invalid nested interactive
              // content), so the tile is a relative <div>: a stretched Link
              // overlay (absolute inset-0) makes the whole card tappable, and
              // the FIX PLAN chip sits above it with z-10.
              return (
                <div
                  key={category}
                  data-tour={category === 'Core' ? 'core' : undefined}
                  className={`relative bg-white rounded-xl shadow-card px-4 py-3 transition-colors ${
                    isNext
                      ? 'border-[1.5px] border-orange-500 hover:border-orange-600'
                      : needsWork
                        ? 'border-[1.5px] border-orange-300 hover:border-orange-400'
                        : 'border border-line hover:border-blue-300'
                  }`}
                >
                  <Link
                    href={`/learn?section=${encodeURIComponent(category)}`}
                    className="absolute inset-0 z-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-800"
                    aria-label={`${category}: ${cat ? `${cat.readinessPct}% ready` : 'not started'}, study path ${mastered}/${total} levels — open study path`}
                  />
                  {/* Featured "Start here" — slim orange border + small tag (approved skin) */}
                  {isNext && (
                    <span className="absolute -top-2.5 left-3 z-10 bg-orange-500 text-white font-mono text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded pointer-events-none">
                      Start here →
                    </span>
                  )}
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className="w-8 h-8 rounded-[7px] bg-blue-50 border border-line flex items-center justify-center text-base shrink-0"
                      aria-hidden="true"
                    >
                      {emoji}
                    </span>
                    <span className="text-[15px] font-extrabold text-gray-900 truncate">{category}</span>
                    {isWeakest && (
                      <span className="shrink-0 font-mono text-[9px] font-bold uppercase tracking-wider bg-red-50 text-red-600 border border-red-200 px-1.5 py-0.5 rounded-full">
                        weakest
                      </span>
                    )}
                  </div>
                  {/* Numbers: one ink color, HUGE (the tile's dominant element —
                      ~1.6× the name row) — state lives in the small label below */}
                  <p className="font-mono text-[26px] font-bold text-primary-900 leading-none mb-1.5">
                    {cat ? `${cat.readinessPct}%` : '—'}
                  </p>
                  <div className="h-2 rounded-full bg-blue-50 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-orange-500"
                      style={{ width: `${cat?.readinessPct ?? 0}%` }}
                    />
                  </div>
                  <div className="text-[12px] text-steel mt-1.5 leading-snug">
                    <p>Study path: {mastered}/{total} levels</p>
                    {practiced !== undefined && <p>{practiced} questions practiced</p>}
                  </div>
                  <p
                    className={`text-[12px] font-bold mt-1 ${
                      cat?.ready ? 'text-green-600' : isWeakest ? 'text-red-600' : cat ? 'text-primary-900' : 'text-gray-400'
                    }`}
                  >
                    {cat?.ready ? 'Ready ✓' : cat ? 'Keep practicing' : 'Not started'}
                  </p>
                  {/* Needs-work chip — sibling of the Link overlay (never nested
                      inside it); after:-inset keeps the tap target ≥40px tall. */}
                  {needsWork && cat && (
                    <button
                      type="button"
                      onClick={() =>
                        setFixPlan({
                          category,
                          readinessPct: cat.readinessPct,
                          mastered,
                          total,
                          practiced,
                        })
                      }
                      className="relative z-10 mt-1.5 inline-flex items-center gap-1 font-mono text-[9px] font-bold uppercase tracking-wider bg-orange-50 text-orange-700 border border-orange-200 px-2 py-1 rounded-full hover:bg-orange-100 transition-colors after:absolute after:-inset-y-2.5 after:-inset-x-2 after:content-['']"
                      aria-label={`Open fix plan for ${category}`}
                    >
                      <span aria-hidden="true">💡</span> Fix plan
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )
      })()}

      {/* (AI Tutor Home row removed — the floating bubble is the AI entry.) */}

      {/* ═══ PACE (72s/question is a hard LIMIT — over it you won't finish) ═══ */}
      {paceMs !== null && (
        <Link
          href="/progress"
          className="block bg-white border border-line rounded-xl shadow-card px-4 py-3 mb-2.5 min-h-[44px] hover:border-blue-300 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-base shrink-0" aria-hidden="true">⏱</span>
            <span className="text-[15px] font-extrabold text-gray-900">Pace</span>
            <span className="font-mono text-lg font-bold text-primary-900">
              {formatSecsLong(paceMs)}
              <span className="text-[13px] font-semibold text-steel">/question</span>
            </span>
            <span
              className={`ml-auto shrink-0 font-mono text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                paceMs <= 72_000
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : 'bg-red-50 text-red-600 border-red-200'
              }`}
            >
              {paceMs <= 72_000 ? 'Will finish in time' : "Won't finish in time"}
            </span>
          </div>
          <div className="mt-2">
            <PaceBar avgMs={paceMs} />
          </div>
        </Link>
      )}

      {/* ═══ WEAKEST ALERT ═══ */}
      {showWeakestAlert && (
        <Link
          href="/progress"
          className="flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 mb-2.5 min-h-[44px] hover:border-red-300 transition-colors"
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
      {data.activity ? <ActivityHeatmap activity={data.activity} /> : null}

      {/* ═══ UPGRADE (free only, compact) ═══ */}
      {isFree && (
        <div className="rounded-xl px-4 py-3 text-white flex items-center justify-between gap-3" style={{ background: '#001d57' }}>
          <div>
            <p className="font-bold text-sm">Unlock Pro features</p>
            <p className="text-blue-100 text-xs"><span className="font-mono">$14.99</span> one-time — lifetime access</p>
          </div>
          <Link href="/checkout.html" className="shrink-0 px-4 bg-white rounded-[7px] font-bold text-xs min-h-[44px] inline-flex items-center" style={{ color: '#003087' }}>
            Upgrade
          </Link>
        </div>
      )}

      {/* Needs-work fix-plan note (opened from a flagged tile's 💡 chip) */}
      {fixPlan && <FixPlanNote plan={fixPlan} onClose={() => setFixPlan(null)} />}

      {/* Unlock toasts — diff only on FRESH payloads (stale cache was already seen) */}
      <BadgeToasts userId={userId} achievements={fresh ? achievements : null} />
    </div>
  )
}
