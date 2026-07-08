'use client'

// Horizontal target bar for pacing cards (Home PACE card + Progress pacing
// summary). Purely presentational: a thin track scaled 0 → max(avgMs,
// 1.5×budget), a vertical marker at the exam budget (72s) with a tiny label,
// and a fill colored by the shared paceDelta rule. The copy line under the
// bar spells out exactly what the target means.

import { formatSecsLong, paceDelta, type PaceDelta } from './pacing'

const FILL_CLASSES: Record<PaceDelta, string> = {
  green: 'bg-green-500',
  amber: 'bg-amber-400',
  red: 'bg-red-500',
}

export function PaceBar({
  avgMs,
  budgetMs = 72_000,
}: {
  avgMs: number
  budgetMs?: number
}) {
  // Scale: 0 → max(avgMs, 1.5×budget) so the 72s marker always sits inside
  // the track with headroom, and a very slow average still fits.
  const maxMs = Math.max(avgMs, budgetMs * 1.5)
  const fillPct = maxMs > 0 ? Math.min((avgMs / maxMs) * 100, 100) : 0
  const targetPct = maxMs > 0 ? (budgetMs / maxMs) * 100 : 0
  const delta = paceDelta(avgMs, budgetMs)
  const budgetSecs = Math.round(budgetMs / 1000)

  const copy =
    delta === 'green'
      ? `You answer in ${formatSecsLong(avgMs)} — under the ${budgetSecs}s/question needed to finish on time.`
      : `Target: ${budgetSecs}s/question to finish on time — you're ${formatSecsLong(avgMs - budgetMs)} over.`

  return (
    <div className="w-full">
      {/* Bar is decorative — the copy line below carries the information. */}
      <div className="relative pt-4" aria-hidden="true">
        <span
          className="absolute top-0 text-[10px] leading-none text-gray-400 whitespace-nowrap"
          style={{ left: `${targetPct}%`, transform: 'translateX(-50%)' }}
        >
          {budgetSecs}s target
        </span>
        <div className="relative h-2 rounded-full bg-gray-100">
          <div
            className={`h-full rounded-full ${FILL_CLASSES[delta]}`}
            style={{ width: `${fillPct}%` }}
          />
          {/* Vertical marker at the exam budget */}
          <div
            className="absolute -inset-y-0.5 w-px bg-gray-400"
            style={{ left: `${targetPct}%` }}
          />
        </div>
      </div>
      <p className="mt-1.5 text-xs text-gray-500">{copy}</p>
    </div>
  )
}
