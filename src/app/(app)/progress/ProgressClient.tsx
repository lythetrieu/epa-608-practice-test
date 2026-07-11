'use client'

// Local-first Progress page (Perf Phase 3). Renders the last cached snapshot
// from localStorage instantly, fetches /api/app/progress in the background,
// and re-renders silently when fresh data lands.
//
// Section order (analysis center, deduped, compacted):
//   1. Analysis Overview  — radar + headline stats at a glance
//   2. What to practice next — topics + sections + the Weak Spot Drill CTA
//   3. Pacing             — ONE card, 50/50: pace summary | slow topics
//   4. Improvement + Recent tests — side-by-side on sm+, stacked on mobile
//   5. Achievements (collapsed — rank + XP + badge preview, expandable)

import Link from 'next/link'
import { FileCheck, Lock } from 'lucide-react'
import { useLocalFirst } from '@/lib/local-first'
// Type-only imports — erased at compile time, pull no server code.
import type { BlindSpot, RadarDatum } from './weak-spots-data'
import type { Achievements } from '@/lib/achievements-server'
import { RadarChart } from './radar-chart'
import { ImprovementSection, PracticeNextSection, type Improvement } from './practice-next-section'
import { PacingSection, type PacingAnalytics } from './pacing-section'
import type { MistakesData } from './mistakes-section'
import { AchievementsSection } from './achievements-section'
import { BadgeToasts } from '@/components/gamification/BadgeToasts'

type SessionRow = {
  category: string
  score: number | null
  total: number
  submitted_at: string | null
  time_limit_secs: number | null
}

// ── Local copy of the /api/app/progress overview contract ────────────────────
// Typed here (not imported from the API route) so the UI compiles independently.
type Overview = {
  totalTests: number
  answered: number
  correct: number
  wrong: number
  accuracyPct: number | null
  activeDays: number
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
  // Accuracy trend in 50-question blocks. Absent on stale cached payloads,
  // null when the server has no data — both render nothing.
  improvement?: Improvement | null
  // Headline stats for the Analysis Overview card. Absent on stale cached
  // payloads, null when the server has no data — both render the radar alone.
  overview?: Overview | null
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

/** sm+ overview stat — one compact vertical-stack row: mono number + steel label. */
function OverviewRow({
  value,
  label,
  sub,
}: {
  value: string
  label: string
  sub?: string
}) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-xl font-bold font-mono text-primary-900 tabular-nums">{value}</span>
      <span className="text-xs text-steel">{label}</span>
      {sub && <span className="text-[10px] font-mono text-steel tabular-nums">{sub}</span>}
    </div>
  )
}

/** Mobile overview stat — mini chip (number over tiny label), 4 across in one row. */
function OverviewChip({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center min-w-0">
      <div className="text-lg font-bold font-mono text-primary-900 tabular-nums leading-tight">
        {value}
      </div>
      <div className="text-[10px] text-steel">{label}</div>
    </div>
  )
}

export function ProgressClient({ userId }: { userId: string }) {
  const { data, fresh, error, refresh } = useLocalFirst<ProgressData>(
    `progress:${userId}`,
    '/api/app/progress'
  )

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
  const overview = data.overview ?? null

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

  const fallbackCaption = useSectionFallback && (
    <p className="text-[11px] text-steel mt-2 text-center">
      By section — practice more topics to unlock the detailed topic radar.
    </p>
  )

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <h1 className="font-serif text-2xl sm:text-3xl font-black text-gray-900 mb-1">Progress</h1>
      <p className="text-steel text-sm mb-6">Your weak spots &amp; test history</p>

      {/* ── 1. Analysis Overview — radar + headline stats (TOP) ────────── */}
      {chartData || overview ? (
        <section className="mb-6">
          <div className="bg-white rounded-xl border border-line shadow-card p-6">
            <h2 className="font-mono text-[10px] font-semibold text-steel uppercase tracking-[0.12em] mb-4">
              Analysis Overview
            </h2>
            {/* Golden-ratio split on sm+: radar hero column ~62%, stats ~38%.
                Mobile stacks: radar centered on top, stats as one chip row. */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-6">
              {/* Radar — Pro sees it plain, free sees it blurred behind a lock */}
              {chartData ? (
                <div className="sm:flex-[1.62] min-w-0 text-center">
                  {isPro ? (
                    <>
                      <RadarChart data={chartData} />
                      {fallbackCaption}
                    </>
                  ) : (
                    <>
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
                    </>
                  )}
                </div>
              ) : (
                spots.length > 0 && (
                  <div className="sm:flex-[1.62] min-w-0 flex items-center">
                    <p className="text-xs text-steel">
                      Take tests across more sections to unlock your topic proficiency radar.
                    </p>
                  </div>
                )
              )}

              {/* Headline stats — absent on stale payloads → radar alone.
                  sm+: 4 compact rows stacked vertically in the narrow column.
                  <sm: one horizontal row of 4 mini chips under the radar. */}
              {overview && (
                <div className="sm:flex-1 min-w-0">
                  <div className="hidden sm:flex flex-col gap-3.5">
                    <OverviewRow value={String(overview.totalTests)} label="tests" />
                    <OverviewRow value={String(overview.answered)} label="answered" />
                    <OverviewRow
                      value={overview.accuracyPct !== null ? `${overview.accuracyPct}%` : '—'}
                      label="accuracy"
                      sub={`${overview.correct}✓ ${overview.wrong}✗`}
                    />
                    <OverviewRow value={String(overview.activeDays)} label="active days" />
                  </div>
                  <div className="flex sm:hidden justify-between gap-2">
                    <OverviewChip value={String(overview.totalTests)} label="tests" />
                    <OverviewChip value={String(overview.answered)} label="answered" />
                    <OverviewChip
                      value={overview.accuracyPct !== null ? `${overview.accuracyPct}%` : '—'}
                      label="accuracy"
                    />
                    <OverviewChip value={String(overview.activeDays)} label="active days" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      ) : (
        spots.length > 0 && (
          <p className="text-xs text-steel mb-6">
            Take tests across more sections to unlock your topic proficiency radar.
          </p>
        )
      )}

      {/* ── 2. What to practice next — recommendations + Drill CTA ─────── */}
      <PracticeNextSection
        spots={spots}
        sectionRadar={data.sectionRadar}
        mistakes={data.mistakes}
        isPro={isPro}
      />

      {/* Mistakes UI removed — `data.mistakes` still feeds the DB, the Weak Spot Drill targeting, and the AI tutor (and PracticeNextSection above). */}

      {/* ── 3. Pacing — one 50/50 card; absent/null on stale payloads → nothing ── */}
      {data.pacing ? <PacingSection pacing={data.pacing} /> : null}

      {/* ── 4. Improvement + Recent tests — paired on sm+ (stacked <sm).
             Improvement absent/null on stale payloads → Recent tests full width. ── */}
      <div className={data.improvement ? 'sm:grid sm:grid-cols-2 sm:gap-3' : undefined}>
        {data.improvement ? <ImprovementSection improvement={data.improvement} /> : null}

        <section className="min-w-0">
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
            {recentSessions.slice(0, 5).map((s, i) => {
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
      </div>

      {/* ── 5. Achievements (LAST) — absent/null on stale payloads → nothing ── */}
      {data.achievements ? <AchievementsSection achievements={data.achievements} /> : null}

      {/* Unlock toasts — diff only on FRESH payloads (stale cache was already seen) */}
      <BadgeToasts userId={userId} achievements={fresh ? data.achievements : null} />
    </div>
  )
}
