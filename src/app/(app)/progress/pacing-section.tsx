'use client'

// Pacing analytics for the Progress page — ONE card that lives in the RIGHT
// half of the top row (beside the Section-strengths radar) on sm+, where its
// internals stack vertically: PACING kicker → pace value + will/won't pill →
// compact PaceBar → SLOW TOPICS kicker → 3 bare one-line rows (informational
// only — the practice actions live in "Fix these first" below). On mobile the
// card is full-width and the two blocks sit side by side (2 columns).
// Everything here is presentational — the math lives server-side and in
// quiz/pacing.ts.

import { formatSecs, formatSecsLong } from '@/components/quiz/pacing'
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

export function PacingSection({ pacing }: { pacing: PacingAnalytics }) {
  const { sampleSize, avgMs, examBudgetMs, slowTopics } = pacing
  const onPace = avgMs <= examBudgetMs

  return (
    // h-full → matches the radar card's height in the sm+ 50/50 row
    // (items-stretch on the parent grid). Internals: 2 columns side by side on
    // mobile (card is full-width there), vertical stack with breathing room on
    // sm+ (card is half-width there).
    <section className="bg-white rounded-xl border border-line shadow-card p-4 h-full min-w-0">
      <div className="h-full grid grid-cols-2 gap-4 sm:grid-cols-1 sm:gap-6 sm:content-center">
        {/* ── Pace summary ───────────────────────────────────────────── */}
        <div className="min-w-0">
          <h2 className="font-mono text-[10px] font-semibold text-steel uppercase tracking-[0.12em] mb-2">
            Pacing
          </h2>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-mono text-2xl font-bold text-primary-900 tabular-nums leading-none">
              {formatSecsLong(avgMs)}
              <span className="font-sans text-xs font-semibold text-steel">/q</span>
            </span>
            <span
              className={`font-mono text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border ${
                onPace
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : 'bg-red-50 text-red-600 border-red-200'
              }`}
            >
              {onPace ? 'will finish' : "won't finish"}
            </span>
          </div>
          <div className="mt-3">
            <PaceBar avgMs={avgMs} budgetMs={examBudgetMs} compact />
          </div>
          <p className="mt-1.5 font-mono text-[10px] text-steel tabular-nums">
            {sampleSize} answers
          </p>
        </div>

        {/* ── Slow topics — bare compact lines, no actions ───────────── */}
        <div className="min-w-0">
          <h3 className="font-mono text-[10px] font-semibold text-steel uppercase tracking-[0.12em] mb-2">
            Slow topics
          </h3>
          {slowTopics.length === 0 ? (
            <p className="text-[12px] text-steel">No slow topics — pace looks good.</p>
          ) : (
            <ul className="space-y-1.5">
              {slowTopics.slice(0, 3).map((topic) => {
                const label = SUBTOPIC_LABELS[topic.subtopic_id] ?? topic.subtopic_id
                const slowAndWrong = topic.errorRate >= 0.3
                return (
                  <li
                    key={topic.subtopic_id}
                    className="flex items-center gap-1.5 text-[12px] min-w-0"
                    title={slowAndWrong ? `${label} — slow and often wrong` : label}
                  >
                    {slowAndWrong && (
                      <>
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"
                          aria-hidden
                        />
                        <span className="sr-only">slow and wrong:</span>
                      </>
                    )}
                    <span className="truncate text-gray-800">{label}</span>
                    <span className="font-mono font-semibold text-primary-900 tabular-nums shrink-0">
                      · {formatSecs(topic.avgMs)}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}
