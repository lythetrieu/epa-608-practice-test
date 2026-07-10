'use client'

// Pacing analytics section for the Progress page. Renders the server-computed
// pacing payload (avg speed vs exam budget, per-day trend bars, slowest
// topics) plus the localStorage "most recent test" pace card. Everything here
// is presentational — the math lives server-side and in quiz/pacing.ts.

import Link from 'next/link'
import { Timer } from 'lucide-react'
import {
  formatSecs,
  formatSecsLong,
  paceDelta,
  type LastPacing,
  type PaceDelta,
} from '@/components/quiz/pacing'
import { PaceBar } from '@/components/quiz/pacing-bar'
import { SUBTOPIC_LABELS } from '@/lib/subtopics'

// ── Local copy of the /api/app/progress pacing contract ─────────────────────
// Typed here (not imported from the API route) so the UI compiles independently.
export type PacingTrendPoint = { date: string; avgMs: number; n: number }
export type PacingSlowTopic = {
  subtopic_id: string
  avgMs: number
  attempts: number
  errorRate: number
}
export type PacingAnalytics = {
  sampleSize: number
  avgMs: number
  examBudgetMs: number
  /** Oldest → newest, ≤10 entries. */
  trend: PacingTrendPoint[]
  /** Slowest first, ≤6 entries. */
  slowTopics: PacingSlowTopic[]
}

// Tailwind classes per delta bucket — CHIPS keep their semantic colors (state
// lives in labels), but ALL bar fills are solid navy per the approved skin.
const CHIP_CLASSES: Record<PaceDelta, string> = {
  green: 'bg-green-50 text-green-700',
  amber: 'bg-amber-50 text-amber-700',
  red: 'bg-red-50 text-red-600',
}
const BAR_CLASSES: Record<PaceDelta, string> = {
  green: 'bg-blue-800',
  amber: 'bg-blue-800',
  red: 'bg-blue-800',
}

function deltaChipText(avgMs: number, budgetMs: number): string {
  const deltaSecs = Math.round((avgMs - budgetMs) / 1000)
  if (deltaSecs === 0) return 'on pace'
  return deltaSecs > 0 ? `+${deltaSecs}s over` : `${-deltaSecs}s under`
}

/** The "Most recent test" card (localStorage pace written by TestClient). */
export function LastPacingCard({ lastPacing }: { lastPacing: LastPacing }) {
  return (
    <div className="bg-white rounded-xl border border-line shadow-card px-5 py-4">
      <p className="text-xs font-semibold text-steel mb-2">Most recent test</p>
      <div className="flex items-center gap-3">
        <span className="w-9 h-9 rounded-[7px] bg-gray-100 text-steel flex items-center justify-center shrink-0">
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
          <div className="text-xs text-steel">
            Exam pace: {Math.round(lastPacing.budgetMs / 1000)}s/question
          </div>
        </div>
        <span className="text-sm font-bold font-mono text-primary-900 tabular-nums shrink-0">
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
  )
}

export function PacingSection({
  pacing,
  lastPacing,
}: {
  pacing: PacingAnalytics
  lastPacing: LastPacing | null
}) {
  const { sampleSize, avgMs, examBudgetMs, trend, slowTopics } = pacing
  const overallDelta = paceDelta(avgMs, examBudgetMs)

  // Trend bars scale against the slowest day OR the budget, whichever is
  // larger, so the budget line always fits inside the plot.
  const trendMax = Math.max(examBudgetMs, ...trend.map((t) => t.avgMs))
  const budgetPct = trendMax > 0 ? (examBudgetMs / trendMax) * 100 : 0

  const fmtDay = (iso: string) =>
    new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    })

  return (
    <section className="mb-6">
      <h2 className="font-mono text-[10px] font-semibold text-steel uppercase tracking-[0.12em] mb-3">
        Pacing
      </h2>

      {/* ── Summary card ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-line shadow-card px-5 py-4 mb-2">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-2xl font-bold font-mono text-primary-900 tabular-nums">
            {formatSecsLong(avgMs)}
            <span className="text-sm font-medium font-sans text-steel"> / question</span>
          </span>
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${CHIP_CLASSES[overallDelta]}`}
          >
            {deltaChipText(avgMs, examBudgetMs)}
          </span>
        </div>
        {/* Target bar: fill = user's average, marker = the 72s exam budget */}
        <div className="mt-3">
          <PaceBar avgMs={avgMs} budgetMs={examBudgetMs} />
        </div>
        <div className="mt-1.5 text-right text-xs text-steel">
          based on {sampleSize} answers
        </div>

        {/* ── Trend: one bar per day, oldest → newest ─────────────────── */}
        {trend.length > 1 && (
          <div className="mt-4">
            <div
              className="relative h-16"
              role="img"
              aria-label={`Average seconds per question by day, oldest to newest: ${trend
                .map((t) => `${fmtDay(t.date)} ${Math.round(t.avgMs / 1000)}s`)
                .join(', ')}`}
            >
              {/* Exam-budget guide line */}
              <div
                className="absolute inset-x-0 border-t border-dashed border-gray-300"
                style={{ bottom: `${budgetPct}%` }}
                aria-hidden
              />
              <div className="flex items-end gap-1 h-full" aria-hidden>
                {trend.map((t) => (
                  <div key={t.date} className="flex-1 flex items-end h-full">
                    <div
                      className={`w-full rounded-t-sm ${BAR_CLASSES[paceDelta(t.avgMs, examBudgetMs)]}`}
                      style={{
                        height: `${trendMax > 0 ? Math.max((t.avgMs / trendMax) * 100, 4) : 4}%`,
                      }}
                      title={`${fmtDay(t.date)}: ${formatSecs(t.avgMs)} avg (${t.n} answers)`}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between mt-1 text-[10px] text-steel">
              <span>{fmtDay(trend[0].date)}</span>
              <span>{fmtDay(trend[trend.length - 1].date)}</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Most recent test (localStorage, written by TestClient) ─────── */}
      {lastPacing && (
        <div className="mb-2">
          <LastPacingCard lastPacing={lastPacing} />
        </div>
      )}

      {/* ── Slow topics ───────────────────────────────────────────────── */}
      {slowTopics.length > 0 && (
        <div className="mt-4">
          <h3 className="font-mono text-[10px] font-semibold text-steel uppercase tracking-[0.12em] mb-1">Slow topics</h3>
          <p className="text-xs text-steel mb-2">
            Slow topics cost you exam time. Slow + wrong topics cost you the exam.
          </p>
          <div className="space-y-2">
            {slowTopics.map((topic) => {
              const label = SUBTOPIC_LABELS[topic.subtopic_id] ?? topic.subtopic_id
              const slowAndWrong = topic.errorRate >= 0.3
              return (
                <div
                  key={topic.subtopic_id}
                  className="bg-white rounded-xl border border-line shadow-card px-5 py-4"
                >
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <span className="font-medium text-gray-800 text-sm">{label}</span>
                    <span className="text-sm font-bold font-mono text-primary-900 tabular-nums shrink-0">
                      {formatSecs(topic.avgMs)}/question
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-steel mb-2">
                    <span>{topic.attempts} attempts</span>
                    {slowAndWrong && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600">
                        slow + wrong
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href="/learn"
                      className="text-xs px-3 py-1.5 rounded-[7px] bg-blue-50 text-blue-700 font-medium hover:bg-blue-100"
                    >
                      Study This Topic
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}
