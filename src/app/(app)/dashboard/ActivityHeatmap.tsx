'use client'

import { Fragment } from 'react'

// GitHub-style activity heatmap for the Home dashboard. 14 week columns
// (ending this week) × 7 weekday rows (Sun on top), each cell colored by how
// many questions the user answered that day. Data comes from
// DashboardData.activity (server-computed UTC YYYY-MM-DD counts) — this
// component only lays out the grid. All date math is UTC (toISOString slices)
// to stay consistent with the server's keys and the streak logic.
//
// Approved skin (mockup ACTIVITY frame): the header lives OUTSIDE the card as
// a mono kicker ("ACTIVITY — LAST 14 WEEKS"), the card holds only the grid —
// big rounded cells stretched edge-to-edge, light navy ramp — plus a small
// mono LESS/MORE legend. No month/weekday labels.

type Activity = {
  days: Record<string, number>
  activeDays: number
  windowDays: number
}

const WEEKS = 14
const DAY_MS = 86_400_000

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
  // Sunday of the current UTC week, then back 13 more weeks → grid start.
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
      <h2 className="font-mono text-[10px] font-semibold text-gray-400 uppercase tracking-[0.12em] mb-2 px-0.5">
        Activity — last {WEEKS} weeks
      </h2>
      <section className="bg-white border border-gray-200 rounded-2xl p-4 mb-3">
        {/* 14 equal columns, edge-to-edge — cells are aspect-square so they
            scale chunky with the card width (no dead whitespace). */}
        <div
          className="grid gap-1"
          style={{ gridTemplateColumns: `repeat(${WEEKS}, minmax(0, 1fr))` }}
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
                    className={`aspect-square w-full rounded-md ${
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

        {/* Legend — mono LESS/MORE row, per the mockup frame */}
        <div
          className="flex items-center gap-1 mt-2.5 font-mono text-[9px] leading-none text-gray-400"
          aria-hidden="true"
        >
          <span>LESS</span>
          {RAMP.map(cls => (
            <span key={cls} className={`w-2.5 h-2.5 rounded-[3px] ${cls}`} />
          ))}
          <span>MORE</span>
        </div>
      </section>
    </>
  )
}
