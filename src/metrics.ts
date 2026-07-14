import { createId } from './id'
import type { HealthLog, HealthMetric } from './types'

// "오늘 아침 공복 혈당 130" 같은 한마디 기록에서 수치를 구조화해 추이 그래프와
// 진료 준비에 활용한다. 확실히 인식되는 패턴만 저장하고, 애매하면 null을 반환한다.
export function parseHealthMetric(text: string): HealthMetric | null {
  if (/혈압/.test(text)) {
    const match = text.match(/(\d{2,3})\s*(?:\/|에|,)\s*(\d{2,3})/)
    if (match) {
      const systolic = Number(match[1])
      const diastolic = Number(match[2])
      if (systolic >= 70 && systolic <= 250 && diastolic >= 40 && diastolic <= 150 && systolic > diastolic) {
        return { type: 'bloodPressure', value: systolic, secondary: diastolic }
      }
    }
    return null
  }

  if (/혈당|당\s*수치/.test(text)) {
    const match = text.match(/(\d{2,3})/)
    if (match) {
      const value = Number(match[1])
      if (value >= 40 && value <= 600) {
        const context = /공복|아침\s*식사?\s*전|빈속/.test(text) ? '공복' : /식후/.test(text) ? '식후' : undefined
        return { type: 'glucose', value, context }
      }
    }
    return null
  }

  const weightMatch = text.match(/(\d{2,3}(?:\.\d+)?)\s*(?:kg|킬로)/i)
  if (weightMatch && /몸무게|체중|kg|킬로/i.test(text)) {
    const value = Number(weightMatch[1])
    if (value >= 20 && value <= 250) return { type: 'weight', value }
  }

  return null
}

export function buildHealthLog(text: string): HealthLog {
  return {
    id: createId(),
    text,
    time: '방금 기록됨',
    createdAt: new Date().toISOString(),
    metric: parseHealthMetric(text) ?? undefined,
  }
}

export const metricLabels: Record<HealthMetric['type'], string> = {
  glucose: '혈당',
  bloodPressure: '혈압',
  weight: '체중',
}

export function formatMetric(metric: HealthMetric): string {
  if (metric.type === 'bloodPressure') return `혈압 ${metric.value}/${metric.secondary}`
  if (metric.type === 'glucose') return `${metric.context ? `${metric.context} ` : ''}혈당 ${metric.value}`
  return `체중 ${metric.value}kg`
}

export interface MetricPoint {
  label: string
  value: number
  secondary?: number
}

// 오래된 → 최신 순으로 최근 기록을 최대 maxPoints개 돌려준다(healthLogs는 최신순 저장).
export function getMetricPoints(logs: HealthLog[], type: HealthMetric['type'], maxPoints = 14): MetricPoint[] {
  const points: MetricPoint[] = []
  for (const log of logs) {
    if (!log.metric || log.metric.type !== type || !log.createdAt) continue
    const date = new Date(log.createdAt)
    points.push({
      label: `${date.getMonth() + 1}/${date.getDate()}`,
      value: log.metric.value,
      secondary: log.metric.secondary,
    })
    if (points.length >= maxPoints) break
  }
  return points.reverse()
}

// 진료 준비 시 AI에 함께 전달할 최근(14일) 수치 요약 문장.
export function summarizeRecentMetrics(logs: HealthLog[]): string | null {
  const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000
  const recent = logs.filter((log) => log.metric && log.createdAt && new Date(log.createdAt).getTime() >= cutoff)
  if (recent.length === 0) return null

  const parts: string[] = []
  const glucose = recent.filter((log) => log.metric?.type === 'glucose')
  if (glucose.length > 0) {
    const values = glucose.map((log) => log.metric!.value)
    const average = Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
    parts.push(`최근 2주 혈당 ${values.length}회 기록, 평균 ${average}, 최근 값 ${values[0]}`)
  }
  const bloodPressure = recent.find((log) => log.metric?.type === 'bloodPressure')
  if (bloodPressure?.metric) parts.push(`최근 혈압 ${bloodPressure.metric.value}/${bloodPressure.metric.secondary}`)
  const weight = recent.find((log) => log.metric?.type === 'weight')
  if (weight?.metric) parts.push(`최근 체중 ${weight.metric.value}kg`)

  return parts.length > 0 ? parts.join(' · ') : null
}
