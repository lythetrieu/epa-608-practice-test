'use client'

// Horizontal LIMIT bar for pacing cards (Home PACE card + Progress pacing
// summary). The 72s/question budget is a hard limit, not a target: go over it
// and you will NOT finish the real exam in time. The track paints the zone
// beyond the limit red so the bar reads "safe zone | danger zone", the fill is
// green under the limit and red over it, and the copy line projects the
// finish margin over a full 25-question exam.

import { finishMarginMinutes } from './pacing'

export function PaceBar({
  avgMs,
  budgetMs = 72_000,
}: {
  avgMs: number
  budgetMs?: number
}) {
  // Scale: 0 → max(avgMs, 1.25×budget) — 90s at the default 72s budget — so
  // the limit marker always sits inside the track and a slow average still fits.
  const maxMs = Math.max(avgMs, budgetMs * 1.25)
  const fillPct = maxMs > 0 ? Math.min((avgMs / maxMs) * 100, 100) : 0
  const limitPct = maxMs > 0 ? (budgetMs / maxMs) * 100 : 0
  const over = avgMs > budgetMs
  const budgetSecs = Math.round(budgetMs / 1000)
  const marginMin = finishMarginMinutes(avgMs, budgetMs)

  const copy = over
    ? `Over the ${budgetSecs}s/question limit — at this pace you won't finish the exam (≈${marginMin} min short).`
    : `At your pace you'd finish with ~${marginMin} min to spare.`

  return (
    <div className="w-full">
      {/* Bar is decorative — the copy line below carries the information. */}
      <div className="relative pt-4" aria-hidden="true">
        <span
          className="absolute top-0 text-[10px] font-semibold leading-none text-red-600 whitespace-nowrap"
          style={{ left: `${limitPct}%`, transform: 'translateX(-50%)' }}
        >
          {budgetSecs}s limit
        </span>
        <div className="relative h-2 rounded-full bg-gray-100">
          {/* Danger zone: past the limit you won't finish the exam */}
          <div
            className="absolute inset-y-0 right-0 rounded-r-full bg-red-100"
            style={{ left: `${limitPct}%` }}
          />
          <div
            className={`relative h-full rounded-full ${over ? 'bg-red-500' : 'bg-green-500'}`}
            style={{ width: `${fillPct}%` }}
          />
          {/* Vertical marker at the hard limit */}
          <div
            className="absolute -inset-y-0.5 w-px bg-red-400"
            style={{ left: `${limitPct}%` }}
          />
        </div>
      </div>
      <p className={`mt-1.5 text-xs ${over ? 'text-red-600' : 'text-gray-500'}`}>{copy}</p>
    </div>
  )
}
