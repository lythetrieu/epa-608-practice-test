'use client'

// GitHub-style activity heatmap for the Home dashboard. 16 week columns
// (ending this week) × 7 weekday rows (Sun on top), each cell colored by how
// many questions the user answered that day. Data comes from
// DashboardData.activity (server-computed UTC YYYY-MM-DD counts) — this
// component only lays out the grid. All date math is UTC (toISOString slices)
// to stay consistent with the server's keys and the streak logic.

type Activity = {
  days: Record<string, number>
  activeDays: number
  windowDays: number
}

const WEEKS = 16
const DAY_MS = 86_400_000

// Color levels: 10 answers ≈ one quiz. Navy-tint ramp (approved skin —
// navy is the single workhorse fill; green is reserved for status labels).
function levelClass(count: number): string {
  if (count === 0) return 'bg-gray-100'
  if (count <= 2) return 'bg-blue-100'
  if (count <= 9) return 'bg-blue-300'
  return 'bg-blue-800'
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
      <div
        className="flex gap-[2px]"
        role="img"
        aria-label={`Practice activity: ${activity.activeDays} active days in the last 16 weeks`}
      >
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[2px]">
            {week.map(cell => (
              <div
                key={cell.dateStr}
                className={`w-[10px] h-[10px] rounded-[2px] ${
                  cell.future ? 'opacity-0' : levelClass(cell.count)
                }`}
                title={
                  cell.future
                    ? undefined
                    : `${cell.dateStr} · ${cell.count} answer${cell.count === 1 ? '' : 's'}`
                }
              />
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}
