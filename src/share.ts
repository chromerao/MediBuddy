import type { VisitRecord, VisitSummary } from './types'

export type ShareOutcome = 'shared' | 'copied' | 'failed'

// 모바일에서는 공유 시트(카카오톡·문자 등)를 열고, 미지원 환경에서는 클립보드에 복사한다.
export async function shareText(title: string, text: string): Promise<ShareOutcome> {
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text })
      return 'shared'
    } catch (error) {
      // 사용자가 공유 시트를 닫은 경우는 실패로 알리지 않는다.
      if (error instanceof DOMException && error.name === 'AbortError') return 'shared'
    }
  }
  try {
    await navigator.clipboard.writeText(text)
    return 'copied'
  } catch {
    return 'failed'
  }
}

export function formatSummaryText(summary: VisitSummary, patientName: string): string {
  const lines = [
    `[메디버디 진료 준비 카드] ${patientName} 님`,
    '',
    `· 증상: ${summary.symptom}`,
    `· 경과: ${summary.course}`,
    `· 측정 수치: ${summary.measurement}`,
    '',
    '진료에서 물어볼 질문',
  ]
  summary.questions.forEach((question, index) => lines.push(`${index + 1}. ${question}`))
  if (summary.sources && summary.sources.length > 0) {
    lines.push('', '참고한 공공 의료문서')
    summary.sources.forEach((source) => lines.push(`· ${source.title} (${source.organization}) ${source.url}`))
  }
  return lines.join('\n')
}

export function formatVisitRecordText(record: VisitRecord): string {
  const lines = [
    `[메디버디 진료 기록] ${record.patientName ?? ''}`.trim(),
    `${record.date} · ${record.hospital} ${record.department}`,
    '',
  ]
  if (record.remembered.length > 0) {
    lines.push('잘 기억한 내용')
    record.remembered.forEach((item) => lines.push(`· ${item}`))
    lines.push('')
  }
  if (record.corrected.length > 0) {
    lines.push('다시 확인한 내용')
    record.corrected.forEach((item) => lines.push(`· ${item}`))
    lines.push('')
  }
  if (record.unanswered.length > 0) {
    lines.push('다음에 확인할 질문')
    record.unanswered.forEach((item) => lines.push(`· ${item}`))
    lines.push('')
  }
  if (record.actions.length > 0) {
    lines.push('실천 항목')
    record.actions.forEach((item) => lines.push(`· ${item}`))
    lines.push('')
  }
  lines.push('※ 기계가 받아 적은 진료 대화를 정리한 것으로, 중요한 내용은 의료진 안내를 기준으로 확인하세요.')
  return lines.join('\n')
}
