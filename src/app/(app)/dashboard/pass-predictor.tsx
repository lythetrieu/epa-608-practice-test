'use client'

function getZone(score: number) {
  if (score >= 90) return { color: '#ca8a04', bg: 'bg-yellow-50', border: 'border-yellow-200', label: "You're ready! Go pass that exam!", emoji: true }
  if (score >= 70) return { color: '#16a34a', bg: 'bg-green-50', border: 'border-green-200', label: 'Looking good! You\'re nearly exam-ready.', emoji: false }
  if (score >= 50) return { color: '#ea580c', bg: 'bg-orange-50', border: 'border-orange-200', label: 'Getting there! A few more practice sessions.', emoji: false }
  return { color: '#dc2626', bg: 'bg-red-50', border: 'border-red-200', label: 'Keep practicing! Focus on your weak areas.', emoji: false }
}

export function PassPredictor({
  readinessScore,
  totalTests,
}: {
  readinessScore: number
  totalTests: number
}) {
  const needsMoreTests = totalTests < 3
  const zone = getZone(readinessScore)

  // SVG semicircle gauge math
  // Arc from ~180deg to ~0deg (left to right semicircle)
  const cx = 50
  const cy = 45
  const r = 35
  const strokeWidth = 8
  // Arc start: 180deg, Arc end: 0deg (draws left-to-right)
  const startAngle = Math.PI // 180 degrees
  const endAngle = 0 // 0 degrees
  const totalArc = Math.PI // 180 degrees in radians

  // Background arc path (full semicircle)
  const bgX1 = cx + r * Math.cos(startAngle)
  const bgY1 = cy - r * Math.sin(startAngle)
  const bgX2 = cx + r * Math.cos(endAngle)
  const bgY2 = cy - r * Math.sin(endAngle)
  const bgPath = `M ${bgX1} ${bgY1} A ${r} ${r} 0 0 1 ${bgX2} ${bgY2}`

  // Filled arc path (partial based on score)
  const fillAngle = startAngle - (readinessScore / 100) * totalArc
  const fX2 = cx + r * Math.cos(fillAngle)
  const fY2 = cy - r * Math.sin(fillAngle)
  // Large arc flag: 1 if angle > PI (>180 deg), but since max is PI we use 0
  const largeArc = readinessScore > 50 ? 1 : 0
  const fillPath = `M ${bgX1} ${bgY1} A ${r} ${r} 0 ${largeArc} 1 ${fX2} ${fY2}`

  // Gradient stops for the background track
  const gradientStops = [
    { offset: '0%', color: '#dc2626' },   // red
    { offset: '35%', color: '#ea580c' },   // orange
    { offset: '65%', color: '#16a34a' },   // green
    { offset: '100%', color: '#ca8a04' },  // gold
  ]

  return (
    <div className={`rounded-2xl border ${needsMoreTests ? 'border-gray-200 bg-white' : zone.border + ' ' + zone.bg} p-6 mb-8`}>
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Pass Predictor</h2>

      {needsMoreTests ? (
        <div className="text-center py-6">
          <div className="text-4xl mb-3">📊</div>
          <p className="text-gray-500 text-sm">
            Take at least 3 tests to see your readiness score
          </p>
          <p className="text-gray-400 text-xs mt-1">
            {totalTests} of 3 completed
          </p>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* SVG Gauge */}
          <div className="relative flex-shrink-0">
            <svg viewBox="0 0 100 55" className="w-48 h-[108px] sm:w-56 sm:h-[126px]">
              <defs>
                <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  {gradientStops.map((s) => (
                    <stop key={s.offset} offset={s.offset} stopColor={s.color} />
                  ))}
                </linearGradient>
              </defs>

              {/* Background track with gradient */}
              <path
                d={bgPath}
                fill="none"
                stroke="#e5e7eb"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
              />

              {/* Colored fill arc */}
              {readinessScore > 0 && (
                <path
                  d={fillPath}
                  fill="none"
                  stroke={zone.color}
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                />
              )}

              {/* Score text */}
              <text
                x={cx}
                y={cy - 2}
                textAnchor="middle"
                className="font-bold"
                fill={zone.color}
                fontSize="18"
              >
                {readinessScore}%
              </text>

              {/* Labels at ends */}
              <text x={bgX1 + 2} y={cy + 10} textAnchor="start" fill="#9ca3af" fontSize="5">
                0%
              </text>
              <text x={bgX2 - 2} y={cy + 10} textAnchor="end" fill="#9ca3af" fontSize="5">
                100%
              </text>
            </svg>
          </div>

          {/* Message */}
          <div className="text-center sm:text-left">
            <p className="text-gray-800 font-medium text-base">
              {zone.label}
              {zone.emoji && ' 🎉'}
            </p>
            <p className="text-gray-500 text-sm mt-1">
              Based on your last {Math.min(totalTests, 25)} practice tests
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              70% is the passing threshold on the real EPA 608 exam
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
