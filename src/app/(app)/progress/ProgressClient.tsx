'use client'

// Local-first Progress page (Perf Phase 3). Renders the last cached snapshot
// from localStorage instantly, fetches /api/app/progress in the background,
// and re-renders silently when fresh data lands. JSX is moved verbatim from
// the old server page.tsx — only the data source changed.

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ClipboardList, FileCheck, Lock, Target } from 'lucide-react'
import { readCache, useLocalFirst } from '@/lib/local-first'
import { lastPacingKey, type LastPacing } from '@/components/quiz/pacing'
// Type-only imports — erased at compile time, pull no server code.
import type { BlindSpot, RadarDatum } from './weak-spots-data'
import type { Achievements } from '@/lib/achievements-server'
import { RadarChart } from './radar-chart'
import { LastPacingCard, PacingSection, type PacingAnalytics } from './pacing-section'
import { MistakesSection, type MistakesData } from './mistakes-section'
import { AchievementsSection } from './achievements-section'
import { BadgeToasts } from '@/components/gamification/BadgeToasts'

type SessionRow = {
  category: string
  score: number | null
  total: number
  submitted_at: string | null
  time_limit_secs: number | null
}

type ProgressData = {
  isPro: boolean
  spots: BlindSpot[]
  radarData: RadarDatum[]
  recentSessions: SessionRow[]
  // Optional: old cached snapshots (and pre-rollout API responses) lack this
  // field entirely — every read must be guarded so a stale payload can't crash.
  pacing?: PacingAnalytics | null
  // Same deal: absent on stale payloads, null when the server has no data —
  // both cases render nothing.
  mistakes?: MistakesData | null
  // Optional 4-axis Core/Type I/II/III fallback radar. Absent on stale cached
  // payloads → falls through to today's ">=3 subtopic axes or caption" logic.
  sectionRadar?: RadarDatum[]
  // XP + rank + badges. Absent on stale cached payloads, null when the server
  // couldn't compute — both render nothing.
  achievements?: Achievements | null
}

const CATEGORY_SLUGS: Record<string, string> = {
  'Core': 'core',
  'Type I': 'type-1',
  'Type II': 'type-2',
  'Type III': 'type-3',
}

// First-ever-visit skeleton (no cached snapshot yet): title + 2 card blocks.
function ProgressSkeleton() {
  return (
    <div className="animate-pulse" aria-hidden>
      <div className="h-7 w-36 bg-gray-200 rounded mb-2" />
      <div className="h-4 w-56 bg-gray-100 rounded mb-6" />
      <div className="bg-gray-100 rounded-xl h-64 mb-6" />
      <div className="bg-gray-100 rounded-xl h-40" />
    </div>
  )
}

export function ProgressClient({ userId }: { userId: string }) {
  const { data, fresh, error, refresh } = useLocalFirst<ProgressData>(
    `progress:${userId}`,
    '/api/app/progress'
  )

  // "Last test pace" — written by TestClient after each completed test. The
  // progress API carries no timing, so this is localStorage-only. Read in an
  // effect (client-only) to avoid a hydration mismatch.
  const [lastPacing, setLastPacing] = useState<LastPacing | null>(null)
  useEffect(() => {
    setLastPacing(readCache<LastPacing>(lastPacingKey(userId)))
  }, [userId])

  // No snapshot yet (first-ever visit) — skeleton, or a retry prompt on failure.
  if (data === null) {
    return (
      <div className="p-4 sm:p-6 max-w-3xl mx-auto">
        {error ? (
          <div className="bg-white border border-line rounded-xl shadow-card p-8 text-center">
            <p className="text-sm text-steel mb-4">Couldn&apos;t load your progress.</p>
            <button
              onClick={() => void refresh()}
              className="px-5 py-2.5 bg-blue-800 text-white rounded-[7px] text-sm font-semibold hover:bg-blue-900 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : (
          <ProgressSkeleton />
        )}
      </div>
    )
  }

  const { isPro, spots, radarData, recentSessions } = data
  const topSpots = spots.slice(0, 8)

  // Radar render decision:
  //   1. >=3 subtopic-level axes → detailed topic radar (richer, unchanged).
  //   2. Else, if the payload carries the 4-axis section radar AND the user has
  //      at least one recorded attempt → section-level fallback so every active
  //      user sees a chart. (Stale cached payloads lack `sectionRadar` and keep
  //      today's behavior until the background refresh lands.)
  //   3. Else → the existing "take more tests" caption / nothing.
  const hasAnyAttempts = (data.sectionRadar ?? []).some((d) => d.maxScore > 0)
  const useSectionFallback = radarData.length < 3 && !!data.sectionRadar && hasAnyAttempts
  const chartData = radarData.length >= 3 ? radarData : useSectionFallback ? data.sectionRadar! : null

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <h1 className="font-serif text-2xl sm:text-3xl font-black text-gray-900 mb-1">Progress</h1>
      <p className="text-steel text-sm mb-6">Your weak spots &amp; test history</p>

      {/* ── Topic Proficiency radar ─────────────────────────────────── */}
      {chartData ? (
        <section className="mb-6">
          {isPro ? (
            <div className="bg-white rounded-xl border border-line shadow-card p-6">
              <h2 className="font-mono text-[10px] font-semibold text-steel uppercase tracking-[0.12em] mb-4 text-center">
                Topic Proficiency
              </h2>
              <RadarChart data={chartData} />
              {useSectionFallback && (
                <p className="text-[11px] text-steel mt-2 text-center">
                  By section — practice more topics to unlock the detailed topic radar.
                </p>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-line shadow-card p-6 text-center">
              <h2 className="font-mono text-[10px] font-semibold text-steel uppercase tracking-[0.12em] mb-3">
                Topic Proficiency
              </h2>
              {/* Real radar rendered but BLURRED — free users see the insight exists */}
              <div className="relative inline-block w-full max-w-xs mx-auto mb-4">
                <div className="blur-md pointer-events-none select-none" aria-hidden>
                  <RadarChart data={chartData} />
                </div>
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/30 rounded-lg">
                  <div className="w-11 h-11 rounded-full bg-white shadow flex items-center justify-center">
                    <Lock size={20} className="text-blue-800" aria-hidden />
                  </div>
                  <p className="text-sm font-semibold text-gray-800">Radar Chart — Pro</p>
                </div>
              </div>
              {useSectionFallback && (
                <p className="text-[11px] text-steel -mt-2 mb-3">
                  By section — practice more topics to unlock the detailed topic radar.
                </p>
              )}
              <p className="text-xs text-steel mb-4">
                Upgrade to see your weak-area breakdown across all 8 topic areas at a glance.
              </p>
              <Link
                href={`/checkout.html`}
                className="inline-block px-5 py-2.5 bg-blue-800 text-white rounded-[7px] text-sm font-semibold hover:bg-blue-900 transition-colors"
              >
                Upgrade — $14.99 lifetime
              </Link>
            </div>
          )}
        </section>
      ) : (
        spots.length > 0 && (
          <p className="text-xs text-steel mb-6">
            Take tests across more sections to unlock your topic proficiency radar.
          </p>
        )
      )}

      {/* ── Weak spots ──────────────────────────────────────────────── */}
      {topSpots.length === 0 ? (
        <div className="bg-white rounded-xl border border-line shadow-card p-10 text-center mb-8">
          <ClipboardList size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-steel font-medium mb-2">No weak spots detected yet</p>
          <p className="text-steel text-sm mb-6">
            Take a few tests first to identify your weak areas. We need at least 2 attempts per
            subtopic.
          </p>
          <Link
            href="/dashboard"
            className="inline-block px-5 py-2.5 bg-blue-800 text-white rounded-[7px] text-sm font-semibold hover:bg-blue-900 transition-colors"
          >
            Start a Practice Test
          </Link>
        </div>
      ) : (
        <section className="mb-6">
          <h2 className="font-mono text-[10px] font-semibold text-steel uppercase tracking-[0.12em] mb-3">
            Weak Spots — by error rate
          </h2>
          <div className="space-y-2">
            {topSpots.map((spot) => {
              const errorPct = Math.round(spot.errorRate * 100)
              const slug = CATEGORY_SLUGS[spot.category] ?? 'core'

              return (
                <div key={spot.subtopic_id} className="bg-white rounded-xl border border-line shadow-card px-5 py-4">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <span className="font-medium text-gray-800 text-sm">{spot.label}</span>
                    {/* Numbers: one ink color — severity reads from the bar length */}
                    <span className="text-sm font-bold font-mono text-primary-900 shrink-0">{errorPct}% errors</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-1.5">
                    <div
                      className="h-full rounded-full transition-all bg-blue-800"
                      style={{ width: `${errorPct}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-steel mb-2">
                    <span>{spot.correctCount}/{spot.totalAttempts} correct</span>
                    <span>{spot.category}</span>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href="/learn"
                      className="text-xs px-3 py-1.5 rounded-[7px] bg-blue-50 text-blue-700 font-medium hover:bg-blue-100"
                    >
                      Study This Topic
                    </Link>
                    <Link
                      href={`/test/${slug}?mode=practice`}
                      className="text-xs px-3 py-1.5 rounded-[7px] text-steel font-medium hover:bg-gray-50 hover:text-gray-700"
                    >
                      Practice {spot.category}
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Weak Spot Drill CTA */}
          {isPro ? (
            // Progress screen's ONE orange primary action
            <Link
              href="/test/weak-spots"
              className="mt-4 flex items-center justify-center gap-2 w-full px-5 py-3.5 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition-colors text-center"
            >
              <Target size={18} aria-hidden />
              <span>Start Weak Spot Drill</span>
            </Link>
          ) : (
            <div className="mt-4">
              {/* Locked drill button — shown (not hidden) so free users see the tool exists */}
              <div
                className="flex items-center justify-center gap-2 w-full px-5 py-3.5 bg-gray-100 text-gray-400 rounded-xl font-semibold border border-gray-200 cursor-not-allowed select-none"
                aria-disabled="true"
              >
                <Lock size={18} aria-hidden />
                <span>Start Weak Spot Drill</span>
              </div>
              <div className="mt-2 bg-blue-50 border border-blue-200 rounded-xl px-5 py-3 flex items-center justify-between gap-4">
                <p className="text-xs text-blue-800">
                  You can see your weak spots — <span className="font-semibold">unlock the drill</span> to
                  auto-build a test that fixes them.
                </p>
                <Link
                  href={`/checkout.html`}
                  className="shrink-0 px-4 py-2 bg-blue-800 text-white rounded-[7px] text-sm font-semibold hover:bg-blue-900 transition-colors"
                >
                  Upgrade — $14.99
                </Link>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── Mistakes (server) — absent/null on stale payloads → render nothing ── */}
      {data.mistakes ? <MistakesSection mistakes={data.mistakes} /> : null}

      {/* ── Pacing analytics (server) + most recent test (localStorage) ── */}
      {data.pacing ? (
        <PacingSection pacing={data.pacing} lastPacing={lastPacing} />
      ) : (
        // Stale cached payloads (or pre-rollout API) have no `pacing` field —
        // keep the localStorage-only pace card so nothing regresses meanwhile.
        lastPacing && (
          <section className="mb-6">
            <h2 className="font-mono text-[10px] font-semibold text-steel uppercase tracking-[0.12em] mb-3">
              Pacing
            </h2>
            <LastPacingCard lastPacing={lastPacing} />
          </section>
        )
      )}

      {/* ── Recent tests ────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-mono text-[10px] font-semibold text-steel uppercase tracking-[0.12em]">Recent Tests</h2>
          <Link href="/history" className="text-xs text-blue-700 hover:underline font-medium">
            Full history &rarr;
          </Link>
        </div>
        {recentSessions.length === 0 ? (
          <div className="bg-white rounded-xl border border-line shadow-card p-6 text-center">
            <p className="text-steel text-sm">
              No tests yet — <Link href="/dashboard" className="text-blue-700 hover:underline">start one</Link>
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {recentSessions.map((s, i) => {
              const pct = s.score !== null ? Math.round((s.score / s.total) * 100) : 0
              const mode =
                s.category === 'Weak Spots' ? 'drill' : s.time_limit_secs === 0 ? 'practice' : 'exam'
              return (
                <div
                  key={i}
                  className="bg-white rounded-xl border border-line shadow-card px-4 py-3 flex items-center gap-3"
                >
                  <span className="w-9 h-9 rounded-[7px] bg-gray-100 text-steel flex items-center justify-center shrink-0">
                    <FileCheck size={18} aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-gray-800 truncate">
                      {s.category} · {mode}
                    </div>
                    <div className="text-xs text-steel">
                      {new Date(s.submitted_at!).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}{' '}
                      · {s.score ?? 0}/{s.total}
                    </div>
                  </div>
                  <span className="text-sm font-bold font-mono text-primary-900 shrink-0">
                    {pct}%
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ── Achievements (LAST) — absent/null on stale payloads → render nothing ── */}
      {data.achievements ? <AchievementsSection achievements={data.achievements} /> : null}

      {/* Unlock toasts — diff only on FRESH payloads (stale cache was already seen) */}
      <BadgeToasts userId={userId} achievements={fresh ? data.achievements : null} />
    </div>
  )
}
