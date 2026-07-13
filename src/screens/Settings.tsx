import { Bell, Check, ChevronRight, Cloud, FileText, ShieldCheck, Type, UserRound } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import type { AuthStatus, AuthUser, SyncStatus, UserSettings } from '../types'

interface SettingsProps {
  settings: UserSettings
  user: AuthUser | null
  authStatus: AuthStatus
  syncStatus: SyncStatus
  onChange: (settings: UserSettings) => void
  onOpenAccount: () => void
  onBack: () => void
}

const fontOptions = [
  { value: 'normal' as const, label: '보통', example: '가나다' },
  { value: 'large' as const, label: '크게', example: '가나다' },
  { value: 'xlarge' as const, label: '아주 크게', example: '가나다' },
]

export function Settings({ settings, user, authStatus, syncStatus, onChange, onOpenAccount, onBack }: SettingsProps) {
  const accountDescription = authStatus === 'checking'
    ? '계정 상태를 확인하고 있어요.'
    : user
      ? `${user.email} · ${syncStatus === 'syncing' ? '저장 중' : syncStatus === 'error' ? '저장 확인 필요' : '계정에 저장됨'}`
      : '로그인하고 기록을 계정에 안전하게 저장하세요.'

  return (
    <div className="flow-page settings-page">
      <PageHeader title="설정" onBack={onBack} />
      <section className="flow-intro"><p className="eyebrow">보기 편하게 조정해요</p><h1>나에게 맞는 화면과<br />알림을 설정하세요.</h1></section>

      <section className="settings-card">
        <div className="settings-card__title"><span className="round-icon"><Cloud /></span><div><h2>계정과 저장</h2><p>기기와 브라우저가 바뀌어도 기록을 이어가요.</p></div></div>
        <button className="account-entry" type="button" onClick={onOpenAccount}>
          <span className="account-entry__icon"><UserRound aria-hidden="true" /></span>
          <span className="account-entry__text"><strong>{user ? '내 계정 관리' : '로그인 또는 회원가입'}</strong><small>{accountDescription}</small></span>
          <ChevronRight aria-hidden="true" />
        </button>
      </section>

      <section className="settings-card">
        <div className="settings-card__title"><span className="round-icon"><Type /></span><div><h2>글자 크기</h2><p>선택하면 앱 전체에 바로 적용돼요.</p></div></div>
        <div className="font-options" role="radiogroup" aria-label="글자 크기">
          {fontOptions.map((option) => (
            <button key={option.value} type="button" role="radio" aria-checked={settings.fontSize === option.value} className={settings.fontSize === option.value ? 'font-option is-selected' : 'font-option'} onClick={() => onChange({ ...settings, fontSize: option.value })}>
              <span className={`font-sample font-sample--${option.value}`}>{option.example}</span><strong>{option.label}</strong>{settings.fontSize === option.value && <Check aria-hidden="true" />}
            </button>
          ))}
        </div>
      </section>

      <section className="settings-card">
        <div className="settings-card__title"><span className="round-icon"><Bell /></span><div><h2>진료 알림</h2><p>필요한 순간에만 알려드려요.</p></div></div>
        <label className="toggle-row"><span><strong>진료 일정 알림</strong><small>진료 하루 전과 당일에 알려드려요.</small></span><input type="checkbox" checked={settings.appointmentReminders} onChange={(event) => onChange({ ...settings, appointmentReminders: event.target.checked })} /></label>
        <label className="toggle-row"><span><strong>진료 준비 알림</strong><small>기록이 없으면 질문 준비를 안내해요.</small></span><input type="checkbox" checked={settings.preparationReminders} onChange={(event) => onChange({ ...settings, preparationReminders: event.target.checked })} /></label>
      </section>

      <section className="settings-card settings-info">
        <div><ShieldCheck /><p><strong>개인정보 처리 안내</strong><small>녹음은 기억 확인 후 원본을 삭제합니다.</small></p></div>
        <div><FileText /><p><strong>서비스 정보</strong><small>메디버디 데모 0.1.0 · 진단·처방을 제공하지 않습니다.</small></p></div>
      </section>
    </div>
  )
}
