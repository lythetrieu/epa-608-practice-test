'use client'

type Props = {
  activityData: Record<string, number>
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function getColor(count: number): string {
  if (count === 0) return '#ebedf0'
  if (count === 1) return '#9be9a8'
  if (count === 2) return '#40c463'
  if (count <= 4) return '#30a14e'
  return '#216e39'
}

function fmt(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function ActivityHeatmap({ activityData }: Props) {
  // GitHub style: 53 columns (weeks), 7 rows (Sun=0 to Sat=6)
  // End on today, start ~1 year ago on a Sunday
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Find the Sunday of the current week
  const endSunday = new Date(today)
  endSunday.setDate(endSunday.getDate() - endSunday.getDay() + 7) // next Sunday (end of this week)

  // Go back 53 weeks
  const startSunday = new Date(endSunday)
  startSunday.setDate(startSunday.getDate() - 53 * 7)

  // Build grid: 53 columns × 7 rows
  const COLS = 53
  const grid: { dateStr: string; count: number; future: boolean }[][] = []

  for (let col = 0; col < COLS; col++) {
    const week: { dateStr: string; count: number; future: boolean }[] = []
    for (let row = 0; row < 7; row++) {
      const d = new Date(startSunday)
      d.setDate(d.getDate() + col * 7 + row)
      const dateStr = fmt(d)
      const future = d > today
      week.push({
        dateStr,
        count: future ? 0 : (activityData[dateStr] || 0),
        future,
      })
    }
    grid.push(week)
  }

  // Month labels: find first week where a month starts
  const monthLabels: { label: string; col: number }[] = []
  let prevMonth = -1
  for (let col = 0; col < COLS; col++) {
    // Use the first day of the week (Sunday)
    const d = new Date(startSunday)
    d.setDate(d.getDate() + col * 7)
    const month = d.getMonth()
    if (month !== prevMonth) {
      // Only add if there's room (at least 2 cols since last label)
      if (monthLabels.length === 0 || col - monthLabels[monthLabels.length - 1].col >= 3) {
        monthLabels.push({ label: MONTHS[month], col })
      }
      prevMonth = month
    }
  }

  const totalDays = Object.values(activityData).filter(c => c > 0).length
  const totalTests = Object.values(activityData).reduce((a, b) => a + b, 0)

  const CELL = 10
  const GAP = 2
  const STEP = CELL + GAP
  const LEFT_PAD = 26
  const TOP_PAD = 15

  const svgWidth = LEFT_PAD + COLS * STEP
  const svgHeight = TOP_PAD + 7 * STEP

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 sm:p-4">
      <style>{`.heatmap-scroll::-webkit-scrollbar{display:none}.heatmap-scroll{-ms-overflow-style:none;scrollbar-width:none}`}</style>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-700">
          {totalTests} test{totalTests !== 1 ? 's' : ''} in the last year
        </h3>
        <span className="text-xs text-gray-400">{totalDays} active day{totalDays !== 1 ? 's' : ''}</span>
      </div>

      <div className="overflow-x-auto heatmap-scroll">
        <svg width={svgWidth} height={svgHeight + 20} className="block">
          {/* Month labels */}
          {monthLabels.map((m, i) => (
            <text
              key={i}
              x={LEFT_PAD + m.col * STEP}
              y={10}
              className="fill-gray-400"
              fontSize={10}
              fontFamily="system-ui, sans-serif"
            >
              {m.label}
            </text>
          ))}

          {/* Day labels */}
          {['Mon', 'Wed', 'Fri'].map((day, i) => {
            const row = [1, 3, 5][i]
            return (
              <text
                key={day}
                x={LEFT_PAD - 4}
                y={TOP_PAD + row * STEP + CELL - 1}
                className="fill-gray-400"
                fontSize={9}
                fontFamily="system-ui, sans-serif"
                textAnchor="end"
              >
                {day}
              </text>
            )
          })}

          {/* Grid cells */}
          {grid.map((week, col) =>
            week.map((day, row) => (
              <rect
                key={`${col}-${row}`}
                x={LEFT_PAD + col * STEP}
                y={TOP_PAD + row * STEP}
                width={CELL}
                height={CELL}
                rx={2}
                fill={day.future ? 'transparent' : getColor(day.count)}
                stroke={day.future ? 'none' : undefined}
              >
                {!day.future && (
                  <title>{day.dateStr}: {day.count} test{day.count !== 1 ? 's' : ''}</title>
                )}
              </rect>
            ))
          )}

          {/* Legend */}
          <text x={svgWidth - 130} y={svgHeight + 14} className="fill-gray-400" fontSize={9} fontFamily="system-ui, sans-serif">Less</text>
          {['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'].map((color, i) => (
            <rect key={i} x={svgWidth - 105 + i * (CELL + 2)} y={svgHeight + 5} width={CELL} height={CELL} rx={2} fill={color} />
          ))}
          <text x={svgWidth - 35} y={svgHeight + 14} className="fill-gray-400" fontSize={9} fontFamily="system-ui, sans-serif">More</text>
        </svg>
      </div>
    </div>
  )
}
