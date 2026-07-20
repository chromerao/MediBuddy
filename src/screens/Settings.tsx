import { Bell, Check, Cloud, Download, FileText, ShieldCheck, Type, UserRound } from 'lucide-react'
import { useState } from 'react'
import { FeatureHub } from '../components/FeatureHub'
import { PageHeader } from '../components/PageHeader'
import { disableBackgroundNotifications, enableBackgroundNotifications, getNotificationPermission, requestNotificationPermission } from '../notifications'
import type { AppState, AuthStatus, AuthUser, SyncStatus, UserProfile, UserSettings } from '../types'

interface SettingsProps {
  settings: UserSettings
  user: AuthUser | null
  authStatus: AuthStatus
  syncStatus: SyncStatus
  role: AppState['role']
  profile: UserProfile
  onChange: (settings: UserSettings) => void
  onOpenAccount: () => void
  onOpenProfile: () => void
  onExportData: () => void
  onBack: () => void
}

const fontOptions = [
  { value: 'normal' as const, label: '보통', example: '가나다' },
  { value: 'large' as const, label: '크게', example: '가나다' },
  { value: 'xlarge' as const, label: '아주 크게', example: '가나다' },
]

export function Settings({ settings, user, authStatus, syncStatus, role, profile, onChange, onOpenAccount, onOpenProfile, onExportData, onBack }: SettingsProps) {
  const [view, setView] = useState<'overview' | 'display' | 'notifications' | 'data' | 'about'>('overview')
  const [notificationPermission, setNotificationPermission] = useState(getNotificationPermission)
  const [backgroundNotice, setBackgroundNotice] = useState('')

  async function toggleReminder(key: 'appointmentReminders' | 'preparationReminders' | 'medicationReminders', enabled: boolean) {
    if (enabled) {
      const permission = await requestNotificationPermission()
      setNotificationPermission(permission)
      if (permission === 'granted') {
        try {
          setBackgroundNotice(await enableBackgroundNotifications())
        } catch (error) {
          setBackgroundNotice(error instanceof Error ? error.message : '백그라운드 알림을 등록하지 못했어요.')
        }
      }
    }
    const nextSettings = { ...settings, [key]: enabled }
    onChange(nextSettings)
    if (!nextSettings.appointmentReminders && !nextSettings.preparationReminders && !nextSettings.medicationReminders) {
      await disableBackgroundNotifications()
      setBackgroundNotice('백그라운드 알림을 해제했어요.')
    }
  }

  const reminderEnabled = settings.appointmentReminders || settings.preparationReminders || settings.medicationReminders
  const notificationHint = notificationPermission === 'unsupported'
    ? '이 브라우저는 알림을 지원하지 않아 앱을 열었을 때만 안내를 볼 수 있어요.'
    : notificationPermission === 'denied'
      ? '브라우저 알림이 차단되어 있어요. 주소창의 사이트 설정에서 알림을 허용해 주세요.'
      : notificationPermission === 'default' && reminderEnabled
        ? '알림을 받으려면 브라우저의 알림 허용을 눌러 주세요.'
        : ''

  const accountDescription = authStatus === 'checking'
    ? '계정 상태를 확인하고 있어요.'
    : user
      ? `${user.email} · ${syncStatus === 'syncing' ? '저장 중' : syncStatus === 'error' ? '저장 확인 필요' : '계정에 저장됨'}`
      : '로그인하고 기록을 계정에 안전하게 저장하세요.'

  if (view === 'overview') {
    return (
      <div className="flow-page settings-page">
        <PageHeader title="설정" onBack={onBack} />
        <section className="flow-intro"><p className="eyebrow">필요한 설정을 선택하세요</p><h1>무엇을 바꿀까요?</h1><p>각 기능을 별도 화면에서 편하게 설정할 수 있어요.</p></section>
        <FeatureHub label="설정 기능" items={[
          { id: 'profile', label: '사용자 정보', description: role === 'self' ? `${profile.userName} 님의 진료` : `${profile.patientName} 님의 진료`, icon: UserRound, onClick: onOpenProfile },
          { id: 'account', label: '계정과 저장', description: user ? '로그인 및 동기화 관리' : '로그인 또는 회원가입', icon: Cloud, onClick: onOpenAccount },
          { id: 'display', label: '글자 크기', description: `현재 ${fontOptions.find((option) => option.value === settings.fontSize)?.label}`, icon: Type, onClick: () => setView('display') },
          { id: 'notifications', label: '진료 알림', description: reminderEnabled ? '알림 사용 중' : '알림 꺼짐', icon: Bell, onClick: () => setView('notifications') },
          { id: 'data', label: '내 기록 보관', description: '기록 파일 내려받기', icon: Download, onClick: () => setView('data') },
          { id: 'about', label: '개인정보·서비스', description: '저장 방식과 서비스 안내', icon: ShieldCheck, onClick: () => setView('about') },
        ]} />
      </div>
    )
  }

  return (
    <div key={view} className="flow-page settings-page page-transition">
      <PageHeader title={{ display: '글자 크기', notifications: '진료 알림', data: '내 기록 보관', about: '개인정보·서비스' }[view]} onBack={() => setView('overview')} />

      {view === 'display' && <section className="settings-card">
        <div className="settings-card__title"><span className="round-icon"><Type /></span><div><h2>글자 크기</h2><p>선택하면 앱 전체에 바로 적용돼요.</p></div></div>
        <div className="font-options" role="radiogroup" aria-label="글자 크기">
          {fontOptions.map((option) => (
            <button key={option.value} type="button" role="radio" aria-checked={settings.fontSize === option.value} className={settings.fontSize === option.value ? 'font-option is-selected' : 'font-option'} onClick={() => onChange({ ...settings, fontSize: option.value })}>
              <span className={`font-sample font-sample--${option.value}`}>{option.example}</span><strong>{option.label}</strong>{settings.fontSize === option.value && <Check aria-hidden="true" />}
            </button>
          ))}
        </div>
      </section>}

      {view === 'notifications' && <section className="settings-card">
        <div className="settings-card__title"><span className="round-icon"><Bell /></span><div><h2>진료 알림</h2><p>필요한 순간에만 알려드려요.</p></div></div>
        <label className="toggle-row"><span><strong>진료 일정 알림</strong><small>진료 하루 전과 당일에 알려드려요.</small></span><input type="checkbox" checked={settings.appointmentReminders} onChange={(event) => toggleReminder('appointmentReminders', event.target.checked)} /></label>
        <label className="toggle-row"><span><strong>진료 준비 알림</strong><small>기록이 없으면 질문 준비를 안내해요.</small></span><input type="checkbox" checked={settings.preparationReminders} onChange={(event) => toggleReminder('preparationReminders', event.target.checked)} /></label>
        <label className="toggle-row"><span><strong>복약 알림</strong><small>복용 시간이 지나면 약 챙기기를 알려드려요.</small></span><input type="checkbox" checked={settings.medicationReminders} onChange={(event) => toggleReminder('medicationReminders', event.target.checked)} /></label>
        {notificationHint && <p className="inline-notice" role="status">{notificationHint}</p>}
        {backgroundNotice && <p className="inline-notice" role="status">{backgroundNotice}</p>}
      </section>}

      {view === 'data' && <section className="settings-card">
        <div className="settings-card__title"><span className="round-icon"><Download /></span><div><h2>내 기록 내려받기</h2><p>진료 기록과 설정을 파일 하나로 보관할 수 있어요.</p></div></div>
        <button className="button button--secondary button--large" type="button" onClick={onExportData}><Download aria-hidden="true" /> 내 기록 파일로 내려받기</button>
      </section>}

      {view === 'about' && <section className="settings-card settings-info">
        <div><ShieldCheck /><p><strong>개인정보 처리 안내</strong><small>녹음 원본은 저장하지 않으며, 글로 바꾼 내용과 진료 기록은 기록 상세 화면에서 직접 삭제할 수 있습니다.</small></p></div>
        <div><FileText /><p><strong>서비스 정보</strong><small>메디버디 데모 0.1.0 · 진단·처방을 제공하지 않습니다.</small></p></div>
        <div><Cloud /><p><strong>계정 저장 상태</strong><small>{accountDescription}</small></p></div>
      </section>}
    </div>
  )
}
