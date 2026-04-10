'use client'

import { useMemo, useState } from 'react'

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function calculateStreaks(activitySet: Set<string>) {
  if (activitySet.size === 0) return { current: 0, longest: 0 }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Current streak: count consecutive days backwards from today
  let current = 0
  const d = new Date(today)
  while (activitySet.has(formatDate(d))) {
    current++
    d.setDate(d.getDate() - 1)
  }

  // If user wasn't active today, check if yesterday starts a streak
  if (current === 0) {
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const y = new Date(yesterday)
    while (activitySet.has(formatDate(y))) {
      current++
      y.setDate(y.getDate() - 1)
    }
  }

  // Longest streak: sort all dates and find longest consecutive run
  const sorted = Array.from(activitySet).sort()
  let longest = 0
  let run = 1
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1])
    const curr = new Date(sorted[i])
    const diffMs = curr.getTime() - prev.getTime()
    if (diffMs === 86400000) {
      run++
    } else {
      longest = Math.max(longest, run)
      run = 1
    }
  }
  longest = Math.max(longest, run)
  if (sorted.length === 0) longest = 0

  return { current, longest }
}

export function StreakBoard({ activityDates }: { activityDates: string[] }) {
  const [hoveredDate, setHoveredDate] = useState<string | null>(null)

  const { grid, dayLabels, streaks } = useMemo(() => {
    const activitySet = new Set(activityDates)
    const streaks = calculateStreaks(activitySet)

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Build 90-day grid
    // Find the start: 89 days ago, but align to start of that week (Monday)
    const start = new Date(today)
    start.setDate(start.getDate() - 89)
    // Align to Monday (0=Sun, 1=Mon... so getDay() returns 0 for Sun)
    const dayOfWeek = start.getDay()
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    start.setDate(start.getDate() + mondayOffset)

    // Build weeks (columns) x days (rows, Mon=0 to Sun=6)
    const weeks: { date: string; active: boolean; future: boolean }[][] = []
    const cursor = new Date(start)

    while (cursor <= today) {
      const week: { date: string; active: boolean; future: boolean }[] = []
      for (let day = 0; day < 7; day++) {
        const dateStr = formatDate(cursor)
        const isFuture = cursor > today
        week.push({
          date: dateStr,
          active: activitySet.has(dateStr),
          future: isFuture,
        })
        cursor.setDate(cursor.getDate() + 1)
      }
      weeks.push(week)
    }

    const dayLabels = ['Mon', '', 'Wed', '', 'Fri', '', 'Sun']

    return { grid: weeks, dayLabels, streaks }
  }, [activityDates])

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Study Streak</h2>
        <div className="flex items-center gap-4 text-sm">
          {streaks.current > 0 && (
            <span className="font-medium text-orange-600">
              {streaks.current} day streak 🔥
            </span>
          )}
          {streaks.longest > 0 && (
            <span className="text-gray-400">
              Best: {streaks.longest}d
            </span>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="inline-flex gap-0.5">
          {/* Day labels column */}
          <div className="flex flex-col gap-0.5 mr-1 pt-0">
            {dayLabels.map((label, i) => (
              <div
                key={i}
                className="w-6 h-3 flex items-center justify-end pr-1 text-[9px] text-gray-400 leading-none"
              >
                {label}
              </div>
            ))}
          </div>

          {/* Grid of weeks */}
          {grid.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-0.5">
              {week.map((day, di) => (
                <div
                  key={di}
                  className={`w-3 h-3 rounded-sm ${
                    day.future
                      ? 'bg-transparent'
                      : day.active
                        ? 'bg-green-500'
                        : 'bg-gray-100'
                  }`}
                  title={day.future ? '' : `${day.date}${day.active ? ' — active' : ''}`}
                  onMouseEnter={() => !day.future && setHoveredDate(day.date)}
                  onMouseLeave={() => setHoveredDate(null)}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Tooltip / legend row */}
      <div className="flex items-center justify-between mt-3">
        <div className="text-xs text-gray-400">
          {hoveredDate
            ? `${new Date(hoveredDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`
            : 'Last 90 days'}
        </div>
        <div className="flex items-center gap-1 text-[10px] text-gray-400">
          <span>Less</span>
          <div className="w-3 h-3 rounded-sm bg-gray-100" />
          <div className="w-3 h-3 rounded-sm bg-green-500" />
          <span>More</span>
        </div>
      </div>
    </div>
  )
}
