import { describe, expect, it } from 'vitest'
import { createSummary, evaluateVisitReview } from './data'
import type { VisitReview } from './types'

describe('createSummary', () => {
  it('AI 연결 실패 시 입력하지 않은 질환·복약·측정 단위를 만들지 않는다', () => {
    const summary = createSummary('70세이고 새벽에 발이 저려요')
    const serialized = JSON.stringify(summary)

    expect(summary.symptom).toBe('70세이고 새벽에 발이 저려요')
    expect(summary.questions).toHaveLength(3)
    expect(serialized).not.toContain('당뇨')
    expect(serialized).not.toContain('복용')
    expect(serialized).not.toContain('mg/dL')
  })

  it('공백을 제외한 원문을 증상으로 그대로 보존한다', () => {
    expect(createSummary('  어제부터 머리가 무거워요  ').symptom).toBe('어제부터 머리가 무거워요')
  })
})

describe('evaluateVisitReview', () => {
  it('기억함·교정 필요·확인 필요 결과를 구분한다', () => {
    const review: VisitReview = {
      questions: [
        { id: 'q1', question: '첫 질문', options: ['정답', '오답'], expected: '정답', takeaway: '첫 내용' },
        { id: 'q2', question: '둘째 질문', options: ['정답', '오답'], expected: '정답', takeaway: '둘째 내용' },
        { id: 'q3', question: '셋째 질문', options: ['정답', '잘 모르겠어요'], expected: '정답', takeaway: '셋째 내용' },
      ],
      actions: [],
      unanswered: ['진료에서 답하지 않은 질문'],
    }

    const result = evaluateVisitReview(review, [
      { questionId: 'q1', answer: '정답' },
      { questionId: 'q2', answer: '오답' },
      { questionId: 'q3', answer: '잘 모르겠어요' },
    ])

    expect(result.remembered).toEqual(['첫 내용'])
    expect(result.corrected).toEqual(['둘째 내용'])
    expect(result.unanswered).toEqual(expect.arrayContaining(['진료에서 답하지 않은 질문', '셋째 질문 — 셋째 내용']))
  })
})
