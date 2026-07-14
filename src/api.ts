import type { AppState, AuthUser, FamilyInvitation, FamilyMember, MedicalAppointment, SharedFamilyBundle, VisitRecord, VisitReview, VisitSummary } from './types'

export interface LlmHealth {
  configured: boolean
  model: string | null
}

interface PrepareVisitResponse {
  summary: VisitSummary
  model: string
}

export interface TranscriptionResponse {
  transcript: string
  model: string
}

interface PostVisitReviewResponse {
  review: VisitReview
  model: string
}

const maxAudioBytes = 24 * 1024 * 1024

interface AuthResponse {
  user: AuthUser
}

interface SessionResponse {
  user: AuthUser | null
}

interface CloudStateResponse {
  state: AppState | null
  updatedAt: string | null
}

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
    this.name = 'ApiError'
  }
}

export class StateConflictError extends ApiError {
  constructor(message: string, readonly serverState: AppState | null, readonly serverUpdatedAt: string | null) {
    super(message, 409)
    this.name = 'StateConflictError'
  }
}

export async function getSession(signal?: AbortSignal): Promise<SessionResponse> {
  const response = await fetch('/api/auth/session', { credentials: 'same-origin', signal })
  if (!response.ok) throw new ApiError('계정 상태를 확인하지 못했습니다.', response.status)
  return response.json() as Promise<SessionResponse>
}

export async function signUp(email: string, password: string): Promise<AuthResponse> {
  return submitCredentials('/api/auth/signup', email, password)
}

export async function logIn(email: string, password: string): Promise<AuthResponse> {
  return submitCredentials('/api/auth/login', email, password)
}

export async function logOut(): Promise<void> {
  const response = await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' })
  if (!response.ok) throw new ApiError('로그아웃하지 못했습니다.', response.status)
}

export async function loadCloudState(signal?: AbortSignal): Promise<CloudStateResponse> {
  const response = await fetch('/api/state', { credentials: 'same-origin', signal })
  const payload = await response.json().catch(() => ({})) as Partial<CloudStateResponse> & { error?: string }
  if (!response.ok) throw new ApiError(payload.error ?? '서버 기록을 불러오지 못했습니다.', response.status)
  return { state: payload.state ?? null, updatedAt: payload.updatedAt ?? null }
}

export async function saveCloudState(state: AppState, baseUpdatedAt: string | null, signal?: AbortSignal): Promise<{ updatedAt: string }> {
  const response = await fetch('/api/state', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ state, baseUpdatedAt }),
    signal,
  })
  const payload = await response.json().catch(() => ({})) as { updatedAt?: string; error?: string; state?: AppState }
  if (response.status === 409) {
    throw new StateConflictError(payload.error ?? '다른 기기에서 먼저 저장한 기록이 있습니다.', payload.state ?? null, payload.updatedAt ?? null)
  }
  if (!response.ok) throw new ApiError(payload.error ?? '서버에 기록을 저장하지 못했습니다.', response.status)
  if (!payload.updatedAt) throw new ApiError('서버 저장 응답이 올바르지 않습니다.', 502)
  return { updatedAt: payload.updatedAt }
}

export interface RecordSlices {
  appointments: MedicalAppointment[]
  visitRecords: VisitRecord[]
}

// 병원 일정과 진료 기록은 전체 상태 JSON과 분리된 개별 테이블에 저장한다.
export async function loadRecordSlices(signal?: AbortSignal): Promise<RecordSlices> {
  const [appointments, visitRecords] = await Promise.all([
    fetchItems<MedicalAppointment>('/api/appointments', signal),
    fetchItems<VisitRecord>('/api/visit-records', signal),
  ])
  return { appointments, visitRecords }
}

export async function saveAppointments(items: MedicalAppointment[], signal?: AbortSignal): Promise<void> {
  await putItems('/api/appointments', items, signal)
}

export async function saveVisitRecords(items: VisitRecord[], signal?: AbortSignal): Promise<void> {
  await putItems('/api/visit-records', items, signal)
}

async function fetchItems<T>(endpoint: string, signal?: AbortSignal): Promise<T[]> {
  const response = await fetch(endpoint, { credentials: 'same-origin', signal })
  const payload = await response.json().catch(() => ({})) as { items?: T[]; error?: string }
  if (!response.ok) throw new ApiError(payload.error ?? '서버 기록을 불러오지 못했습니다.', response.status)
  return payload.items ?? []
}

async function putItems(endpoint: string, items: unknown[], signal?: AbortSignal): Promise<void> {
  const response = await fetch(endpoint, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ items }),
    signal,
  })
  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as { error?: string }
    throw new ApiError(payload.error ?? '서버에 기록을 저장하지 못했습니다.', response.status)
  }
}

export async function deleteAccount(): Promise<void> {
  const response = await fetch('/api/account', { method: 'DELETE', credentials: 'same-origin' })
  if (!response.ok && response.status !== 204) {
    const payload = await response.json().catch(() => ({})) as { error?: string }
    throw new ApiError(payload.error ?? '계정을 삭제하지 못했습니다.', response.status)
  }
}

export interface FamilyData {
  invitations: FamilyInvitation[]
  members: FamilyMember[]
}

export async function loadFamilyData(signal?: AbortSignal): Promise<FamilyData> {
  const response = await fetch('/api/family', { credentials: 'same-origin', signal })
  const payload = await response.json().catch(() => ({})) as Partial<FamilyData> & { error?: string }
  if (!response.ok) throw new ApiError(payload.error ?? '가족 연결 정보를 불러오지 못했습니다.', response.status)
  return { invitations: payload.invitations ?? [], members: payload.members ?? [] }
}

export async function loadSharedFamilyData(signal?: AbortSignal): Promise<SharedFamilyBundle[]> {
  const response = await fetch('/api/family/shared-data', { credentials: 'same-origin', signal })
  const payload = await response.json().catch(() => ({})) as { bundles?: SharedFamilyBundle[]; error?: string }
  if (!response.ok) throw new ApiError(payload.error ?? '공유받은 가족 기록을 불러오지 못했습니다.', response.status)
  return payload.bundles ?? []
}

export async function createFamilyInvitationApi(name: string, relationship: string): Promise<FamilyInvitation> {
  const response = await fetch('/api/family/invitations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ name, relationship }),
  })
  const payload = await response.json().catch(() => ({})) as { invitation?: FamilyInvitation; error?: string }
  if (!response.ok || !payload.invitation) throw new ApiError(payload.error ?? '초대를 만들지 못했습니다.', response.status)
  return payload.invitation
}

export async function cancelFamilyInvitationApi(id: string): Promise<void> {
  const response = await fetch(`/api/family/invitations/${encodeURIComponent(id)}/cancel`, { method: 'POST', credentials: 'same-origin' })
  if (!response.ok && response.status !== 204) {
    const payload = await response.json().catch(() => ({})) as { error?: string }
    throw new ApiError(payload.error ?? '초대를 취소하지 못했습니다.', response.status)
  }
}

export async function findInvitationByCode(code: string, signal?: AbortSignal): Promise<FamilyInvitation | null> {
  const response = await fetch(`/api/family/invitations/code/${encodeURIComponent(code)}`, { credentials: 'same-origin', signal })
  if (response.status === 404) return null
  const payload = await response.json().catch(() => ({})) as { invitation?: FamilyInvitation; error?: string }
  if (!response.ok) throw new ApiError(payload.error ?? '초대 정보를 확인하지 못했습니다.', response.status)
  return payload.invitation ?? null
}

export async function acceptInvitationApi(code: string): Promise<FamilyData> {
  const response = await fetch(`/api/family/invitations/code/${encodeURIComponent(code)}/accept`, { method: 'POST', credentials: 'same-origin' })
  const payload = await response.json().catch(() => ({})) as Partial<FamilyData> & { error?: string }
  if (!response.ok) throw new ApiError(payload.error ?? '초대를 수락하지 못했습니다.', response.status)
  return { invitations: payload.invitations ?? [], members: payload.members ?? [] }
}

export async function getLlmHealth(signal?: AbortSignal): Promise<LlmHealth> {
  const response = await fetch('/api/health/llm', { signal })
  if (!response.ok) throw new ApiError('AI 서버 상태를 확인하지 못했습니다.', response.status)
  return response.json() as Promise<LlmHealth>
}

// AI 호출은 화면에서 사용자가 기다리므로 제한 시간을 두고, 초과 시 명확한 안내로 실패시킨다.
async function fetchWithTimeout(input: string, init: RequestInit, timeoutMs: number, signal?: AbortSignal): Promise<Response> {
  try {
    return await fetch(input, { ...init, signal: combineTimeoutSignal(timeoutMs, signal) })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      throw new ApiError('AI 응답이 오래 걸려 요청을 중단했습니다. 잠시 후 다시 시도해 주세요.', 408)
    }
    throw error
  }
}

// 구형 브라우저는 AbortSignal.timeout/any가 없으므로 지원 여부에 따라 점진적으로 적용한다.
function combineTimeoutSignal(timeoutMs: number, signal?: AbortSignal): AbortSignal | undefined {
  if (typeof AbortSignal.timeout !== 'function') return signal
  const timeout = AbortSignal.timeout(timeoutMs)
  if (!signal) return timeout
  return typeof AbortSignal.any === 'function' ? AbortSignal.any([signal, timeout]) : signal
}

export async function generateVisitSummary(text: string, role: 'self' | 'family', context?: string | null, signal?: AbortSignal): Promise<PrepareVisitResponse> {
  const response = await fetchWithTimeout('/api/ai/prepare', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, role, context: context || undefined }),
  }, 60_000, signal)

  const payload = await response.json() as Partial<PrepareVisitResponse> & { error?: string }
  if (!response.ok) throw new ApiError(payload.error ?? 'AI 정리에 실패했습니다.', response.status)
  if (!payload.summary || !isVisitSummary(payload.summary) || !payload.model) {
    throw new ApiError('AI가 올바른 형식의 결과를 보내지 않았습니다.', 502)
  }
  return { summary: payload.summary, model: payload.model }
}

export async function transcribeVisitAudio(audio: Blob, signal?: AbortSignal): Promise<TranscriptionResponse> {
  if (audio.size === 0) throw new ApiError('글로 바꿀 녹음 내용이 없습니다.', 400)
  if (audio.size > maxAudioBytes) throw new ApiError('녹음 파일이 너무 큽니다. 더 짧게 나누어 녹음해 주세요.', 413)

  const response = await fetchWithTimeout('/api/audio/transcribe', {
    method: 'POST',
    headers: { 'Content-Type': audio.type || 'audio/webm' },
    body: audio,
  }, 180_000, signal)
  const payload = await response.json().catch(() => ({})) as Partial<TranscriptionResponse> & { error?: string }
  if (!response.ok) throw new ApiError(payload.error ?? '음성을 글로 바꾸지 못했습니다.', response.status)
  if (!payload.transcript?.trim() || !payload.model) {
    throw new ApiError('글로 바꾼 결과가 올바른 형식이 아닙니다.', 502)
  }
  return { transcript: payload.transcript.trim(), model: payload.model }
}

export async function generatePostVisitReview(transcript: string, preparationQuestions: string[], signal?: AbortSignal): Promise<PostVisitReviewResponse> {
  const response = await fetchWithTimeout('/api/ai/post-visit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transcript, preparationQuestions }),
  }, 90_000, signal)
  const payload = await response.json().catch(() => ({})) as Partial<PostVisitReviewResponse> & { error?: string }
  if (!response.ok) throw new ApiError(payload.error ?? '기억 확인 질문을 만들지 못했습니다.', response.status)
  if (!payload.review || !isVisitReview(payload.review) || !payload.model) {
    throw new ApiError('기억 확인 결과가 올바른 형식이 아닙니다.', 502)
  }
  return { review: payload.review, model: payload.model }
}

function isVisitSummary(value: VisitSummary) {
  return typeof value.symptom === 'string'
    && typeof value.course === 'string'
    && typeof value.measurement === 'string'
    && Array.isArray(value.questions)
    && value.questions.length === 3
    && value.questions.every((question) => typeof question === 'string')
    && (value.sources === undefined || (Array.isArray(value.sources) && value.sources.every((source) => typeof source.id === 'string'
      && typeof source.title === 'string'
      && typeof source.organization === 'string'
      && typeof source.url === 'string')))
}

async function submitCredentials(endpoint: string, email: string, password: string): Promise<AuthResponse> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ email, password }),
  })
  const payload = await response.json().catch(() => ({})) as Partial<AuthResponse> & { error?: string }
  if (!response.ok) throw new ApiError(payload.error ?? '계정 요청을 처리하지 못했습니다.', response.status)
  if (!payload.user?.id || !payload.user.email) throw new ApiError('계정 응답이 올바르지 않습니다.', 502)
  return { user: payload.user }
}

function isVisitReview(value: VisitReview) {
  return Array.isArray(value.questions)
    && value.questions.length >= 1
    && value.questions.length <= 3
    && value.questions.every((question) => typeof question.id === 'string'
      && typeof question.question === 'string'
      && Array.isArray(question.options)
      && question.options.length === 3
      && question.options.every((option) => typeof option === 'string')
      && typeof question.expected === 'string'
      && question.options.includes(question.expected)
      && typeof question.takeaway === 'string')
    && Array.isArray(value.actions)
    && value.actions.every((action) => typeof action === 'string')
    && Array.isArray(value.unanswered)
    && value.unanswered.every((question) => typeof question === 'string')
}
