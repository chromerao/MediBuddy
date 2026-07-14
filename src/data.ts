import { emptyProfile } from './profiles'
import type { AppState, QuizAnswer, VisitEvaluation, VisitReview, VisitSummary } from './types'

export const emptySummary: VisitSummary = {
  symptom: '',
  course: '',
  measurement: '',
  questions: [],
}

export const initialState: AppState = {
  hasOnboarded: false,
  role: 'self',
  activeVisitRole: 'self',
  activeAppointmentId: null,
  activePreparationAppointmentId: null,
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
  const originalInput = input.trim()

  return {
    // AI를 사용할 수 없을 때에는 숫자·질환·복약 정보를 추론하지 않고
    // 사용자가 입력한 문장만 그대로 보존한다.
    symptom: originalInput,
    course: '입력 내용을 그대로 의료진에게 보여드려 시작 시기와 변화를 확인해 주세요.',
    measurement: '측정 수치는 자동으로 해석하지 않았어요.',
    questions: [
      '말씀드린 내용을 확인하려면 어떤 점을 살펴보면 될까요?',
      '집에서 어떤 변화를 기록해 두면 좋을까요?',
      '어떤 변화가 생기면 다시 진료받아야 하나요?',
    ],
  }
}
