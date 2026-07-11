'use client'

import { Fragment } from 'react'

// GitHub-style activity heatmap for the Home dashboard — compact half-width
// card (right column of the PACE & ACTIVITY row, only used there). 12 week
// columns (ending this week) × 7 weekday rows (Sun on top), each cell colored
// by how many questions the user answered that day. Data comes from
// DashboardData.activity (server-computed UTC YYYY-MM-DD counts) — this
// component only lays out the grid. All date math is UTC (toISOString slices)
// to stay consistent with the server's keys and the streak logic.
//
// Sizing: fixed 10px squares, 2px gap → 12×10 + 11×2 = 142px wide, safe
// inside a half-width card at 390px viewports. The kicker lives on the parent
// row ("PACE & ACTIVITY"); the card holds the grid + an "N active days"
// caption (the LESS/MORE legend was dropped for the compact size). Per-day
// tooltips (title) kept.

type Activity = {
  days: Record<string, number>
  activeDays: number
  windowDays: number
}

const WEEKS = 12
const DAY_MS = 86_400_000

// Compact cell: 10px square, 2px radius.
const CELL = 'w-[10px] h-[10px] rounded-[2px]'

// Color levels: 10 answers ≈ one quiz. Navy-tint ramp (approved skin —
// navy is the single workhorse fill; green is reserved for status labels).
const RAMP = ['bg-gray-100', 'bg-blue-100', 'bg-blue-300', 'bg-blue-800']

function levelClass(count: number): string {
  if (count === 0) return RAMP[0]
  if (count <= 2) return RAMP[1]
  if (count <= 9) return RAMP[2]
  return RAMP[3]
}

export function ActivityHeatmap({
  activity,
  className = '',
}: {
  activity: Activity
  className?: string
}) {
  const now = Date.now()
  const todayStr = new Date(now).toISOString().slice(0, 10)
  // Sunday of the current UTC week, then back (WEEKS-1) more weeks → grid start.
  const startMs =
    now - new Date(now).getUTCDay() * DAY_MS - (WEEKS - 1) * 7 * DAY_MS

  // Columns = weeks (oldest → current), rows = weekdays (Sun top → Sat).
  const weeks = Array.from({ length: WEEKS }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const dateStr = new Date(startMs + (w * 7 + d) * DAY_MS)
        .toISOString()
        .slice(0, 10)
      return {
        dateStr,
        count: activity.days[dateStr] ?? 0,
        future: dateStr > todayStr,
      }
    })
  )

  return (
    <section
      className={`bg-white border border-line rounded-xl shadow-card px-3 py-2.5 min-w-0 ${className}`}
    >
      {/* Fixed 10px columns, left-aligned inside the card (no stretching) */}
      <div
        className="grid gap-[2px] justify-start"
        style={{ gridTemplateColumns: `repeat(${WEEKS}, 10px)` }}
        role="img"
        aria-label={`Practice activity heatmap, last ${WEEKS} weeks — ${activity.activeDays} active days`}
      >
        {Array.from({ length: 7 }, (_, d) => (
          <Fragment key={d}>
            {weeks.map(week => {
              const cell = week[d]
              return (
                <div
                  key={cell.dateStr}
                  className={`${CELL} ${
                    cell.future ? 'opacity-0' : levelClass(cell.count)
                  }`}
                  title={
                    cell.future
                      ? undefined
                      : `${cell.dateStr} · ${cell.count} answer${cell.count === 1 ? '' : 's'}`
                  }
                />
              )
            })}
          </Fragment>
        ))}
      </div>

      {/* Caption replaces the LESS/MORE legend at this size */}
      <p className="mt-1.5 font-mono text-[10px] leading-none text-steel tabular-nums">
        {activity.activeDays} active days
      </p>
    </section>
  )
}
