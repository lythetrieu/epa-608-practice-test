'use client'

// Local-first Progress page (Perf Phase 3). Renders the last cached snapshot
// from localStorage instantly, fetches /api/app/progress in the background,
// and re-renders silently when fresh data lands. JSX is moved verbatim from
// the old server page.tsx — only the data source changed.

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ClipboardList, FileCheck, Lock, Target, Timer } from 'lucide-react'
import { readCache, useLocalFirst } from '@/lib/local-first'
import { formatSecs, lastPacingKey, type LastPacing } from '@/components/quiz/pacing'
// Type-only import — erased at compile time, pulls no server code.
import type { BlindSpot, RadarDatum } from './weak-spots-data'
import { RadarChart } from './radar-chart'

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
  const { data, error, refresh } = useLocalFirst<ProgressData>(
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
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
            <p className="text-sm text-gray-500 mb-4">Couldn&apos;t load your progress.</p>
            <button
              onClick={() => void refresh()}
              className="px-5 py-2.5 bg-blue-800 text-white rounded-lg text-sm font-semibold hover:bg-blue-900 transition-colors"
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

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Progress</h1>
      <p className="text-gray-500 text-sm mb-6">Your weak spots &amp; test history</p>

      {/* ── Topic Proficiency radar ─────────────────────────────────── */}
      {radarData.length >= 3 ? (
        <section className="mb-6">
          {isPro ? (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 text-center">
                Topic Proficiency
              </h2>
              <RadarChart data={radarData} />
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Topic Proficiency
              </h2>
              {/* Real radar rendered but BLURRED — free users see the insight exists */}
              <div className="relative inline-block w-full max-w-xs mx-auto mb-4">
                <div className="blur-md pointer-events-none select-none" aria-hidden>
                  <RadarChart data={radarData} />
                </div>
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/30 rounded-lg">
                  <div className="w-11 h-11 rounded-full bg-white shadow flex items-center justify-center">
                    <Lock size={20} className="text-blue-800" aria-hidden />
                  </div>
                  <p className="text-sm font-semibold text-gray-800">Radar Chart — Pro</p>
                </div>
              </div>
              <p className="text-xs text-gray-500 mb-4">
                Upgrade to see your weak-area breakdown across all 8 topic areas at a glance.
              </p>
              <Link
                href={`/checkout.html`}
                className="inline-block px-5 py-2.5 bg-blue-800 text-white rounded-lg text-sm font-semibold hover:bg-blue-900 transition-colors"
              >
                Upgrade — $14.99 lifetime
              </Link>
            </div>
          )}
        </section>
      ) : (
        spots.length > 0 && (
          <p className="text-xs text-gray-400 mb-6">
            Take tests across more sections to unlock your topic proficiency radar.
          </p>
        )
      )}

      {/* ── Weak spots ──────────────────────────────────────────────── */}
      {topSpots.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-10 text-center mb-8">
          <ClipboardList size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium mb-2">No weak spots detected yet</p>
          <p className="text-gray-400 text-sm mb-6">
            Take a few tests first to identify your weak areas. We need at least 2 attempts per
            subtopic.
          </p>
          <Link
            href="/dashboard"
            className="inline-block px-5 py-2.5 bg-blue-800 text-white rounded-lg text-sm font-semibold hover:bg-blue-900 transition-colors"
          >
            Start a Practice Test
          </Link>
        </div>
      ) : (
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Weak Spots — by error rate
          </h2>
          <div className="space-y-2">
            {topSpots.map((spot) => {
              const errorPct = Math.round(spot.errorRate * 100)
              const barColor =
                errorPct > 50 ? 'bg-red-500' : errorPct >= 30 ? 'bg-orange-400' : 'bg-green-500'
              const labelColor =
                errorPct > 50 ? 'text-red-600' : errorPct >= 30 ? 'text-orange-500' : 'text-green-600'
              const slug = CATEGORY_SLUGS[spot.category] ?? 'core'

              return (
                <div key={spot.subtopic_id} className="bg-white rounded-xl border border-gray-200 px-5 py-4">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <span className="font-medium text-gray-800 text-sm">{spot.label}</span>
                    <span className={`text-sm font-bold shrink-0 ${labelColor}`}>{errorPct}% errors</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-1.5">
                    <div
                      className={`h-full rounded-full transition-all ${barColor}`}
                      style={{ width: `${errorPct}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                    <span>{spot.correctCount}/{spot.totalAttempts} correct</span>
                    <span>{spot.category}</span>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href="/learn"
                      className="text-xs px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 font-medium hover:bg-blue-100"
                    >
                      Study This Topic
                    </Link>
                    <Link
                      href={`/test/${slug}?mode=practice`}
                      className="text-xs px-3 py-1.5 rounded-lg text-gray-500 font-medium hover:bg-gray-50 hover:text-gray-700"
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
            <Link
              href="/test/weak-spots"
              className="mt-4 flex items-center justify-center gap-2 w-full px-5 py-3.5 bg-blue-800 text-white rounded-xl font-semibold hover:bg-blue-900 transition-colors text-center"
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
                  className="shrink-0 px-4 py-2 bg-blue-800 text-white rounded-lg text-sm font-semibold hover:bg-blue-900 transition-colors"
                >
                  Upgrade — $14.99
                </Link>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── Last test pace (localStorage, written by TestClient) ───────── */}
      {lastPacing && (
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Last test pace
          </h2>
          <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center shrink-0">
                <Timer size={18} aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-gray-800 truncate">
                  {lastPacing.category} ·{' '}
                  {new Date(lastPacing.date).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })}
                </div>
                <div className="text-xs text-gray-400">
                  Exam pace: {Math.round(lastPacing.budgetMs / 1000)}s/question
                </div>
              </div>
              <span className="text-sm font-bold text-gray-900 tabular-nums shrink-0">
                {formatSecs(lastPacing.avgMs)}/question
              </span>
            </div>
            <p
              className={`mt-2 text-xs font-medium ${
                lastPacing.avgMs <= lastPacing.budgetMs ? 'text-green-600' : 'text-amber-600'
              }`}
            >
              {lastPacing.verdict}
            </p>
          </div>
        </section>
      )}

      {/* ── Recent tests ────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Recent Tests</h2>
          <Link href="/history" className="text-xs text-blue-700 hover:underline font-medium">
            Full history &rarr;
          </Link>
        </div>
        {recentSessions.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-6 text-center">
            <p className="text-gray-400 text-sm">
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
                  className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center gap-3"
                >
                  <span className="w-9 h-9 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center shrink-0">
                    <FileCheck size={18} aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-gray-800 truncate">
                      {s.category} · {mode}
                    </div>
                    <div className="text-xs text-gray-400">
                      {new Date(s.submitted_at!).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}{' '}
                      · {s.score ?? 0}/{s.total}
                    </div>
                  </div>
                  <span className={`text-sm font-bold shrink-0 ${pct >= 70 ? 'text-green-600' : 'text-orange-500'}`}>
                    {pct}%
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
