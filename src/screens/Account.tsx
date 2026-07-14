import { useState, type FormEvent } from 'react'
import { Cloud, LoaderCircle, LogIn, LogOut, ShieldCheck, Trash2, UserRound } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import type { AuthStatus, AuthUser, SyncStatus } from '../types'

interface AccountProps {
  user: AuthUser | null
  authStatus: AuthStatus
  syncStatus: SyncStatus
  onLogin: (email: string, password: string) => Promise<void>
  onSignUp: (email: string, password: string) => Promise<void>
  onLogout: () => Promise<void>
  onDeleteAccount: () => Promise<void>
  onBack: () => void
}

const syncLabels: Record<SyncStatus, string> = {
  idle: '계정 저장 준비됨',
  syncing: '변경사항 저장 중',
  saved: '모든 기록이 저장됨',
  error: '저장 연결을 확인해 주세요',
}

export function Account({ user, authStatus, syncStatus, onLogin, onSignUp, onLogout, onDeleteAccount, onBack }: AccountProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      if (mode === 'login') await onLogin(email, password)
      else await onSignUp(email, password)
      setPassword('')
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '계정 요청을 처리하지 못했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleLogout() {
    setSubmitting(true)
    setError('')
    try {
      await onLogout()
    } catch (logoutError) {
      setError(logoutError instanceof Error ? logoutError.message : '로그아웃하지 못했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeleteAccount() {
    if (!window.confirm('계정과 서버에 저장된 모든 진료 기록·가족 연결이 삭제됩니다. 계속할까요?')) return
    if (!window.confirm('삭제한 기록은 되돌릴 수 없어요. 정말 삭제할까요?')) return
    setSubmitting(true)
    setError('')
    try {
      await onDeleteAccount()
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : '계정을 삭제하지 못했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flow-page account-page">
      <PageHeader title="계정과 저장" onBack={onBack} />
      <section className="flow-intro">
        <p className="eyebrow">기록을 안전하게 이어가요</p>
        <h1>내 계정에서<br />진료 기록을 관리하세요.</h1>
        <p>로그인하면 이 브라우저에만 있던 기록도 계정에 처음 한 번 옮겨집니다.</p>
      </section>

      {authStatus === 'checking' && (
        <section className="account-card account-card--center" aria-live="polite">
          <LoaderCircle className="spin-icon" aria-hidden="true" />
          <strong>계정 상태를 확인하고 있어요.</strong>
        </section>
      )}

      {authStatus === 'authenticated' && user && (
        <section className="account-card">
          <div className="account-profile">
            <span className="round-icon round-icon--soft"><UserRound aria-hidden="true" /></span>
            <p><small>로그인된 계정</small><strong>{user.email}</strong></p>
          </div>
          <div className={`sync-status sync-status--${syncStatus}`} role="status">
            {syncStatus === 'syncing' ? <LoaderCircle className="spin-icon" aria-hidden="true" /> : <Cloud aria-hidden="true" />}
            <span><strong>{syncLabels[syncStatus]}</strong><small>의료수첩·가족 설정·화면 설정을 계정별로 보관합니다.</small></span>
          </div>
          {error && <p className="inline-error" role="alert">{error}</p>}
          <button className="button button--secondary button--large" type="button" disabled={submitting} onClick={handleLogout}>
            <LogOut aria-hidden="true" /> 로그아웃
          </button>
          <button className="button button--quiet" type="button" disabled={submitting} onClick={handleDeleteAccount}>
            <Trash2 aria-hidden="true" /> 계정과 모든 기록 삭제하기
          </button>
        </section>
      )}

      {authStatus === 'anonymous' && (
        <section className="account-card">
          <div className="account-tabs" aria-label="계정 방식">
            <button type="button" aria-pressed={mode === 'login'} className={mode === 'login' ? 'is-active' : ''} onClick={() => { setMode('login'); setError('') }}>로그인</button>
            <button type="button" aria-pressed={mode === 'signup'} className={mode === 'signup' ? 'is-active' : ''} onClick={() => { setMode('signup'); setError('') }}>회원가입</button>
          </div>

          <form className="account-form" onSubmit={handleSubmit}>
            <label>
              <span>이메일</span>
              <input type="email" name="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" autoCapitalize="none" spellCheck={false} placeholder="name@example.com" required />
            </label>
            <label>
              <span>비밀번호</span>
              <input type="password" name="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={8} maxLength={128} placeholder="8자 이상 입력" required />
            </label>
            {error && <p className="inline-error" role="alert">{error}</p>}
            <button className="button button--primary button--large" type="submit" disabled={submitting}>
              {submitting ? <LoaderCircle className="spin-icon" aria-hidden="true" /> : <LogIn aria-hidden="true" />}
              {mode === 'login' ? '로그인하고 기록 불러오기' : '계정 만들고 기록 저장하기'}
            </button>
          </form>

          <div className="account-security-note">
            <ShieldCheck aria-hidden="true" />
            <p><strong>비밀번호와 로그인 정보는 안전하게 처리해요.</strong><small>비밀번호 원문은 저장하지 않고, 로그인 세션은 브라우저의 보호된 쿠키로만 관리합니다.</small></p>
          </div>
        </section>
      )}
    </div>
  )
}
