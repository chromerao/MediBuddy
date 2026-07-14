import { describe, expect, it } from 'vitest'
import { createAutomaticPreparationDraft } from './autoPreparation.mjs'

const appointment = { id: 'a1', date: '2026-07-15', hospital: '서울병원', department: '내과', status: 'scheduled' }
const record = { date: '2026-06-01', hospital: '서울병원', department: '내과', createdAt: '2026-06-01T00:00:00Z', summary: { symptom: '혈당 상담', sources: [] }, unanswered: ['약 복용 시간을 다시 확인해도 될까요?'] }

describe('createAutomaticPreparationDraft', () => {
  it('이전 진료 기록으로 검토 전 질문 카드 초안을 만든다', () => {
    const result = createAutomaticPreparationDraft(appointment, [record], new Date('2026-07-14T00:00:00Z'))
    expect(result.preparation.status).toBe('draft')
    expect(result.preparation.summary.questions).toHaveLength(3)
    expect(result.preparation.summary.symptom).toContain('2026-06-01')
  })

  it('기존 준비 내용이나 과거 기록을 덮어쓰지 않는다', () => {
    expect(createAutomaticPreparationDraft({ ...appointment, preparation: { status: 'draft' } }, [record])).toBeNull()
    expect(createAutomaticPreparationDraft(appointment, [])).toBeNull()
  })
})
