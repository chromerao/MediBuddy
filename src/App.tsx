import { useCallback, useEffect, useState } from 'react'
import { generateVisitSummary, getLlmHealth, getSession, loadCloudState, logIn, logOut, saveCloudState, signUp } from './api'
import { AppShell } from './components/AppShell'
import { createSummary, evaluateVisitReview, fallbackVisitReview, initialState } from './data'
import { AcceptInvite } from './screens/AcceptInvite'
import { Account } from './screens/Account'
import { Calendar } from './screens/Calendar'
import { Family } from './screens/Family'
import { Home } from './screens/Home'
import { Notebook } from './screens/Notebook'
import { Onboarding } from './screens/Onboarding'
import { PrepareVisit } from './screens/PrepareVisit'
import { Settings } from './screens/Settings'
import { ShareSettings } from './screens/ShareSettings'
import { FamilyInvite } from './screens/FamilyInvite'
import { VisitRecordDetail } from './screens/VisitRecordDetail'
import { VisitFlow } from './screens/VisitFlow'
import type { AppointmentInput, AppState, AppStep, AuthStatus, AuthUser, FamilyInvitation, QuizAnswer, SyncStatus, Tab, VisitRecord } from './types'

const STORAGE_KEY = 'medibuddy-demo-state'
const flowSteps: AppStep[] = ['symptom', 'review', 'summary', 'consent', 'recording', 'processing', 'quiz', 'results']

function loadState(): AppState {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (!saved) return initialState
    return normalizeState(JSON.parse(saved) as Partial<AppState>)
  } catch {
    return initialState
  }
}

function normalizeState(parsed: Partial<AppState>): AppState {
  return {
    ...initialState,
    ...parsed,
    settings: { ...initialState.settings, ...parsed.settings },
    sharePreferences: { ...initialState.sharePreferences, ...parsed.sharePreferences },
    visitRecords: parsed.visitRecords ?? initialState.visitRecords,
    familyInvitations: parsed.familyInvitations ?? initialState.familyInvitations,
    familyMembers: parsed.familyMembers ?? initialState.familyMembers,
    appointments: parsed.appointments ?? initialState.appointments,
    visitReview: parsed.visitReview?.questions?.length ? parsed.visitReview : initialState.visitReview,
    selectedVisitId: null,
    step: 'home',
  }
}

export function App() {
  const [state, setState] = useState<AppState>(loadState)
  const [notice, setNotice] = useState('')
  const [incomingInviteCode, setIncomingInviteCode] = useState(() => new URLSearchParams(window.location.search).get('invite'))
  const [llm, setLlm] = useState<{ status: 'checking' | 'connected' | 'unavailable'; model: string | null }>({ status: 'checking', model: null })
  const [aiGeneration, setAiGeneration] = useState<{ loading: boolean; notice: string; model: string | null }>({ loading: false, notice: '', model: null })
  const [authStatus, setAuthStatus] = useState<AuthStatus>('checking')
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle')
  const [cloudReady, setCloudReady] = useState(false)

  useEffect(() => {
    if (authStatus === 'anonymous') window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [authStatus, state])

  useEffect(() => {
    const controller = new AbortController()
    let active = true

    async function restoreAccount() {
      let user: AuthUser | null
      try {
        const session = await getSession(controller.signal)
        user = session.user
      } catch (error) {
        if (!active || isAbortError(error)) return
        setAuthStatus('anonymous')
        return
      }

      if (!active) return
      if (!user) {
        setAuthStatus('anonymous')
        return
      }

      setAuthUser(user)
      setAuthStatus('authenticated')
      setSyncStatus('syncing')
      try {
        const cloud = await loadCloudState(controller.signal)
        if (!active) return
        if (cloud.state) {
          setState(normalizeState(cloud.state))
        } else {
          await saveCloudState(loadState(), controller.signal)
        }
        if (!active) return
        window.localStorage.removeItem(STORAGE_KEY)
        setCloudReady(true)
        setSyncStatus('saved')
      } catch (error) {
        if (!active || isAbortError(error)) return
        setSyncStatus('error')
      }
    }

    restoreAccount()
    return () => {
      active = false
      controller.abort()
    }
  }, [])

  useEffect(() => {
    if (authStatus !== 'anonymous') return
    function syncFamilyState(event: StorageEvent) {
      if (event.key !== STORAGE_KEY || !event.newValue) return
      try {
        const updated = JSON.parse(event.newValue) as Partial<AppState>
        setState((current) => ({
          ...current,
          familyInvitations: updated.familyInvitations ?? current.familyInvitations,
          familyMembers: updated.familyMembers ?? current.familyMembers,
          sharePreferences: updated.sharePreferences ?? current.sharePreferences,
          appointments: updated.appointments ?? current.appointments,
        }))
      } catch {
        // Ignore malformed data written by another tab.
      }
    }
    window.addEventListener('storage', syncFamilyState)
    return () => window.removeEventListener('storage', syncFamilyState)
  }, [authStatus])

  useEffect(() => {
    if (authStatus !== 'authenticated' || !cloudReady) return
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      setSyncStatus('syncing')
      saveCloudState(state, controller.signal)
        .then(() => setSyncStatus('saved'))
        .catch((error) => {
          if (!isAbortError(error)) setSyncStatus('error')
        })
    }, 700)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [authStatus, cloudReady, state])

  useEffect(() => {
    const controller = new AbortController()
    getLlmHealth(controller.signal)
      .then((health) => setLlm({ status: health.configured ? 'connected' : 'unavailable', model: health.model }))
      .catch(() => setLlm({ status: 'unavailable', model: null }))
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(''), 3000)
    return () => window.clearTimeout(timer)
  }, [notice])

  const setStep = useCallback((step: AppStep) => {
    setState((current) => ({ ...current, step }))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  function setTab(tab: Tab) {
    setState((current) => ({ ...current, tab, step: 'home' }))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function authenticate(action: (email: string, password: string) => Promise<{ user: AuthUser }>, email: string, password: string) {
    const result = await action(email, password)
    setAuthUser(result.user)
    setAuthStatus('authenticated')
    setCloudReady(false)
    setSyncStatus('syncing')

    try {
      const cloud = await loadCloudState()
      if (cloud.state) {
        setState({ ...normalizeState(cloud.state), step: 'account' })
      } else {
        await saveCloudState(state)
      }
      window.localStorage.removeItem(STORAGE_KEY)
      setCloudReady(true)
      setSyncStatus('saved')
      setNotice(cloud.state ? '계정 기록을 불러왔어요.' : '이 브라우저의 기록을 계정에 저장했어요.')
    } catch (error) {
      setSyncStatus('error')
      throw error
    }
  }

  async function handleLogout() {
    await logOut()
    window.localStorage.removeItem(STORAGE_KEY)
    setAuthUser(null)
    setAuthStatus('anonymous')
    setCloudReady(false)
    setSyncStatus('idle')
    setState({ ...initialState, hasOnboarded: true, step: 'account' })
    setNotice('로그아웃했어요. 이 기기에서는 계정 기록을 지웠어요.')
  }

  function startPreparation(role: 'self' | 'family') {
    setAiGeneration({ loading: false, notice: '', model: null })
    setState((current) => ({ ...current, role, tab: role === 'family' ? 'family' : 'home', step: 'symptom', answers: [], consented: false, visitTranscript: '', transcriptionModel: null, visitReview: fallbackVisitReview, reviewModel: null, reviewSource: 'fallback' }))
  }

  async function prepareVisitWithAi() {
    setAiGeneration({ loading: true, notice: '', model: null })
    try {
      const result = await generateVisitSummary(state.symptomInput, state.role)
      setState((current) => ({ ...current, summary: result.summary, step: 'review' }))
      setLlm({ status: 'connected', model: result.model })
      setAiGeneration({ loading: false, notice: '', model: result.model })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'AI 서버에 연결하지 못했습니다.'
      setState((current) => ({ ...current, summary: createSummary(current.symptomInput), step: 'review' }))
      setLlm({ status: 'unavailable', model: null })
      setAiGeneration({ loading: false, notice: `${message} 입력하신 내용만 기본 규칙으로 정리했습니다.`, model: null })
    }
  }

  function handleBack() {
    const index = flowSteps.indexOf(state.step)
    if (index === -1 || index === 0) {
      setStep('home')
      return
    }
    setStep(flowSteps[index - 1])
  }

  function updateAnswer(answer: QuizAnswer) {
    setState((current) => ({
      ...current,
      answers: [...current.answers.filter((item) => item.questionId !== answer.questionId), answer],
    }))
  }

  function closeInvitationLink() {
    const url = new URL(window.location.href)
    url.searchParams.delete('invite')
    window.history.replaceState({}, '', url)
    setIncomingInviteCode(null)
  }

  function createFamilyInvitation(name: string, relationship: string) {
    const invitation: FamilyInvitation = {
      id: crypto.randomUUID(),
      code: createInviteCode(),
      name,
      relationship,
      status: 'pending',
      createdAt: new Date().toISOString(),
    }
    setState((current) => ({ ...current, familyInvitations: [invitation, ...current.familyInvitations] }))
    return invitation
  }

  function saveAppointment(input: AppointmentInput, appointmentId?: string) {
    setState((current) => ({
      ...current,
      appointments: appointmentId
        ? current.appointments.map((appointment) => appointment.id === appointmentId ? { ...appointment, ...input } : appointment)
        : [...current.appointments, { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() }],
    }))
    setNotice(appointmentId ? '병원 일정을 수정했어요.' : '병원 일정을 등록했어요.')
  }

  function deleteAppointment(appointmentId: string) {
    setState((current) => ({ ...current, appointments: current.appointments.filter((appointment) => appointment.id !== appointmentId) }))
    setNotice('병원 일정을 삭제했어요.')
  }

  const incomingInvitation = incomingInviteCode
    ? state.familyInvitations.find((invitation) => invitation.code === incomingInviteCode && invitation.status === 'pending') ?? null
    : null

  if (incomingInviteCode) {
    return (
      <AcceptInvite
        invitation={incomingInvitation}
        onAccept={() => {
          if (!incomingInvitation) return
          setState((current) => ({
            ...current,
            hasOnboarded: true,
            tab: 'family',
            step: 'home',
            familyInvitations: current.familyInvitations.map((invitation) => invitation.id === incomingInvitation.id ? { ...invitation, status: 'accepted' } : invitation),
            familyMembers: current.familyMembers.some((member) => member.id === `invite-${incomingInvitation.id}`) ? current.familyMembers : [...current.familyMembers, {
              id: `invite-${incomingInvitation.id}`,
              name: incomingInvitation.name,
              relationship: incomingInvitation.relationship,
              conditions: [],
              connectedAt: new Date().toISOString(),
            }],
          }))
          closeInvitationLink()
          setNotice('가족 연결이 완료됐어요.')
        }}
        onDecline={closeInvitationLink}
      />
    )
  }

  if (!state.hasOnboarded) {
    return (
      <Onboarding
        role={state.role}
        onRoleChange={(role) => setState((current) => ({ ...current, role }))}
        onStart={() => setState((current) => ({ ...current, hasOnboarded: true, tab: current.role === 'family' ? 'family' : 'home' }))}
      />
    )
  }

  const isFlow = state.step !== 'home'
  const selectedVisit = state.visitRecords.find((record) => record.id === state.selectedVisitId)

  return (
    <>
      <AppShell
        tab={state.tab}
        onTabChange={setTab}
        compactContent={isFlow}
        onGoHome={() => setTab('home')}
        fontSize={state.settings.fontSize}
        onOpenSettings={() => setStep('settings')}
      >
        {state.step === 'home' && state.tab === 'home' && (
          <Home
            tasks={state.tasks}
            healthLogs={state.healthLogs}
            appointments={state.appointments}
            onPrepare={() => startPreparation('self')}
            onOpenCalendar={() => setStep('calendar')}
            onToggleTask={(id) => setState((current) => ({ ...current, tasks: current.tasks.map((task) => task.id === id ? { ...task, completed: !task.completed } : task) }))}
            onOpenNotebook={() => setTab('notebook')}
            llm={llm}
          />
        )}
        {state.step === 'home' && state.tab === 'notebook' && (
          <Notebook
            tasks={state.tasks}
            healthLogs={state.healthLogs}
            visitRecords={state.visitRecords}
            onToggleTask={(id) => setState((current) => ({ ...current, tasks: current.tasks.map((task) => task.id === id ? { ...task, completed: !task.completed } : task) }))}
            onAddLog={(text) => setState((current) => ({ ...current, healthLogs: [{ id: crypto.randomUUID(), text, time: '방금 기록됨' }, ...current.healthLogs] }))}
            onOpenVisit={(selectedVisitId) => setState((current) => ({ ...current, selectedVisitId, step: 'visit-detail' }))}
          />
        )}
        {state.step === 'home' && state.tab === 'family' && (
          <Family
            preferences={state.sharePreferences}
            onToggleSharing={(enabled) => setState((current) => ({ ...current, sharePreferences: { ...current.sharePreferences, enabled } }))}
            onPrepareForFamily={() => startPreparation('family')}
            onOpenShareSettings={() => setStep('share-settings')}
            onInviteFamily={() => setStep('family-invite')}
            members={state.familyMembers}
            pendingInvitations={state.familyInvitations.filter((invitation) => invitation.status === 'pending')}
            sharedRecords={state.visitRecords}
            onCancelInvitation={(id) => setState((current) => ({ ...current, familyInvitations: current.familyInvitations.map((invitation) => invitation.id === id ? { ...invitation, status: 'cancelled' } : invitation) }))}
            onOpenSharedVisit={(selectedVisitId) => setState((current) => ({ ...current, selectedVisitId, step: 'visit-detail' }))}
          />
        )}
        {(state.step === 'symptom' || state.step === 'review' || state.step === 'summary') && (
          <PrepareVisit
            step={state.step}
            value={state.symptomInput}
            summary={state.summary}
            familyMode={state.role === 'family'}
            onValueChange={(symptomInput) => setState((current) => ({ ...current, symptomInput }))}
            onReview={prepareVisitWithAi}
            onCreateCard={() => setStep('summary')}
            onStartVisit={() => {
              if (state.role === 'family') {
                setState((current) => ({ ...current, step: 'home', tab: 'family' }))
                setNotice('김영희 님에게 질문 카드를 보냈어요.')
              } else {
                setStep('consent')
              }
            }}
            onBack={handleBack}
            isGenerating={aiGeneration.loading}
            aiNotice={aiGeneration.notice}
            aiModel={aiGeneration.model}
          />
        )}
        {(state.step === 'consent' || state.step === 'recording' || state.step === 'processing' || state.step === 'quiz' || state.step === 'results') && (
          <VisitFlow
            step={state.step}
            summary={state.summary}
            consented={state.consented}
            answers={state.answers}
            transcript={state.visitTranscript}
            transcriptionModel={state.transcriptionModel}
            review={state.visitReview}
            reviewModel={state.reviewModel}
            reviewSource={state.reviewSource}
            onConsentChange={(consented) => setState((current) => ({ ...current, consented }))}
            onStepChange={setStep}
            onAnswer={updateAnswer}
            onTranscriptionComplete={(visitTranscript, transcriptionModel) => setState((current) => ({ ...current, visitTranscript, transcriptionModel }))}
            onReviewComplete={(visitReview, reviewModel, reviewSource) => setState((current) => ({ ...current, visitReview, reviewModel, reviewSource, answers: [] }))}
            onSaveResults={() => {
              const evaluation = evaluateVisitReview(state.visitReview, state.answers)
              const record = createVisitRecord(state.summary, state.visitTranscript, state.transcriptionModel, evaluation, state.visitReview.actions, state.reviewModel, state.reviewSource)
              setState((current) => ({
                ...current,
                step: 'home',
                tab: 'notebook',
                selectedVisitId: record.id,
                visitRecords: [record, ...current.visitRecords],
                tasks: current.tasks.map((task) => ({ ...task, completed: false })),
              }))
              setNotice('진료 결과를 의료수첩에 저장했어요.')
            }}
            onBack={handleBack}
          />
        )}
        {state.step === 'settings' && (
          <Settings
            settings={state.settings}
            user={authUser}
            authStatus={authStatus}
            syncStatus={syncStatus}
            onChange={(settings) => setState((current) => ({ ...current, settings }))}
            onOpenAccount={() => setStep('account')}
            onBack={handleBack}
          />
        )}
        {state.step === 'account' && (
          <Account
            user={authUser}
            authStatus={authStatus}
            syncStatus={syncStatus}
            onLogin={(email, password) => authenticate(logIn, email, password)}
            onSignUp={(email, password) => authenticate(signUp, email, password)}
            onLogout={handleLogout}
            onBack={() => setStep('settings')}
          />
        )}
        {state.step === 'calendar' && (
          <Calendar
            appointments={state.appointments}
            onSave={saveAppointment}
            onDelete={deleteAppointment}
            onBack={() => setStep('home')}
          />
        )}
        {state.step === 'share-settings' && (
          <ShareSettings
            preferences={state.sharePreferences}
            onChange={(sharePreferences) => setState((current) => ({ ...current, sharePreferences }))}
            onSave={() => { setStep('home'); setNotice('가족 공유 설정을 저장했어요.') }}
            onBack={handleBack}
          />
        )}
        {state.step === 'family-invite' && (
          <FamilyInvite
            pendingInvitations={state.familyInvitations.filter((invitation) => invitation.status === 'pending')}
            onCreate={createFamilyInvitation}
            onCancel={(id) => setState((current) => ({ ...current, familyInvitations: current.familyInvitations.map((invitation) => invitation.id === id ? { ...invitation, status: 'cancelled' } : invitation) }))}
            onBack={handleBack}
          />
        )}
        {state.step === 'visit-detail' && selectedVisit && (
          <VisitRecordDetail
            record={selectedVisit}
            onPrepareAgain={() => {
              setState((current) => ({ ...current, symptomInput: selectedVisit.summary.symptom, summary: selectedVisit.summary, role: 'self', step: 'review' }))
            }}
            onBack={handleBack}
          />
        )}
      </AppShell>
      {notice && <div className="toast" role="status">{notice}</div>}
    </>
  )
}

function createVisitRecord(summary: AppState['summary'], transcript: string, transcriptionModel: string | null, evaluation: ReturnType<typeof evaluateVisitReview>, actions: string[], reviewModel: string | null, reviewSource: AppState['reviewSource']): VisitRecord {
  const now = new Date()
  const month = new Intl.DateTimeFormat('ko-KR', { month: 'long' }).format(now)
  const day = new Intl.DateTimeFormat('ko-KR', { day: '2-digit' }).format(now).replace('일', '').trim()
  return {
    id: crypto.randomUUID(),
    date: new Intl.DateTimeFormat('ko-KR', { dateStyle: 'long', timeStyle: 'short' }).format(now),
    day,
    month,
    hospital: '성모병원',
    department: '내과',
    disease: '당뇨 정기 진료',
    summary,
    remembered: evaluation.remembered,
    corrected: evaluation.corrected,
    unanswered: evaluation.unanswered,
    actions,
    transcript: transcript || undefined,
    transcriptionModel: transcriptionModel ?? undefined,
    reviewModel: reviewModel ?? undefined,
    reviewSource,
    createdAt: now.toISOString(),
  }
}

function createInviteCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const values = crypto.getRandomValues(new Uint8Array(6))
  return Array.from(values, (value) => alphabet[value % alphabet.length]).join('')
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError'
}
