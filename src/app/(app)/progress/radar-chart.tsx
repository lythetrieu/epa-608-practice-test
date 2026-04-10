'use client'

type RadarDataPoint = {
  label: string
  score: number
  maxScore: number
}

type RadarChartProps = {
  data: RadarDataPoint[]
  size?: number
}

export function RadarChart({ data, size = 300 }: RadarChartProps) {
  if (data.length < 3) return null

  const cx = size / 2
  const cy = size / 2
  const radius = size * 0.34 // leave room for labels
  const levels = [0.25, 0.5, 0.75, 1.0]
  const n = data.length
  const labelRadius = radius + 28

  function getPoint(index: number, value: number): [number, number] {
    const angle = (2 * Math.PI * index) / n - Math.PI / 2
    return [
      cx + radius * value * Math.cos(angle),
      cy + radius * value * Math.sin(angle),
    ]
  }

  function polygonPoints(value: number): string {
    return Array.from({ length: n }, (_, i) => getPoint(i, value).join(',')).join(' ')
  }

  // Normalize scores to 0-1
  const normalized = data.map((d) =>
    d.maxScore > 0 ? Math.min(d.score / d.maxScore, 1) : 0
  )

  const dataPolygon = Array.from({ length: n }, (_, i) =>
    getPoint(i, normalized[i]).join(',')
  ).join(' ')

  // Axis lines
  const axes = Array.from({ length: n }, (_, i) => {
    const [x, y] = getPoint(i, 1)
    return { x1: cx, y1: cy, x2: x, y2: y }
  })

  // Label positions
  const labels = data.map((d, i) => {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2
    const lx = cx + labelRadius * Math.cos(angle)
    const ly = cy + labelRadius * Math.sin(angle)
    const pct = d.maxScore > 0 ? Math.round((d.score / d.maxScore) * 100) : 0
    // Determine text anchor based on position
    let anchor: 'start' | 'middle' | 'end' = 'middle'
    if (Math.cos(angle) > 0.3) anchor = 'start'
    else if (Math.cos(angle) < -0.3) anchor = 'end'
    return { x: lx, y: ly, label: d.label, pct, anchor }
  })

  return (
    <div className="w-full max-w-md mx-auto">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="w-full h-auto"
        role="img"
        aria-label="Radar chart showing proficiency across topic areas"
      >
        {/* Concentric reference polygons */}
        {levels.map((level) => (
          <polygon
            key={level}
            points={polygonPoints(level)}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="1"
          />
        ))}

        {/* Axis lines */}
        {axes.map((a, i) => (
          <line
            key={i}
            x1={a.x1}
            y1={a.y1}
            x2={a.x2}
            y2={a.y2}
            stroke="#e5e7eb"
            strokeWidth="1"
          />
        ))}

        {/* Data polygon */}
        <polygon
          points={dataPolygon}
          fill="rgba(30, 64, 175, 0.15)"
          stroke="#1e3a8a"
          strokeWidth="2"
        />

        {/* Data points */}
        {normalized.map((val, i) => {
          const [px, py] = getPoint(i, val)
          return (
            <circle
              key={i}
              cx={px}
              cy={py}
              r="3.5"
              fill="#1e40af"
              stroke="white"
              strokeWidth="1.5"
            />
          )
        })}

        {/* Labels */}
        {labels.map((l, i) => (
          <text
            key={i}
            x={l.x}
            y={l.y}
            textAnchor={l.anchor}
            dominantBaseline="central"
            className="fill-gray-700"
            fontSize="9"
            fontWeight="500"
          >
            <tspan>{l.label}</tspan>
            <tspan
              x={l.x}
              dy="11"
              fontSize="8"
              fontWeight="600"
              className="fill-blue-800"
            >
              {l.pct}%
            </tspan>
          </text>
        ))}
      </svg>
    </div>
  )
}

/**
 * Mini version — no labels, smaller footprint, for dashboard cards.
 */
export function RadarChartMini({ data, size = 160 }: RadarChartProps) {
  if (data.length < 3) return null

  const cx = size / 2
  const cy = size / 2
  const radius = size * 0.42
  const n = data.length

  function getPoint(index: number, value: number): [number, number] {
    const angle = (2 * Math.PI * index) / n - Math.PI / 2
    return [
      cx + radius * value * Math.cos(angle),
      cy + radius * value * Math.sin(angle),
    ]
  }

  function polygonPoints(value: number): string {
    return Array.from({ length: n }, (_, i) => getPoint(i, value).join(',')).join(' ')
  }

  const normalized = data.map((d) =>
    d.maxScore > 0 ? Math.min(d.score / d.maxScore, 1) : 0
  )

  const dataPolygon = Array.from({ length: n }, (_, i) =>
    getPoint(i, normalized[i]).join(',')
  ).join(' ')

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="w-full h-auto"
      role="img"
      aria-label="Proficiency radar chart"
    >
      {/* Reference grid */}
      {[0.5, 1.0].map((level) => (
        <polygon
          key={level}
          points={polygonPoints(level)}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="0.75"
        />
      ))}

      {/* Data polygon */}
      <polygon
        points={dataPolygon}
        fill="rgba(30, 64, 175, 0.18)"
        stroke="#1e3a8a"
        strokeWidth="1.5"
      />

      {/* Data points */}
      {normalized.map((val, i) => {
        const [px, py] = getPoint(i, val)
        return (
          <circle
            key={i}
            cx={px}
            cy={py}
            r="2.5"
            fill="#1e40af"
            stroke="white"
            strokeWidth="1"
          />
        )
      })}
    </svg>
  )
}
