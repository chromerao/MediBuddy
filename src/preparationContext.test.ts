import { describe, expect, it } from 'vitest'
import { buildPreparationContext } from './preparationContext'
import type { MedicalAppointment, VisitRecord } from './types'

const appointment: MedicalAppointment = {
  id: 'appointment-1',
  date: '2026-08-10',
  time: '09:00',
  hospital: '한마음병원',
  department: '내과',
  doctor: '',
  type: 'outpatient',
  memo: '',
  status: 'scheduled',
  createdAt: '2026-07-01T00:00:00.000Z',
}

function visit(overrides: Partial<VisitRecord>): VisitRecord {
  return {
    id: 'visit-1',
    date: '2026년 7월 1일',
    day: '01',
    month: '7월',
    hospital: '한마음병원',
    department: '내과',
    disease: '진료 기록',
    summary: { symptom: '지난번 어지러움을 기록했어요', course: '', measurement: '', questions: [] },
    remembered: ['물을 자주 마시기로 했어요'],
    corrected: [],
    unanswered: ['검사 일정은 언제인가요?'],
    actions: ['매일 상태 기록하기'],
    transcript: '다음 준비에는 포함하면 안 되는 전사 원문',
    createdAt: '2026-07-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('buildPreparationContext', () => {
  it('관련 진료와 실천·복약 기록을 구조화하고 전사 원문은 제외한다', () => {
    const context = buildPreparationContext({
      appointment,
      visitRecords: [
        visit({ id: 'unrelated', department: '정형외과', hospital: '다른병원', summary: { symptom: '무릎 통증', course: '', measurement: '', questions: [] }, createdAt: '2026-07-10T00:00:00.000Z' }),
        visit({ id: 'related' }),
      ],
      healthLogs: [],
      tasks: [{ id: 'task-1', label: '매일 상태 기록하기', completed: true, icon: 'walk' }],
      medications: [{ id: 'med-1', name: '사용자가 등록한 약', slots: ['morning'], memo: '식후', createdAt: '2020-01-01T00:00:00.000Z' }],
      medicationIntakes: [],
    })

    expect(context.prompt).toContain('지난번 어지러움을 기록했어요')
    expect(context.prompt).toContain('검사 일정은 언제인가요?')
    expect(context.prompt).toContain('매일 상태 기록하기: 완료')
    expect(context.prompt).toContain('사용자가 등록한 약')
    expect(context.prompt).not.toContain('무릎 통증')
    expect(context.prompt).not.toContain('전사 원문')
    expect(context.display).toBe('최근 진료 1건 · 실천 1/1 · 복약 1개')
  })

  it('저장된 참고 기록이 없으면 빈 컨텍스트를 반환한다', () => {
    expect(buildPreparationContext({ appointment, visitRecords: [], healthLogs: [], tasks: [], medications: [], medicationIntakes: [] }))
      .toEqual({ prompt: null, display: null })
  })
})
