import type { AppState, QuizAnswer, VisitEvaluation, VisitRecord, VisitReview, VisitSummary } from './types'

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

export const sampleVisitRecord: VisitRecord = {
  id: 'visit-2026-10-25',
  date: '2026년 10월 25일 오전 10:00',
  day: '25',
  month: '10월',
  hospital: '성모병원',
  department: '내과',
  disease: '당뇨 정기 진료',
  summary: defaultSummary,
  remembered: ['약은 식후 30분에 복용해요.', '가벼운 산책은 하루 20분 실천해요.'],
  corrected: ['발 저림이 계속되면 다음 진료에서 다시 이야기해요.'],
  unanswered: ['집에서 어떤 증상을 더 살펴봐야 하는지 명확히 확인되지 않았어요.'],
  actions: ['식후 30분 약 챙겨 먹기', '가벼운 산책 20분'],
  createdAt: '2026-10-25T10:40:00.000Z',
}

export const fallbackVisitReview: VisitReview = {
  questions: [
    {
      id: 'fallback-medicine-time',
      question: '선생님께서 약을 언제 먹으라고 하셨나요?',
      options: ['식후 30분', '진료에서 복용 시점을 듣지 못했어요', '복용 시점을 다시 확인해야 해요'],
      expected: '식후 30분',
      takeaway: '약은 식후 30분에 복용해요.',
    },
    {
      id: 'fallback-walk-time',
      question: '가벼운 산책은 하루에 얼마나 하기로 했나요?',
      options: ['20분', '진료에서 시간은 정하지 않았어요', '산책 시간을 다시 확인해야 해요'],
      expected: '20분',
      takeaway: '가벼운 산책은 하루 20분 실천해요.',
    },
    {
      id: 'fallback-next-step',
      question: '발 저림이 계속되면 어떻게 하기로 했나요?',
      options: ['다음 진료에서 다시 말한다', '진료에서 다음 단계는 듣지 못했어요', '어떻게 할지 다시 확인해야 해요'],
      expected: '다음 진료에서 다시 말한다',
      takeaway: '발 저림이 계속되면 다음 진료에서 다시 이야기해요.',
    },
  ],
  actions: ['식후 30분 약 챙겨 먹기', '가벼운 산책 20분'],
  unanswered: ['집에서 어떤 증상을 더 살펴봐야 하는지 명확히 확인되지 않았어요.'],
}

export const initialState: AppState = {
  hasOnboarded: false,
  role: 'self',
  step: 'home',
  tab: 'home',
  symptomInput: '요즘 새벽에 발이 저리고, 오늘 아침 공복 혈당은 130이었어요.',
  summary: defaultSummary,
  consented: false,
  answers: [],
  visitTranscript: '',
  transcriptionModel: null,
  visitReview: fallbackVisitReview,
  reviewModel: null,
  reviewSource: 'fallback',
  appointments: [],
  tasks: [
    { id: 'medication', label: '식후 30분 약 챙겨 먹기', completed: false, icon: 'pill' },
    { id: 'walk', label: '가벼운 산책 20분', completed: false, icon: 'walk' },
  ],
  healthLogs: [
    { id: 'initial-log', text: '오늘 아침 공복 혈당 125', time: '오늘 오전 8:15' },
  ],
  visitRecords: [sampleVisitRecord],
  selectedVisitId: null,
  sharePreferences: {
    enabled: true,
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
  },
  familyInvitations: [],
  familyMembers: [
    {
      id: 'family-kim-younghee',
      name: '김영희',
      relationship: '어머니',
      conditions: ['당뇨', '고혈압'],
      connectedAt: '2026-07-13T00:00:00.000Z',
    },
  ],
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
