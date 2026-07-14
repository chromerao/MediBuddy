import { emptyProfile } from './profiles'
import type { AppState, QuizAnswer, VisitEvaluation, VisitReview, VisitSummary } from './types'

export const emptySummary: VisitSummary = {
  symptom: '',
  course: '',
  measurement: '',
  questions: [],
}

export const defaultSummary: VisitSummary = {
  symptom: '새벽에 발이 저린 증상이 있어요.',
  course: '최근 일주일 동안 새벽에 반복되고 있어요.',
  measurement: '오늘 아침 공복 혈당 130 mg/dL',
  questions: [
    '새벽에 발이 저린 증상이 당뇨와 관련이 있나요?',
    '현재 복용 중인 약은 그대로 먹어도 되나요?',
    '집에서 어떤 증상을 더 살펴봐야 하나요?',
  ],
}

export const initialState: AppState = {
  hasOnboarded: false,
  role: 'self',
  activeVisitRole: 'self',
  activeAppointmentId: null,
  profile: emptyProfile,
  step: 'home',
  tab: 'home',
  symptomInput: '',
  summary: emptySummary,
  consented: false,
  answers: [],
  visitTranscript: '',
  transcriptionModel: null,
  visitReview: null,
  reviewModel: null,
  reviewSource: 'none',
  appointments: [],
  tasks: [],
  healthLogs: [],
  medications: [],
  medicationIntakes: [],
  visitRecords: [],
  selectedVisitId: null,
  sharePreferences: {
    enabled: false,
    preparation: true,
    results: true,
    actions: false,
    healthLogs: false,
    duration: 'always',
  },
  settings: {
    fontSize: 'large',
    appointmentReminders: true,
    preparationReminders: true,
    medicationReminders: true,
  },
  familyInvitations: [],
  familyMembers: [],
}

export function evaluateVisitReview(review: VisitReview, answers: QuizAnswer[]): VisitEvaluation {
  const remembered: string[] = []
  const corrected: string[] = []
  const unanswered = [...review.unanswered]

  for (const question of review.questions) {
    const answer = answers.find((item) => item.questionId === question.id)?.answer
    if (answer === question.expected) {
      remembered.push(question.takeaway)
    } else if (!answer || answer === '잘 모르겠어요') {
      unanswered.push(`${question.question} — ${question.takeaway}`)
    } else {
      corrected.push(question.takeaway)
    }
  }

  return {
    remembered: [...new Set(remembered)],
    corrected: [...new Set(corrected)],
    unanswered: [...new Set(unanswered)],
  }
}

export function createSummary(input: string): VisitSummary {
  const hasSugar = /혈당|공복|\d{2,3}/.test(input)
  const hasFoot = /발|저리|저림/.test(input)

  return {
    symptom: hasFoot ? '새벽에 발이 저린 증상이 있어요.' : input.trim(),
    course: /새벽/.test(input) ? '최근 새벽 시간에 반복되고 있어요.' : '최근 느낀 변화를 진료에서 확인하고 싶어요.',
    measurement: hasSugar ? `직접 기록한 수치: ${input.match(/\d{2,3}/)?.[0] ?? '확인 필요'} mg/dL` : '직접 기록한 측정 수치가 없어요.',
    questions: hasFoot
      ? defaultSummary.questions
      : [
          '이 증상의 원인을 확인하려면 무엇을 살펴봐야 하나요?',
          '현재 복용 중인 약은 그대로 먹어도 되나요?',
          '집에서 어떤 변화를 기록하면 좋을까요?',
        ],
  }
}
