import type { MetricPoint } from '../metrics'

interface TrendChartProps {
  points: MetricPoint[]
  unit?: string
}

// 외부 라이브러리 없이 그리는 간단한 추이 선그래프. 2개 이상의 점이 필요하다.
export function TrendChart({ points, unit = '' }: TrendChartProps) {
  if (points.length < 2) return null

  const width = 320
  const height = 120
  const paddingX = 14
  const paddingTop = 16
  const paddingBottom = 26
  const values = points.map((point) => point.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  const coords = points.map((point, index) => {
    const x = paddingX + (index * (width - paddingX * 2)) / (points.length - 1)
    const y = paddingTop + ((max - point.value) / range) * (height - paddingTop - paddingBottom)
    return { x, y, point }
  })

  return (
    <div className="trend-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`최근 기록 추이, 최저 ${min}${unit}, 최고 ${max}${unit}`}>
        <polyline
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={coords.map(({ x, y }) => `${x},${y}`).join(' ')}
        />
        {coords.map(({ x, y, point }, index) => (
          <g key={`${point.label}-${index}`}>
            <circle cx={x} cy={y} r="4" fill="currentColor" />
            {(index === 0 || index === coords.length - 1 || point.value === max || point.value === min) && (
              <text x={x} y={y - 8} textAnchor="middle" className="trend-chart__value">{point.value}</text>
            )}
            <text x={x} y={height - 8} textAnchor="middle" className="trend-chart__label">{point.label}</text>
          </g>
        ))}
      </svg>
    </div>
  )
}
