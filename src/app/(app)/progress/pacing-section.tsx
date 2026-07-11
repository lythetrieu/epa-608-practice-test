'use client'

// Pacing analytics section for the Progress page. Renders the server-computed
// pacing payload (avg speed vs exam budget + slowest topics). Everything here
// is presentational — the math lives server-side and in quiz/pacing.ts.
// (The per-day trend bars were removed — the Improvement section's block bars
// tell the progress-over-time story. The localStorage "most recent test" card
// was removed earlier — ResultView shows that detail right after each test.)

import Link from 'next/link'
import {
  formatSecs,
  formatSecsLong,
  paceDelta,
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

// Tailwind classes per delta bucket — chips keep their semantic colors (state
// lives in labels).
const CHIP_CLASSES: Record<PaceDelta, string> = {
  green: 'bg-green-50 text-green-700',
  amber: 'bg-amber-50 text-amber-700',
  red: 'bg-red-50 text-red-600',
}

function deltaChipText(avgMs: number, budgetMs: number): string {
  const deltaSecs = Math.round((avgMs - budgetMs) / 1000)
  if (deltaSecs === 0) return 'on pace'
  return deltaSecs > 0 ? `+${deltaSecs}s over` : `${-deltaSecs}s under`
}

export function PacingSection({ pacing }: { pacing: PacingAnalytics }) {
  const { sampleSize, avgMs, examBudgetMs, slowTopics } = pacing
  const overallDelta = paceDelta(avgMs, examBudgetMs)

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
      </div>

      {/* ── Slow topics ───────────────────────────────────────────────── */}
      {slowTopics.length > 0 && (
        <div className="mt-4">
          <h3 className="font-mono text-[10px] font-semibold text-steel uppercase tracking-[0.12em] mb-1">Slow topics</h3>
          <p className="text-xs text-steel mb-2">
            Slow topics cost you exam time. Slow + wrong topics cost you the exam.
          </p>
          <div className="space-y-2">
            {slowTopics.slice(0, 3).map((topic) => {
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
