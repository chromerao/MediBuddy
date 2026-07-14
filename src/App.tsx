import { useCallback, useEffect, useRef, useState } from 'react'
import {
  StateConflictError,
  acceptInvitationApi,
  cancelFamilyInvitationApi,
  createFamilyInvitationApi,
  deleteAccount as deleteAccountApi,
  findInvitationByCode,
  generateVisitSummary,
  getLlmHealth,
  getSession,
  loadCloudState,
  loadFamilyData,
  loadSharedFamilyData,
  loadRecordSlices,
  logIn,
  logOut,
  saveAppointments,
  saveCloudState,
  saveVisitRecords,
  signUp,
} from './api'
import type { RecordSlices } from './api'
import { appointmentTypeLabels, formatAppointmentDate, sortAppointments, todayDateKey } from './appointments'
import { AppShell } from './components/AppShell'
import { createSummary, emptySummary, evaluateVisitReview, initialState } from './data'
import { createId } from './id'
import { buildHealthLog } from './metrics'
import { checkAppointmentReminders, checkMedicationReminders } from './notifications'
import { buildPreparationContext } from './preparationContext'
import { formatSummaryText, formatVisitRecordText, shareText } from './share'
import type { ShareOutcome } from './share'
import { emptyProfile, isProfileComplete, normalizeProfile } from './profiles'
import { AcceptInvite } from './screens/AcceptInvite'
import { Account } from './screens/Account'
import { Calendar } from './screens/Calendar'
import { Family } from './screens/Family'
import { Home } from './screens/Home'
import { Medications } from './screens/Medications'
import { Notebook } from './screens/Notebook'
import { Onboarding } from './screens/Onboarding'
import { PrepareVisit } from './screens/PrepareVisit'
import { ProfileSettings } from './screens/ProfileSettings'
import { Settings } from './screens/Settings'
import { ShareSettings } from './screens/ShareSettings'
import { FamilyInvite } from './screens/FamilyInvite'
import { VisitRecordDetail } from './screens/VisitRecordDetail'
import { VisitFlow } from './screens/VisitFlow'
import type { AppointmentInput, AppState, AppStep, AuthStatus, AuthUser, FamilyInvitation, MedicalAppointment, MedicationSlot, QuizAnswer, SharedFamilyBundle, SyncStatus, Tab, VisitRecord } from './types'

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
  const migrated = removeLegacyDemoData(parsed)
  // 예전 버전에서 저장된 고정 폴백 질문은 실제 진료 내용이 아니므로 버린다.
  const hasAiReview = migrated.reviewSource === 'ai' && Boolean(migrated.visitReview?.questions?.length)
  return {
    ...initialState,
    ...migrated,
    profile: { ...emptyProfile, ...migrated.profile },
    settings: { ...initialState.settings, ...migrated.settings },
    sharePreferences: { ...initialState.sharePreferences, ...migrated.sharePreferences },
    visitRecords: (migrated.visitRecords ?? initialState.visitRecords).map((record) => ({
      ...record,
      reviewSource: record.reviewSource === 'ai' ? 'ai' : record.reviewSource ? 'none' : undefined,
    })),
    familyInvitations: migrated.familyInvitations ?? initialState.familyInvitations,
    familyMembers: migrated.familyMembers ?? initialState.familyMembers,
    medications: migrated.medications ?? initialState.medications,
    medicationIntakes: migrated.medicationIntakes ?? initialState.medicationIntakes,
    appointments: (migrated.appointments ?? initialState.appointments).map((appointment) => ({
      ...appointment,
      status: appointment.status ?? 'scheduled',
    })),
    visitReview: hasAiReview ? migrated.visitReview ?? null : null,
    reviewSource: hasAiReview ? 'ai' : 'none',
    activeVisitRole: migrated.activeVisitRole ?? migrated.role ?? 'self',
    activeAppointmentId: null,
    activePreparationAppointmentId: null,
    selectedVisitId: null,
    step: 'home',
  }
}

// 서버에는 일정·진료 기록을 뺀 나머지만 상태 JSON으로 저장한다(분리 저장).
function stripRecordSlices(state: AppState): AppState {
  return { ...state, appointments: [], visitRecords: [] }
}

// 개별 테이블에서 불러온 슬라이스를 상태에 합친다. 서버 슬라이스가 비어 있으면
// 아직 마이그레이션 전이므로 상태 JSON에 남아 있던 값을 그대로 사용한다.
function withRecordSlices(state: AppState, slices: RecordSlices): AppState {
  return {
    ...state,
    appointments: slices.appointments.length
      ? slices.appointments.map((appointment) => ({ ...appointment, status: appointment.status ?? 'scheduled' }))
      : state.appointments,
    visitRecords: slices.visitRecords.length ? slices.visitRecords : state.visitRecords,
  }
}

function saveActivePreparation(state: AppState, status: 'draft' | 'ready'): AppState {
  if (!state.activePreparationAppointmentId) return state
  return {
    ...state,
    appointments: state.appointments.map((appointment) => appointment.id === state.activePreparationAppointmentId
      ? {
          ...appointment,
          preparation: {
            symptomInput: state.symptomInput,
            summary: state.summary,
            status,
            updatedAt: new Date().toISOString(),
          },
        }
      : appointment),
  }
}

function removeLegacyDemoData(parsed: Partial<AppState>): Partial<AppState> {
  const demoSymptom = '요즘 새벽에 발이 저리고, 오늘 아침 공복 혈당은 130이었어요.'
  const hasDemoSymptom = parsed.symptomInput === demoSymptom
  const isLegacyProfile = !parsed.profile?.userName
  return {
    ...parsed,
    symptomInput: hasDemoSymptom ? '' : parsed.symptomInput,
    summary: hasDemoSymptom ? emptySummary : parsed.summary,
    tasks: parsed.tasks?.filter((task) => !(
      (task.id === 'medication' && task.label === '식후 30분 약 챙겨 먹기')
      || (task.id === 'walk' && task.label === '가벼운 산책 20분')
    )),
    healthLogs: parsed.healthLogs?.filter((log) => log.id !== 'initial-log'),
    visitRecords: parsed.visitRecords?.filter((record) => record.id !== 'visit-2026-10-25'),
    familyMembers: parsed.familyMembers?.filter((member) => member.id !== 'family-kim-younghee'),
    sharePreferences: isLegacyProfile ? { ...initialState.sharePreferences, ...parsed.sharePreferences, enabled: false } : parsed.sharePreferences,
  }
}

export function App() {
  const [state, setState] = useState<AppState>(loadState)
  const [notice, setNotice] = useState('')
  const [incomingInviteCode, setIncomingInviteCode] = useState(() => new URLSearchParams(window.location.search).get('invite'))
  const [serverInvite, setServerInvite] = useState<{ status: 'idle' | 'loading' | 'ready'; invitation: FamilyInvitation | null }>({ status: 'idle', invitation: null })
  const [llm, setLlm] = useState<{ status: 'checking' | 'connected' | 'unavailable'; model: string | null }>({ status: 'checking', model: null })
  const [aiGeneration, setAiGeneration] = useState<{ loading: boolean; notice: string; model: string | null }>({ loading: false, notice: '', model: null })
  const [authStatus, setAuthStatus] = useState<AuthStatus>('checking')
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle')
  const [cloudReady, setCloudReady] = useState(false)
  const [sharedFamilyData, setSharedFamilyData] = useState<SharedFamilyBundle[]>([])
  const lastSyncedAtRef = useRef<string | null>(null)
  const syncedSlicesRef = useRef<{ appointments: AppState['appointments'] | null; visitRecords: AppState['visitRecords'] | null }>({ appointments: null, visitRecords: null })

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
        const [cloud, slices] = await Promise.all([loadCloudState(controller.signal), loadRecordSlices(controller.signal)])
        if (!active) return
        if (cloud.state) {
          setState(withRecordSlices(normalizeState(cloud.state), slices))
          lastSyncedAtRef.current = cloud.updatedAt
        } else {
          const local = withRecordSlices(loadState(), slices)
          const saved = await saveCloudState(stripRecordSlices(local), null, controller.signal)
          lastSyncedAtRef.current = saved.updatedAt
          if (!active) return
          setState(local)
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
          profile: updated.profile ?? current.profile,
          role: updated.role ?? current.role,
          hasOnboarded: updated.hasOnboarded ?? current.hasOnboarded,
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
      const jobs: Promise<unknown>[] = [
        saveCloudState(stripRecordSlices(state), lastSyncedAtRef.current, controller.signal)
          .then((saved) => { lastSyncedAtRef.current = saved.updatedAt }),
      ]
      // 일정·진료 기록은 바뀐 슬라이스만 개별 API로 저장한다.
      if (syncedSlicesRef.current.appointments !== state.appointments) {
        jobs.push(saveAppointments(state.appointments, controller.signal)
          .then(() => { syncedSlicesRef.current.appointments = state.appointments }))
      }
      if (syncedSlicesRef.current.visitRecords !== state.visitRecords) {
        jobs.push(saveVisitRecords(state.visitRecords, controller.signal)
          .then(() => { syncedSlicesRef.current.visitRecords = state.visitRecords }))
      }
      Promise.all(jobs)
        .then(() => setSyncStatus('saved'))
        .catch((error) => {
          if (isAbortError(error)) return
          if (error instanceof StateConflictError) {
            // 다른 기기에서 먼저 저장한 기록이 있으면 덮어쓰지 않고 서버 기록을 따른다.
            // 일정·진료 기록은 별도 API로 동기화되므로 현재 값을 유지한다.
            lastSyncedAtRef.current = error.serverUpdatedAt
            if (error.serverState) {
              const serverState = error.serverState
              setState((current) => ({ ...normalizeState(serverState), appointments: current.appointments, visitRecords: current.visitRecords }))
            }
            setSyncStatus('saved')
            setNotice('다른 기기에서 저장한 최신 기록을 불러왔어요.')
            return
          }
          setSyncStatus('error')
        })
    }, 700)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [authStatus, cloudReady, state])

  // 로그인 상태에서는 가족 초대·연결 정보를 서버에서 불러온다(기기와 무관하게 동작).
  useEffect(() => {
    if (authStatus !== 'authenticated' || !cloudReady) return
    const controller = new AbortController()
    Promise.all([loadFamilyData(controller.signal), loadSharedFamilyData(controller.signal)])
      .then(([family, shared]) => {
        setState((current) => ({ ...current, familyInvitations: family.invitations, familyMembers: family.members }))
        setSharedFamilyData(shared)
      })
      .catch((error) => {
        if (!isAbortError(error)) setNotice('가족 연결 정보를 불러오지 못했어요.')
      })
    return () => controller.abort()
  }, [authStatus, cloudReady])

  async function refreshSharedFamilyRecords() {
    if (authStatus !== 'authenticated') {
      setNotice('다른 계정의 가족 기록을 보려면 로그인해 주세요.')
      return
    }
    try {
      const shared = await loadSharedFamilyData()
      setSharedFamilyData(shared)
      setNotice('가족 공유 기록을 새로 불러왔어요.')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '가족 공유 기록을 불러오지 못했어요.')
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    getLlmHealth(controller.signal)
      .then((health) => setLlm({ status: health.configured ? 'connected' : 'unavailable', model: health.model }))
      .catch(() => setLlm({ status: 'unavailable', model: null }))
    return () => controller.abort()
  }, [])

  // 브라우저 알림: 앱을 사용하는 동안 하루 전·당일 일정과 복약 시간을 알려준다.
  useEffect(() => {
    function runReminderChecks() {
      checkAppointmentReminders(state.appointments, state.settings)
      checkMedicationReminders(state.medications, state.medicationIntakes, state.settings)
    }
    runReminderChecks()
    const timer = window.setInterval(runReminderChecks, 10 * 60 * 1000)
    return () => window.clearInterval(timer)
  }, [state.appointments, state.settings, state.medications, state.medicationIntakes])

  useEffect(() => {
    if (!incomingInviteCode || authStatus !== 'authenticated') return
    const controller = new AbortController()
    findInvitationByCode(incomingInviteCode, controller.signal)
      .then((invitation) => setServerInvite({ status: 'ready', invitation: invitation?.status === 'pending' ? invitation : null }))
      .catch((error) => {
        if (!isAbortError(error)) setServerInvite({ status: 'ready', invitation: null })
      })
    return () => controller.abort()
  }, [incomingInviteCode, authStatus])

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
    setSharedFamilyData([])
    setSyncStatus('syncing')

    try {
      const [cloud, slices] = await Promise.all([loadCloudState(), loadRecordSlices()])
      if (cloud.state) {
        setState({ ...withRecordSlices(normalizeState(cloud.state), slices), step: 'account' })
        lastSyncedAtRef.current = cloud.updatedAt
      } else {
        const local = withRecordSlices(state, slices)
        const saved = await saveCloudState(stripRecordSlices(local), null)
        lastSyncedAtRef.current = saved.updatedAt
        setState({ ...local, step: 'account' })
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
    setSharedFamilyData([])
    setSyncStatus('idle')
    lastSyncedAtRef.current = null
    syncedSlicesRef.current = { appointments: null, visitRecords: null }
    setState({ ...initialState, hasOnboarded: true, step: 'account' })
    setNotice('로그아웃했어요. 이 기기에서는 계정 기록을 지웠어요.')
  }

  async function handleDeleteAccount() {
    await deleteAccountApi()
    window.localStorage.removeItem(STORAGE_KEY)
    setAuthUser(null)
    setAuthStatus('anonymous')
    setCloudReady(false)
    setSharedFamilyData([])
    setSyncStatus('idle')
    lastSyncedAtRef.current = null
    syncedSlicesRef.current = { appointments: null, visitRecords: null }
    setState({ ...initialState })
    setNotice('계정과 서버에 저장된 모든 기록을 삭제했어요.')
  }

  // visitTarget은 이번 진료 준비의 대상일 뿐, 프로필 역할(state.role)은 바꾸지 않는다.
  function startPreparation(visitTarget: 'self' | 'family', appointmentId?: string) {
    setAiGeneration({ loading: false, notice: '', model: null })
    setState((current) => {
      const defaultAppointment = appointmentId
        ? current.appointments.find((appointment) => appointment.id === appointmentId)
        : sortAppointments(current.appointments).find((appointment) => appointment.status === 'scheduled' && appointment.date >= todayDateKey())
      const preparation = defaultAppointment?.preparation
      return {
        ...current,
        activeVisitRole: visitTarget,
        activeAppointmentId: defaultAppointment?.id ?? null,
        activePreparationAppointmentId: defaultAppointment?.id ?? null,
        tab: visitTarget === 'family' ? 'family' : 'home',
        step: preparation?.status === 'ready' ? 'summary' : preparation?.summary.questions.length ? 'review' : 'symptom',
        symptomInput: preparation?.symptomInput ?? '',
        summary: preparation?.summary ?? emptySummary,
        answers: [],
        consented: false,
        visitTranscript: '',
        transcriptionModel: null,
        visitReview: null,
        reviewModel: null,
        reviewSource: 'none',
      }
    })
  }

  async function prepareVisitWithAi() {
    setAiGeneration({ loading: true, notice: '', model: null })
    try {
      const appointment = state.appointments.find((item) => item.id === state.activePreparationAppointmentId)
      const context = buildPreparationContext({ appointment, visitRecords: state.visitRecords, healthLogs: state.healthLogs, tasks: state.tasks, medications: state.medications, medicationIntakes: state.medicationIntakes })
      const result = await generateVisitSummary(state.symptomInput, state.activeVisitRole, context.prompt)
      setState((current) => saveActivePreparation({ ...current, summary: result.summary, step: 'review' }, 'draft'))
      setLlm({ status: 'connected', model: result.model })
      setAiGeneration({ loading: false, notice: '', model: result.model })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'AI 서버에 연결하지 못했습니다.'
      setState((current) => saveActivePreparation({ ...current, summary: createSummary(current.symptomInput), step: 'review' }, 'draft'))
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

  async function createFamilyInvitation(name: string, relationship: string): Promise<FamilyInvitation> {
    if (authStatus === 'authenticated') {
      const invitation = await createFamilyInvitationApi(name, relationship)
      setState((current) => ({ ...current, familyInvitations: [invitation, ...current.familyInvitations] }))
      return invitation
    }
    const invitation: FamilyInvitation = {
      id: createId(),
      code: createInviteCode(),
      name,
      relationship,
      status: 'pending',
      createdAt: new Date().toISOString(),
    }
    setState((current) => ({ ...current, familyInvitations: [invitation, ...current.familyInvitations] }))
    return invitation
  }

  function cancelFamilyInvitation(id: string) {
    if (authStatus === 'authenticated') {
      cancelFamilyInvitationApi(id).catch(() => setNotice('서버에서 초대를 취소하지 못했어요.'))
    }
    setState((current) => ({ ...current, familyInvitations: current.familyInvitations.map((invitation) => invitation.id === id ? { ...invitation, status: 'cancelled' } : invitation) }))
  }

  function saveAppointment(input: AppointmentInput, appointmentId?: string) {
    setState((current) => ({
      ...current,
      appointments: appointmentId
        ? current.appointments.map((appointment) => appointment.id === appointmentId ? { ...appointment, ...input } : appointment)
        : [...current.appointments, { ...input, id: createId(), status: 'scheduled', createdAt: new Date().toISOString() }],
    }))
    setNotice(appointmentId ? '병원 일정을 수정했어요.' : '병원 일정을 등록했어요.')
  }

  function addMedication(name: string, slots: MedicationSlot[], memo: string) {
    setState((current) => ({
      ...current,
      medications: [...current.medications, { id: createId(), name, slots, memo, createdAt: new Date().toISOString() }],
    }))
    setNotice('약을 등록했어요. 홈에서 매일 체크할 수 있어요.')
  }

  function deleteMedication(medicationId: string) {
    setState((current) => ({
      ...current,
      medications: current.medications.filter((medication) => medication.id !== medicationId),
      medicationIntakes: current.medicationIntakes.filter((intake) => intake.medicationId !== medicationId),
    }))
    setNotice('약을 목록에서 삭제했어요.')
  }

  function toggleMedicationIntake(medicationId: string, slot: MedicationSlot) {
    const today = todayDateKey()
    setState((current) => {
      const existing = current.medicationIntakes.find((intake) => intake.medicationId === medicationId && intake.slot === slot && intake.date === today)
      return {
        ...current,
        medicationIntakes: existing
          ? current.medicationIntakes.filter((intake) => intake.id !== existing.id)
          : [...current.medicationIntakes, { id: createId(), medicationId, slot, date: today, takenAt: new Date().toISOString() }],
      }
    })
  }

  function deleteAppointment(appointmentId: string) {
    setState((current) => ({
      ...current,
      appointments: current.appointments.filter((appointment) => appointment.id !== appointmentId),
      activeAppointmentId: current.activeAppointmentId === appointmentId ? null : current.activeAppointmentId,
      activePreparationAppointmentId: current.activePreparationAppointmentId === appointmentId ? null : current.activePreparationAppointmentId,
    }))
    setNotice('병원 일정을 삭제했어요.')
  }

  function deleteVisitTranscript(recordId: string) {
    setState((current) => ({
      ...current,
      visitRecords: current.visitRecords.map((record) => record.id === recordId ? { ...record, transcript: undefined, transcriptionModel: undefined } : record),
    }))
    setNotice('이 기록의 글로 바꾼 내용을 삭제했어요.')
  }

  function deleteVisitRecord(recordId: string) {
    setState((current) => ({
      ...current,
      visitRecords: current.visitRecords.filter((record) => record.id !== recordId),
      selectedVisitId: null,
      step: 'home',
      tab: 'notebook',
    }))
    setNotice('진료 기록을 삭제했어요.')
  }

  function noticeForShare(outcome: ShareOutcome) {
    if (outcome === 'shared') setNotice('공유 창을 열었어요.')
    else if (outcome === 'copied') setNotice('내용을 복사했어요. 카카오톡 등에 붙여넣어 보내세요.')
    else setNotice('공유하지 못했어요. 인쇄 · PDF 저장을 이용해 주세요.')
  }

  async function shareQuestionCard() {
    const outcome = await shareText('메디버디 진료 준비 카드', formatSummaryText(state.summary, state.profile.patientName))
    noticeForShare(outcome)
  }

  async function shareVisitRecord(record: VisitRecord) {
    const outcome = await shareText('메디버디 진료 기록', formatVisitRecordText(record))
    noticeForShare(outcome)
  }

  function exportMyData() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `medibuddy-export-${todayDateKey()}.json`
    anchor.click()
    URL.revokeObjectURL(url)
    setNotice('내 기록을 파일로 내려받았어요.')
  }

  const localInvitation = incomingInviteCode
    ? state.familyInvitations.find((invitation) => invitation.code === incomingInviteCode && invitation.status === 'pending') ?? null
    : null

  if (incomingInviteCode) {
    const waitingForLookup = authStatus === 'checking' || (authStatus === 'authenticated' && serverInvite.status !== 'ready')
    if (waitingForLookup) {
      return <main className="invite-accept-page"><p role="status">초대 정보를 확인하고 있어요…</p></main>
    }
    const invitation = authStatus === 'authenticated' ? serverInvite.invitation : localInvitation
    return (
      <AcceptInvite
        invitation={invitation}
        needsLogin={authStatus !== 'authenticated'}
        onAccept={() => {
          if (!invitation) return
          if (authStatus === 'authenticated') {
            acceptInvitationApi(invitation.code)
              .then(async (family) => {
                setState((current) => ({ ...current, hasOnboarded: true, tab: 'family', step: 'home', familyInvitations: family.invitations, familyMembers: family.members }))
                setSharedFamilyData(await loadSharedFamilyData())
                closeInvitationLink()
                setNotice('가족 연결이 완료됐어요.')
              })
              .catch((error) => setNotice(error instanceof Error ? error.message : '초대를 수락하지 못했어요.'))
            return
          }
          setState((current) => ({
            ...current,
            hasOnboarded: true,
            tab: 'family',
            step: 'home',
            familyInvitations: current.familyInvitations.map((item) => item.id === invitation.id ? { ...item, status: 'accepted' } : item),
            familyMembers: current.familyMembers.some((member) => member.id === `invite-${invitation.id}`) ? current.familyMembers : [...current.familyMembers, {
              id: `invite-${invitation.id}`,
              name: invitation.name,
              relationship: invitation.relationship,
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

  if (!state.hasOnboarded || !isProfileComplete(state.profile, state.role)) {
    return (
      <Onboarding
        role={state.role}
        profile={state.profile}
        onRoleChange={(role) => setState((current) => ({ ...current, role, activeVisitRole: role }))}
        onProfileChange={(profile) => setState((current) => ({ ...current, profile }))}
        onStart={() => setState((current) => ({ ...current, profile: normalizeProfile(current.profile, current.role), hasOnboarded: true, tab: current.role === 'family' ? 'family' : 'home' }))}
      />
    )
  }

  const isFlow = state.step !== 'home'
  const selectedVisit = state.visitRecords.find((record) => record.id === state.selectedVisitId)
  const upcomingAppointments = sortAppointments(state.appointments)
    .filter((appointment) => appointment.status === 'scheduled' && appointment.date >= todayDateKey())
  const activePreparationAppointment = state.appointments.find((appointment) => appointment.id === state.activePreparationAppointmentId)
  const activePreparationContext = buildPreparationContext({
    appointment: activePreparationAppointment,
    visitRecords: state.visitRecords,
    healthLogs: state.healthLogs,
    tasks: state.tasks,
    medications: state.medications,
    medicationIntakes: state.medicationIntakes,
  })

  return (
    <>
      <AppShell
        tab={state.tab}
        onTabChange={setTab}
        compactContent={isFlow}
        onGoHome={() => setTab('home')}
        fontSize={state.settings.fontSize}
        onOpenSettings={() => setStep('settings')}
        onOpenProfile={() => setStep('profile')}
        onOpenAccount={() => setStep('account')}
        onLogout={() => { handleLogout().catch(() => setNotice('로그아웃하지 못했어요. 잠시 후 다시 시도해 주세요.')) }}
        authStatus={authStatus}
      >
        {state.step === 'home' && state.tab === 'home' && (
          <Home
            userName={state.profile.userName}
            tasks={state.tasks}
            healthLogs={state.healthLogs}
            appointments={state.appointments}
            medications={state.medications}
            medicationIntakes={state.medicationIntakes}
            onToggleIntake={toggleMedicationIntake}
            onManageMedications={() => setStep('medications')}
            onPrepare={(appointmentId) => startPreparation(state.role === 'family' ? 'family' : 'self', appointmentId)}
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
            onAddLog={(text) => setState((current) => ({ ...current, healthLogs: [buildHealthLog(text), ...current.healthLogs] }))}
            onOpenVisit={(selectedVisitId) => setState((current) => ({ ...current, selectedVisitId, step: 'visit-detail' }))}
          />
        )}
        {state.step === 'home' && state.tab === 'family' && (
          <Family
            role={state.role}
            profile={state.profile}
            preferences={state.sharePreferences}
            onToggleSharing={(enabled) => setState((current) => ({ ...current, sharePreferences: { ...current.sharePreferences, enabled } }))}
            onPrepareForFamily={() => {
              if (state.role === 'family') startPreparation('family')
              else { setStep('profile'); setNotice('먼저 진료를 준비할 가족 정보를 등록해 주세요.') }
            }}
            onOpenShareSettings={() => setStep('share-settings')}
            onInviteFamily={() => setStep('family-invite')}
            members={state.familyMembers}
            pendingInvitations={state.familyInvitations.filter((invitation) => invitation.status === 'pending')}
            sharedRecords={state.visitRecords}
            sharedFamilyData={sharedFamilyData}
            onRefreshShared={() => { void refreshSharedFamilyRecords() }}
            onCancelInvitation={cancelFamilyInvitation}
            onOpenSharedVisit={(selectedVisitId) => setState((current) => ({ ...current, selectedVisitId, step: 'visit-detail' }))}
          />
        )}
        {(state.step === 'symptom' || state.step === 'review' || state.step === 'summary') && (
          <PrepareVisit
            step={state.step}
            value={state.symptomInput}
            summary={state.summary}
            familyMode={state.activeVisitRole === 'family'}
            patientName={state.profile.patientName}
            onValueChange={(symptomInput) => setState((current) => saveActivePreparation({ ...current, symptomInput }, 'draft'))}
            onReview={prepareVisitWithAi}
            onCreateCard={() => setState((current) => saveActivePreparation({ ...current, step: 'summary' }, 'ready'))}
            onStartVisit={() => setState((current) => saveActivePreparation({ ...current, step: 'consent' }, 'ready'))}
            onSaveCard={() => {
              setState((current) => saveActivePreparation({ ...current, step: 'home', tab: 'family' }, 'ready'))
              setNotice(`${state.profile.patientName} 님의 질문 카드를 저장했어요.`)
            }}
            onShareCard={() => { void shareQuestionCard() }}
            onBack={handleBack}
            isGenerating={aiGeneration.loading}
            aiNotice={aiGeneration.notice}
            aiModel={aiGeneration.model}
            appointmentLabel={activePreparationAppointment ? `${activePreparationAppointment.hospital} ${activePreparationAppointment.department} · ${formatAppointmentDate(activePreparationAppointment.date, activePreparationAppointment.time)}` : null}
            historyContextNote={activePreparationContext.display}
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
            upcomingAppointments={upcomingAppointments}
            selectedAppointmentId={state.activeAppointmentId}
            onSelectAppointment={(activeAppointmentId) => setState((current) => {
              if (!current.activePreparationAppointmentId && activeAppointmentId) {
                return saveActivePreparation({ ...current, activeAppointmentId, activePreparationAppointmentId: activeAppointmentId }, 'ready')
              }
              return { ...current, activeAppointmentId }
            })}
            onConsentChange={(consented) => setState((current) => ({ ...current, consented }))}
            onStepChange={setStep}
            onAnswer={updateAnswer}
            onTranscriptionComplete={(visitTranscript, transcriptionModel) => setState((current) => ({ ...current, visitTranscript, transcriptionModel }))}
            onReviewComplete={(visitReview, reviewModel, reviewSource) => setState((current) => ({ ...current, visitReview, reviewModel, reviewSource, answers: [] }))}
            onSaveResults={() => {
              const evaluation = state.visitReview
                ? evaluateVisitReview(state.visitReview, state.answers)
                : { remembered: [], corrected: [], unanswered: [] }
              const relatedAppointment = state.activeAppointmentId
                ? state.appointments.find((appointment) => appointment.id === state.activeAppointmentId)
                : undefined
              const record = createVisitRecord(state.profile.patientName, state.summary, state.visitTranscript, state.transcriptionModel, evaluation, state.visitReview?.actions ?? [], state.reviewModel, state.reviewSource, relatedAppointment)
              setState((current) => ({
                ...current,
                step: 'home',
                tab: 'notebook',
                selectedVisitId: record.id,
                visitRecords: [record, ...current.visitRecords],
                appointments: relatedAppointment
                  ? current.appointments.map((appointment) => appointment.id === relatedAppointment.id ? { ...appointment, status: 'completed' as const } : appointment)
                  : current.appointments,
                activeAppointmentId: null,
                activePreparationAppointmentId: null,
                tasks: record.actions.map((action) => ({ id: createId(), label: action, completed: false, icon: inferTaskIcon(action) })),
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
            role={state.role}
            profile={state.profile}
            onChange={(settings) => setState((current) => ({ ...current, settings }))}
            onOpenAccount={() => setStep('account')}
            onOpenProfile={() => setStep('profile')}
            onExportData={exportMyData}
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
            onDeleteAccount={handleDeleteAccount}
            onBack={() => setStep('settings')}
          />
        )}
        {state.step === 'medications' && (
          <Medications
            medications={state.medications}
            intakes={state.medicationIntakes}
            onAdd={addMedication}
            onDelete={deleteMedication}
            onBack={() => setStep('home')}
          />
        )}
        {state.step === 'calendar' && (
          <Calendar
            appointments={state.appointments}
            onSave={saveAppointment}
            onDelete={deleteAppointment}
            onPrepare={(appointmentId) => startPreparation(state.role === 'family' ? 'family' : 'self', appointmentId)}
            onBack={() => setStep('home')}
          />
        )}
        {state.step === 'profile' && (
          <ProfileSettings
            role={state.role}
            profile={state.profile}
            onSave={(role, profile) => {
              setState((current) => ({ ...current, role, activeVisitRole: role, profile: normalizeProfile(profile, role), step: 'settings' }))
              setNotice('사용자 정보를 저장했어요.')
            }}
            onBack={() => setStep('settings')}
          />
        )}
        {state.step === 'share-settings' && (
          <ShareSettings
            preferences={state.sharePreferences}
            patientName={state.profile.patientName}
            onChange={(sharePreferences) => setState((current) => ({ ...current, sharePreferences }))}
            onSave={() => { setStep('home'); setNotice('가족 공유 설정을 저장했어요.') }}
            onBack={handleBack}
          />
        )}
        {state.step === 'family-invite' && (
          <FamilyInvite
            pendingInvitations={state.familyInvitations.filter((invitation) => invitation.status === 'pending')}
            isAccountConnected={authStatus === 'authenticated'}
            onCreate={createFamilyInvitation}
            onCancel={cancelFamilyInvitation}
            onBack={handleBack}
          />
        )}
        {state.step === 'visit-detail' && selectedVisit && (
          <VisitRecordDetail
            record={selectedVisit}
            onPrepareAgain={() => {
              setState((current) => ({ ...current, symptomInput: selectedVisit.summary.symptom, summary: selectedVisit.summary, step: 'review' }))
            }}
            onShare={() => { void shareVisitRecord(selectedVisit) }}
            onDeleteTranscript={() => {
              if (window.confirm('이 기록의 글로 바꾼 내용을 삭제할까요? 삭제하면 되돌릴 수 없어요.')) deleteVisitTranscript(selectedVisit.id)
            }}
            onDeleteRecord={() => {
              if (window.confirm('이 진료 기록 전체를 삭제할까요? 삭제하면 되돌릴 수 없어요.')) deleteVisitRecord(selectedVisit.id)
            }}
            onBack={handleBack}
          />
        )}
      </AppShell>
      {notice && <div className="toast" role="status">{notice}</div>}
    </>
  )
}

function createVisitRecord(patientName: string, summary: AppState['summary'], transcript: string, transcriptionModel: string | null, evaluation: ReturnType<typeof evaluateVisitReview>, actions: string[], reviewModel: string | null, reviewSource: AppState['reviewSource'], appointment?: MedicalAppointment): VisitRecord {
  const now = new Date()
  const month = new Intl.DateTimeFormat('ko-KR', { month: 'long' }).format(now)
  const day = new Intl.DateTimeFormat('ko-KR', { day: '2-digit' }).format(now).replace('일', '').trim()
  return {
    id: createId(),
    patientName,
    date: new Intl.DateTimeFormat('ko-KR', { dateStyle: 'long', timeStyle: 'short' }).format(now),
    day,
    month,
    hospital: appointment?.hospital ?? '병원 정보 미입력',
    department: appointment?.department ?? '진료과 미입력',
    disease: appointment ? appointmentTypeLabels[appointment.type] : '진료 기록',
    summary,
    remembered: evaluation.remembered,
    corrected: evaluation.corrected,
    unanswered: evaluation.unanswered,
    actions,
    transcript: transcript || undefined,
    transcriptionModel: transcriptionModel ?? undefined,
    reviewModel: reviewModel ?? undefined,
    reviewSource,
    appointmentId: appointment?.id,
    createdAt: now.toISOString(),
  }
}

function createInviteCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const values = crypto.getRandomValues(new Uint8Array(6))
  return Array.from(values, (value) => alphabet[value % alphabet.length]).join('')
}

function inferTaskIcon(action: string): AppState['tasks'][number]['icon'] {
  if (/약|복용/.test(action)) return 'pill'
  if (/걷|산책|운동|스트레칭/.test(action)) return 'walk'
  return 'water'
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError'
}
