'use client'

import { Fragment } from 'react'

// GitHub-style activity heatmap for the Home dashboard. 16 week columns
// (ending this week) × 7 weekday rows (Sun on top), each cell colored by how
// many questions the user answered that day. Data comes from
// DashboardData.activity (server-computed UTC YYYY-MM-DD counts) — this
// component only lays out the grid. All date math is UTC (toISOString slices)
// to stay consistent with the server's keys and the streak logic.
//
// Layout: one CSS grid — column 0 holds the weekday hint labels (Mon/Wed/Fri),
// row 0 holds month labels where the month changes, and the 16 week columns
// are `1fr` so the block stretches edge-to-edge in the card (cells are
// aspect-square, so they scale with the card width — no dead whitespace).

type Activity = {
  days: Record<string, number>
  activeDays: number
  windowDays: number
}

const WEEKS = 16
const DAY_MS = 86_400_000
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
// Row index (Sun=0) → hint label. Mon/Wed/Fri only, like GitHub.
const WEEKDAY_HINTS: Record<number, string> = { 1: 'Mon', 3: 'Wed', 5: 'Fri' }

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
  // Sunday of the current UTC week, then back 15 more weeks → grid start.
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

  // Month label per week column: show where the month changes vs the previous
  // column (keyed off each week's Sunday). Skip week 0's label if week 1
  // already starts a new month, so two labels never collide.
  const weekMonths = Array.from({ length: WEEKS }, (_, w) =>
    new Date(startMs + w * 7 * DAY_MS).getUTCMonth()
  )
  const monthLabels = weekMonths.map((m, w) => {
    if (w === 0) return weekMonths[1] === m ? MONTHS[m] : ''
    return m !== weekMonths[w - 1] ? MONTHS[m] : ''
  })

  return (
    <section className="bg-white border border-gray-200 rounded-2xl px-4 py-3 mb-3">
      <div className="flex items-center justify-between gap-2 mb-2">
        <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
          Activity
        </h2>
        <span className="text-[11px] text-gray-400">
          {activity.activeDays} active days · last 16 weeks
        </span>
      </div>

      {/* auto column = weekday hints; auto row = month labels; cells fill the
          rest. Width is CAPPED and centered — full-bleed cells read chunky, so
          the grid sits at a calm ~13px/cell and the card keeps its air. */}
      <div
        className="grid gap-[2px] max-w-[288px] mx-auto"
        style={{ gridTemplateColumns: `auto repeat(${WEEKS}, minmax(0, 1fr))` }}
        role="img"
        aria-label={`Practice activity: ${activity.activeDays} active days in the last 16 weeks`}
      >
        {/* Row 0: corner spacer + month labels where the month changes */}
        <div aria-hidden="true" />
        {monthLabels.map((label, w) => (
          <div
            key={`m${w}`}
            className="text-[9px] leading-none text-gray-400 whitespace-nowrap overflow-visible"
            aria-hidden="true"
          >
            {label}
          </div>
        ))}

        {/* Rows 1–7: weekday hint + one cell per week column */}
        {Array.from({ length: 7 }, (_, d) => (
          <Fragment key={d}>
            <div
              className="flex items-center pr-1 text-[9px] leading-none text-gray-400"
              aria-hidden="true"
            >
              {WEEKDAY_HINTS[d] ?? ''}
            </div>
            {weeks.map(week => {
              const cell = week[d]
              return (
                <div
                  key={cell.dateStr}
                  className={`aspect-square w-full rounded-[2px] ${
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

      {/* Legend — right-aligned, GitHub style */}
      <div className="flex items-center justify-end gap-[3px] mt-2" aria-hidden="true">
        <span className="text-[9px] leading-none text-gray-400 mr-0.5">Less</span>
        {RAMP.map(cls => (
          <span key={cls} className={`w-2.5 h-2.5 rounded-[3px] ${cls}`} />
        ))}
        <span className="text-[9px] leading-none text-gray-400 ml-0.5">More</span>
      </div>
    </section>
  )
}
