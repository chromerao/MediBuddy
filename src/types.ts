export type Tab = 'home' | 'notebook' | 'family'

export type AppStep =
  | 'home'
  | 'symptom'
  | 'review'
  | 'summary'
  | 'consent'
  | 'recording'
  | 'processing'
  | 'quiz'
  | 'results'
  | 'settings'
  | 'account'
  | 'profile'
  | 'calendar'
  | 'visit-detail'
  | 'share-settings'
  | 'family-invite'
  | 'accept-invite'
  | 'medications'

export interface Task {
  id: string
  label: string
  completed: boolean
  icon: 'pill' | 'walk' | 'water'
}

export interface HealthMetric {
  type: 'glucose' | 'bloodPressure' | 'weight'
  value: number
  secondary?: number
  context?: string
}

export interface HealthLog {
  id: string
  text: string
  time: string
  createdAt?: string
  metric?: HealthMetric
}

export type MedicationSlot = 'morning' | 'noon' | 'evening' | 'night'

export interface Medication {
  id: string
  name: string
  slots: MedicationSlot[]
  memo: string
  createdAt: string
}

export interface MedicationIntake {
  id: string
  medicationId: string
  date: string
  slot: MedicationSlot
  takenAt: string
}

export interface VisitSummary {
  symptom: string
  course: string
  measurement: string
  questions: string[]
}

export interface QuizAnswer {
  questionId: string
  answer: string
}

export interface QuizQuestion {
  id: string
  question: string
  options: string[]
  expected: string
  takeaway: string
}

export interface VisitReview {
  questions: QuizQuestion[]
  actions: string[]
  unanswered: string[]
}

export interface VisitEvaluation {
  remembered: string[]
  corrected: string[]
  unanswered: string[]
}

export type ReviewSource = 'ai' | 'none'

export interface AuthUser {
  id: string
  email: string
  createdAt: string
}

export type AuthStatus = 'checking' | 'anonymous' | 'authenticated'
export type SyncStatus = 'idle' | 'syncing' | 'saved' | 'error'

export interface UserProfile {
  userName: string
  patientName: string
  relationship: string
}

export type AppointmentType = 'outpatient' | 'surgery' | 'examination' | 'procedure'

export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled'

export interface MedicalAppointment {
  id: string
  date: string
  time: string
  hospital: string
  department: string
  doctor: string
  type: AppointmentType
  memo: string
  status: AppointmentStatus
  createdAt: string
}

export type AppointmentInput = Omit<MedicalAppointment, 'id' | 'status' | 'createdAt'>

export interface VisitRecord {
  id: string
  patientName?: string
  date: string
  day: string
  month: string
  hospital: string
  department: string
  disease: string
  summary: VisitSummary
  remembered: string[]
  corrected: string[]
  unanswered: string[]
  actions: string[]
  transcript?: string
  transcriptionModel?: string
  reviewModel?: string
  reviewSource?: ReviewSource
  appointmentId?: string
  createdAt: string
}

export interface SharePreferences {
  enabled: boolean
  preparation: boolean
  results: boolean
  actions: boolean
  healthLogs: boolean
  duration: 'once' | '30days' | 'always'
}

export interface UserSettings {
  fontSize: 'normal' | 'large' | 'xlarge'
  appointmentReminders: boolean
  preparationReminders: boolean
  medicationReminders: boolean
}

export interface FamilyInvitation {
  id: string
  code: string
  name: string
  relationship: string
  status: 'pending' | 'accepted' | 'cancelled'
  createdAt: string
}

export interface FamilyMember {
  id: string
  name: string
  relationship: string
  conditions: string[]
  connectedAt: string
}

export interface AppState {
  hasOnboarded: boolean
  role: 'self' | 'family'
  activeVisitRole: 'self' | 'family'
  activeAppointmentId: string | null
  profile: UserProfile
  step: AppStep
  tab: Tab
  symptomInput: string
  summary: VisitSummary
  tasks: Task[]
  healthLogs: HealthLog[]
  medications: Medication[]
  medicationIntakes: MedicationIntake[]
  consented: boolean
  answers: QuizAnswer[]
  visitTranscript: string
  transcriptionModel: string | null
  visitReview: VisitReview | null
  reviewModel: string | null
  reviewSource: ReviewSource
  appointments: MedicalAppointment[]
  visitRecords: VisitRecord[]
  selectedVisitId: string | null
  sharePreferences: SharePreferences
  settings: UserSettings
  familyInvitations: FamilyInvitation[]
  familyMembers: FamilyMember[]
}
