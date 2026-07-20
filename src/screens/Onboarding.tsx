import { useState, type FormEvent } from 'react'
import { ArrowLeft, ArrowRight, BookHeart, Check, HeartHandshake, Users } from 'lucide-react'
import { Brand } from '../components/Brand'
import { ProfileForm } from '../components/ProfileForm'
import { isProfileComplete } from '../profiles'
import type { UserProfile } from '../types'

interface OnboardingProps {
  role: 'self' | 'family'
  profile: UserProfile
  onRoleChange: (role: 'self' | 'family') => void
  onProfileChange: (profile: UserProfile) => void
  onStart: () => void
}

export function Onboarding({ role, profile, onRoleChange, onProfileChange, onStart }: OnboardingProps) {
  const [stage, setStage] = useState<'role' | 'profile'>('role')

  function selectRole(nextRole: 'self' | 'family') {
    onRoleChange(nextRole)
    if (nextRole === 'self') {
      onProfileChange({ userName: profile.userName, patientName: profile.userName, relationship: '본인' })
    } else if (profile.relationship === '본인') {
      onProfileChange({ ...profile, patientName: '', relationship: '' })
    }
  }

  function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isProfileComplete(profile, role)) onStart()
  }

  return (
    <main className="onboarding">
      <Brand />
      <div className="onboarding-progress" aria-label={`초기 설정 ${stage === 'role' ? '1' : '2'}단계 중 2단계`}><span className="is-current">1</span><i /><span className={stage === 'profile' ? 'is-current' : ''}>2</span></div>

      {stage === 'role' ? (
        <>
          <section className="onboarding__hero">
            <span className="hero-mark" aria-hidden="true"><HeartHandshake size={46} /></span>
            <p className="eyebrow">진료 전부터 진료 후까지</p>
            <h1>진료를 더 잘 준비하고,<br />들은 내용을 함께 확인해요.</h1>
            <p>로그인하지 않아도 먼저 사용할 수 있어요. 간단한 정보만 등록하면 내 상황에 맞게 화면을 구성합니다.</p>
          </section>
          <section aria-labelledby="role-title" className="role-section">
            <h2 id="role-title">누구를 위해 준비할까요?</h2>
            <div className="role-grid">
              <button type="button" aria-pressed={role === 'self'} className={role === 'self' ? 'role-card is-selected' : 'role-card'} onClick={() => selectRole('self')}>
                <span className="role-card__icon"><BookHeart aria-hidden="true" /></span><strong>내 진료 준비</strong><span>제가 직접 사용할게요</span>{role === 'self' && <Check className="role-card__check" aria-label="선택됨" />}
              </button>
              <button type="button" aria-pressed={role === 'family'} className={role === 'family' ? 'role-card is-selected' : 'role-card'} onClick={() => selectRole('family')}>
                <span className="role-card__icon"><Users aria-hidden="true" /></span><strong>가족 진료 준비</strong><span>가족 대신 준비할게요</span>{role === 'family' && <Check className="role-card__check" aria-label="선택됨" />}
              </button>
            </div>
          </section>
          <button className="button button--primary button--large" type="button" onClick={() => setStage('profile')}>{role === 'self' ? '내 정보 등록하기' : '가족 정보 등록하기'} <ArrowRight aria-hidden="true" /></button>
        </>
      ) : (
        <form className="onboarding-profile" onSubmit={submitProfile}>
          <section className="onboarding__hero onboarding__hero--compact">
            <span className="hero-mark hero-mark--small" aria-hidden="true"><Users size={34} /></span>
            <p className="eyebrow">나에게 맞는 메디버디</p>
            <h1>{role === 'self' ? '어떻게 불러드릴까요?' : '누구의 진료를 준비하시나요?'}</h1>
            <p>{role === 'self' ? '사용하실 분의 이름을 적어 주세요.' : '병원에서 진료를 받으실 가족의 이름을 적어 주세요.'}</p>
          </section>
          <ProfileForm role={role} profile={profile} onChange={onProfileChange} idPrefix="onboarding" />
          <p className="profile-storage-note">입력한 정보는 로그인 전에는 이 브라우저에만 저장됩니다.</p>
          <div className="onboarding-profile__actions">
            <button className="button button--secondary" type="button" onClick={() => setStage('role')}><ArrowLeft aria-hidden="true" /> 이전</button>
            <button className="button button--primary" type="submit" disabled={!isProfileComplete(profile, role)}>{role === 'family' ? (profile.patientName.trim() ? `${profile.patientName.trim()} 님 진료 준비하기` : '가족 진료 준비하기') : '등록하고 시작하기'} <Check aria-hidden="true" /></button>
          </div>
        </form>
      )}

      <p className="onboarding__notice">진단·처방을 제공하지 않는 의료 소통 보조 서비스입니다.</p>
    </main>
  )
}
