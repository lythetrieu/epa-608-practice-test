'use client'

// Horizontal LIMIT bar for pacing cards (Home PACE card + Progress pacing
// summary). The 72s/question budget is a hard limit, not a target: go over it
// and you will NOT finish the real exam in time. Approved skin (mockup pace
// card): solid navy fill with a round navy NEEDLE dot at the user's position,
// a red tick at the 72s LIMIT, a diagonal-hatch danger zone past it, and a
// mono scale row (0s · 72s LIMIT · max) underneath. State lives in the
// labels/copy, never in the fill.

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
  const maxSecs = Math.round(maxMs / 1000)
  const marginMin = finishMarginMinutes(avgMs, budgetMs)

  const copy = over
    ? `Over the ${budgetSecs}s/question limit — at this pace you won't finish the exam (≈${marginMin} min short).`
    : `At your pace you'd finish with ~${marginMin} min to spare.`

  return (
    <div className="w-full">
      {/* Bar is decorative — the copy line below carries the information. */}
      <div aria-hidden="true">
        <div className="relative h-3 rounded-md bg-blue-50 border border-line">
          {/* Danger zone past the limit: neutral diagonal hatch (red lives in
              the LIMIT marker only) */}
          <div
            className="absolute inset-y-0 right-0 rounded-r-md"
            style={{
              left: `${limitPct}%`,
              background:
                'repeating-linear-gradient(135deg, rgba(15,31,61,.12) 0 3px, transparent 3px 7px)',
            }}
          />
          {/* Navy fill up to the user's average */}
          <div
            className="absolute inset-y-0 left-0 rounded-md bg-orange-500"
            style={{ width: `${fillPct}%` }}
          />
          {/* Red tick at the hard limit */}
          <div
            className="absolute -top-0.5 -bottom-0.5 w-0.5 bg-red-600"
            style={{ left: `${limitPct}%` }}
          />
          {/* Round navy needle at the user's position */}
          <div
            className="absolute top-1/2 w-3.5 h-3.5 rounded-full bg-blue-800 border-[3px] border-white shadow -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${fillPct}%` }}
          />
        </div>
        {/* Scale row: 0s left · red "72s LIMIT" under the tick · max right */}
        <div className="relative mt-1 h-2.5 font-mono text-[9px] leading-none text-steel">
          <span className="absolute left-0 top-0">0s</span>
          <span className="absolute right-0 top-0">{maxSecs}s</span>
          <span
            className="absolute top-0 -translate-x-1/2 font-bold text-red-600 whitespace-nowrap"
            style={{ left: `${limitPct}%` }}
          >
            {budgetSecs}s LIMIT
          </span>
        </div>
      </div>
      {/* Kept (not duplicate of the will/won't chip): carries the projected
          minutes short/spare number. Shrunk for density. */}
      <p className={`mt-1 text-[11px] leading-snug ${over ? 'text-red-600' : 'text-steel'}`}>{copy}</p>
    </div>
  )
}
