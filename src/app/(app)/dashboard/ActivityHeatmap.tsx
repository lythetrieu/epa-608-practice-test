'use client'

import { Fragment } from 'react'

// GitHub-style activity heatmap for the Home dashboard. 16 week columns
// (ending this week) × 7 weekday rows (Sun on top), each cell colored by how
// many questions the user answered that day. Data comes from
// DashboardData.activity (server-computed UTC YYYY-MM-DD counts) — this
// component only lays out the grid. All date math is UTC (toISOString slices)
// to stay consistent with the server's keys and the streak logic.
//
// Approved skin (mockup ACTIVITY frame): the header lives OUTSIDE the card as
// a mono kicker ("ACTIVITY — LAST 16 WEEKS"), the card holds only the grid —
// true GitHub-compact cells: fixed 11px squares, 3px gap, 2px radius,
// LEFT-aligned (16 weeks ≈ 221px wide) — plus a right-aligned mono LESS/MORE
// legend. No month/weekday labels.

type Activity = {
  days: Record<string, number>
  activeDays: number
  windowDays: number
}

const WEEKS = 16
const DAY_MS = 86_400_000

// Fixed GitHub-small cell: 11px square, 2px radius.
const CELL = 'w-[11px] h-[11px] rounded-[2px]'

// Color levels: 10 answers ≈ one quiz. Navy-tint ramp (approved skin —
// navy is the single workhorse fill; green is reserved for status labels).
const RAMP = ['bg-gray-100', 'bg-blue-100', 'bg-blue-300', 'bg-blue-800']

function levelClass(count: number): string {
  if (count === 0) return RAMP[0]
  if (count <= 2) return RAMP[1]
  if (count <= 9) return RAMP[2]
  return RAMP[3]
}

export function ActivityHeatmap({ activity }: { activity: Activity }) {
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
    <>
      <h2 className="font-mono text-[10px] font-semibold text-steel uppercase tracking-[0.12em] mb-1.5 px-0.5">
        Activity — last {WEEKS} weeks
      </h2>
      <section className="bg-white border border-line rounded-xl shadow-card p-3 mb-2.5">
        {/* Fixed 11px columns, left-aligned inside the card (no stretching) */}
        <div
          className="grid gap-[3px] justify-start"
          style={{ gridTemplateColumns: `repeat(${WEEKS}, 11px)` }}
          role="img"
          aria-label={`Practice activity: ${activity.activeDays} active days in the last ${WEEKS} weeks`}
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

        {/* Legend — mono LESS/MORE row, right-aligned (mockup frame) */}
        <div
          className="flex items-center justify-end gap-1 mt-1.5 font-mono text-[9px] leading-none text-steel"
          aria-hidden="true"
        >
          <span>LESS</span>
          {RAMP.map(cls => (
            <span key={cls} className={`${CELL} ${cls}`} />
          ))}
          <span>MORE</span>
        </div>
      </section>
    </>
  )
}
