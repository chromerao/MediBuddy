import type { AppState, AuthUser, VisitReview, VisitSummary } from './types'

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

export async function saveCloudState(state: AppState, signal?: AbortSignal): Promise<{ updatedAt: string }> {
  const response = await fetch('/api/state', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ state }),
    signal,
  })
  const payload = await response.json().catch(() => ({})) as { updatedAt?: string; error?: string }
  if (!response.ok) throw new ApiError(payload.error ?? '서버에 기록을 저장하지 못했습니다.', response.status)
  if (!payload.updatedAt) throw new ApiError('서버 저장 응답이 올바르지 않습니다.', 502)
  return { updatedAt: payload.updatedAt }
}

export async function getLlmHealth(signal?: AbortSignal): Promise<LlmHealth> {
  const response = await fetch('/api/health/llm', { signal })
  if (!response.ok) throw new ApiError('AI 서버 상태를 확인하지 못했습니다.', response.status)
  return response.json() as Promise<LlmHealth>
}

export async function generateVisitSummary(text: string, role: 'self' | 'family', signal?: AbortSignal): Promise<PrepareVisitResponse> {
  const response = await fetch('/api/ai/prepare', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, role }),
    signal,
  })

  const payload = await response.json() as Partial<PrepareVisitResponse> & { error?: string }
  if (!response.ok) throw new ApiError(payload.error ?? 'AI 정리에 실패했습니다.', response.status)
  if (!payload.summary || !isVisitSummary(payload.summary) || !payload.model) {
    throw new ApiError('AI가 올바른 형식의 결과를 보내지 않았습니다.', 502)
  }
  return { summary: payload.summary, model: payload.model }
}

export async function transcribeVisitAudio(audio: Blob, signal?: AbortSignal): Promise<TranscriptionResponse> {
  if (audio.size === 0) throw new ApiError('전사할 녹음 내용이 없습니다.', 400)
  if (audio.size > maxAudioBytes) throw new ApiError('녹음 파일이 너무 큽니다. 더 짧게 나누어 녹음해 주세요.', 413)

  const response = await fetch('/api/audio/transcribe', {
    method: 'POST',
    headers: { 'Content-Type': audio.type || 'audio/webm' },
    body: audio,
    signal,
  })
  const payload = await response.json().catch(() => ({})) as Partial<TranscriptionResponse> & { error?: string }
  if (!response.ok) throw new ApiError(payload.error ?? '음성을 글로 바꾸지 못했습니다.', response.status)
  if (!payload.transcript?.trim() || !payload.model) {
    throw new ApiError('전사 결과가 올바른 형식이 아닙니다.', 502)
  }
  return { transcript: payload.transcript.trim(), model: payload.model }
}

export async function generatePostVisitReview(transcript: string, preparationQuestions: string[], signal?: AbortSignal): Promise<PostVisitReviewResponse> {
  const response = await fetch('/api/ai/post-visit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transcript, preparationQuestions }),
    signal,
  })
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
