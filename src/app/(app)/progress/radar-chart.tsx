'use client'

type RadarDataPoint = {
  label: string
  score: number
  maxScore: number
}

type RadarChartProps = {
  data: RadarDataPoint[]
  size?: number
  /** 'dark' renders light-on-ink for the navy hero card (Progress overview). */
  variant?: 'light' | 'dark'
  /** Tint the weakest axis (label + vertex dot) rose — a status signal only. */
  highlightWeakest?: boolean
}

export function RadarChart({
  data,
  size = 400,
  variant = 'light',
  highlightWeakest = false,
}: RadarChartProps) {
  if (data.length < 3) return null

  // Palette per variant. Light matches the previous hardcoded rendering
  // exactly (fill-gray-700 = #374151, fill-blue-800 = brand #003087); dark is
  // the ink-hero treatment: soft white grid, orange data polygon (small
  // non-button accent), white labels, rose reserved for the weakest axis.
  const dark = variant === 'dark'
  const c = dark
    ? {
        grid: 'rgba(255,255,255,0.22)',
        polyFill: 'rgba(249,115,22,0.22)',
        polyStroke: '#F97316',
        dot: '#F97316',
        dotRing: '#001d57',
        label: 'rgba(255,255,255,0.78)',
        pct: '#ffffff',
        rose: '#fda4af',
      }
    : {
        grid: '#e5e7eb',
        polyFill: 'rgba(0, 48, 135, 0.15)',
        polyStroke: '#00205c',
        dot: '#003087',
        dotRing: '#ffffff',
        label: '#374151',
        pct: '#003087',
        rose: '#e11d48',
      }

  // Weakest axis (lowest %) — only when requested, at least 2 attempted axes,
  // and not all equal (no "weakest" in a flat profile).
  let weakestIdx = -1
  if (highlightWeakest) {
    const pcts = data.map((d) => (d.maxScore > 0 ? d.score / d.maxScore : null))
    const valid = pcts.filter((p): p is number => p !== null)
    if (valid.length >= 2 && Math.min(...valid) !== Math.max(...valid)) {
      weakestIdx = pcts.findIndex((p) => p === Math.min(...valid))
    }
  }

  const cx = size / 2
  const cy = size / 2
  const radius = size * 0.3 // labels get their room from the padded viewBox
  const levels = [0.25, 0.5, 0.75, 1.0]
  const n = data.length
  const labelRadius = radius + 45
  // Horizontal/vertical viewBox padding so the bumped-up label font (20 units)
  // never clips at the edges — side labels ("Leak & Repair") extend well past
  // the bare chart square.
  const padX = 50
  const padY = 10

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
    // max-w-[300px] — the radar is the Overview hero and the page's main
    // visual; label font is 20 viewBox units (~12px rendered at 300px wide).
    <div className="w-full max-w-[300px] mx-auto px-2">
      <svg
        viewBox={`${-padX} ${-padY} ${size + padX * 2} ${size + padY * 2}`}
        className="w-full h-auto overflow-visible"
        role="img"
        aria-label="Radar chart showing proficiency across topic areas"
      >
        {/* Concentric reference polygons — soft radial grid */}
        {levels.map((level) => (
          <polygon
            key={level}
            points={polygonPoints(level)}
            fill="none"
            stroke={c.grid}
            strokeWidth="1.75"
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
            stroke={c.grid}
            strokeWidth="1.75"
          />
        ))}

        {/* Data polygon */}
        <polygon
          points={dataPolygon}
          fill={c.polyFill}
          stroke={c.polyStroke}
          strokeWidth="3"
          strokeLinejoin="round"
        />

        {/* Vertex dots — weakest axis punched out in rose (status signal) */}
        {normalized.map((val, i) => {
          const [px, py] = getPoint(i, val)
          const weakest = i === weakestIdx
          return (
            <circle
              key={i}
              cx={px}
              cy={py}
              r={weakest ? 5.5 : 4.5}
              fill={weakest ? c.rose : c.dot}
              stroke={c.dotRing}
              strokeWidth="2"
            />
          )
        })}

        {/* Labels */}
        {labels.map((l, i) => {
          const weakest = i === weakestIdx
          return (
            <text
              key={i}
              x={l.x}
              y={l.y}
              textAnchor={l.anchor}
              dominantBaseline="central"
              fill={weakest ? c.rose : c.label}
              fontSize="20"
              fontWeight="500"
            >
              <tspan>{l.label}</tspan>
              <tspan
                x={l.x}
                dy="24"
                fontSize="20"
                fontWeight="700"
                fill={weakest ? c.rose : c.pct}
                className="font-mono"
              >
                {l.pct}%
              </tspan>
            </text>
          )
        })}
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
        fill="rgba(0, 48, 135, 0.18)"
        stroke="#00205c"
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
            fill="#003087"
            stroke="white"
            strokeWidth="1"
          />
        )
      })}
    </svg>
  )
}
