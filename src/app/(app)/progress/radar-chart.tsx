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

/**
 * Light, calm radar (reference design): thin #e2eaf5 grid, orange data
 * polygon at ~11% fill, small orange vertex dots, and single-line axis
 * labels — bold ink section name + muted steel % ("Core 74%").
 *
 * Strokes use vectorEffect="non-scaling-stroke" so the grid renders at an
 * exact 1px and the data polygon at 2px regardless of viewBox scale. The
 * viewBox is computed from estimated label widths so labels are never
 * clipped, even long topic names ("Leak & Repair 74%") on the 8-axis chart.
 */
export function RadarChart({ data, size = 400 }: RadarChartProps) {
  if (data.length < 3) return null

  const n = data.length
  const cx = size / 2
  const cy = size / 2
  const radius = size * 0.3
  const levels = [0.25, 0.5, 0.75, 1.0]
  // The 4-axis section radar (common case) gets a bigger label; dense 8-axis
  // topic radars step down so eight long single-line labels still fit.
  const fontSize = n <= 5 ? 20 : 17
  const labelRadius = radius + (n <= 5 ? 36 : 26)

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

  // Label positions — comfortably outside the grid
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

  // Grow the viewBox to fit every label's estimated width (~0.58em/char) so
  // side labels never clip and never overflow the card.
  let minX = 0
  let maxX = size
  for (const l of labels) {
    const w = `${l.label} ${l.pct}%`.length * fontSize * 0.58
    if (l.anchor === 'start') maxX = Math.max(maxX, l.x + w)
    else if (l.anchor === 'end') minX = Math.min(minX, l.x - w)
    else {
      minX = Math.min(minX, l.x - w / 2)
      maxX = Math.max(maxX, l.x + w / 2)
    }
  }
  const pad = 12
  const padY = fontSize // headroom for the top/bottom centered labels

  return (
    <div className="w-full max-w-[300px] mx-auto">
      <svg
        viewBox={`${minX - pad} ${-padY} ${maxX - minX + pad * 2} ${size + padY * 2}`}
        className="w-full h-auto"
        role="img"
        aria-label="Radar chart showing proficiency across topic areas"
      >
        {/* Concentric reference polygons — thin, very light grid */}
        {levels.map((level) => (
          <polygon
            key={level}
            points={polygonPoints(level)}
            fill="none"
            stroke="#e2eaf5"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {/* Spokes */}
        {axes.map((a, i) => (
          <line
            key={i}
            x1={a.x1}
            y1={a.y1}
            x2={a.x2}
            y2={a.y2}
            stroke="#e2eaf5"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {/* Data polygon — orange, soft fill */}
        <polygon
          points={dataPolygon}
          fill="rgba(249,115,22,0.11)"
          stroke="#F97316"
          strokeWidth="2"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />

        {/* Small orange vertex dots */}
        {normalized.map((val, i) => {
          const [px, py] = getPoint(i, val)
          return (
            <circle
              key={i}
              cx={px}
              cy={py}
              r="5"
              fill="#F97316"
              stroke="#ffffff"
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
            />
          )
        })}

        {/* Labels — "Core 74%": bold ink name + muted steel % */}
        {labels.map((l, i) => (
          <text
            key={i}
            x={l.x}
            y={l.y}
            textAnchor={l.anchor}
            dominantBaseline="central"
            fontSize={fontSize}
          >
            <tspan fill="#001d57" fontWeight="600">
              {l.label}
            </tspan>
            <tspan fill="#4a6690" fontWeight="500">
              {' '}
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
