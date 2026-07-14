import { HeartHandshake, UserRound } from 'lucide-react'
import type { AppState, UserProfile } from '../types'

interface ProfileFormProps {
  role: AppState['role']
  profile: UserProfile
  onChange: (profile: UserProfile) => void
  idPrefix: string
}

export function ProfileForm({ role, profile, onChange, idPrefix }: ProfileFormProps) {
  function changeUserName(userName: string) {
    onChange(role === 'self'
      ? { userName, patientName: userName, relationship: '본인' }
      : { ...profile, userName })
  }

  const displayUserName = profile.userName.trim() || '사용자'
  const displayPatientName = role === 'self' ? displayUserName : profile.patientName.trim() || '가족'

  return (
    <div className="profile-form-fields">
      <label htmlFor={`${idPrefix}-user-name`}>
        <span>{role === 'self' ? '이름' : '메디버디를 사용하는 분의 이름'}</span>
        <input id={`${idPrefix}-user-name`} type="text" value={profile.userName} onChange={(event) => changeUserName(event.target.value)} autoComplete="name" placeholder="이름을 입력해 주세요" maxLength={30} required />
      </label>

      {role === 'family' && (
        <>
          <label htmlFor={`${idPrefix}-patient-name`}>
            <span>진료를 준비할 가족의 이름</span>
            <input id={`${idPrefix}-patient-name`} type="text" value={profile.patientName} onChange={(event) => onChange({ ...profile, patientName: event.target.value })} placeholder="가족의 이름을 입력해 주세요" maxLength={30} required />
          </label>
          <label htmlFor={`${idPrefix}-relationship`}>
            <span>나와의 관계</span>
            <input id={`${idPrefix}-relationship`} type="text" value={profile.relationship} onChange={(event) => onChange({ ...profile, relationship: event.target.value })} placeholder="예: 어머니, 배우자, 자녀" maxLength={20} required />
          </label>
        </>
      )}

      <div className="profile-live-preview" aria-live="polite">
        <span aria-hidden="true">{displayPatientName.slice(0, 1)}</span>
        <div>
          <p className="eyebrow">이렇게 표시할게요</p>
          <strong>{role === 'self' ? `${displayUserName} 님의 진료를 준비해요.` : `${displayUserName} 님이 ${displayPatientName} 님의 진료를 함께 준비해요.`}</strong>
          <small>{role === 'self' ? '내 건강 기록과 진료 일정을 관리합니다.' : `${profile.relationship.trim() || '가족 관계'}로 등록됩니다.`}</small>
        </div>
        {role === 'family' ? <HeartHandshake aria-hidden="true" /> : <UserRound aria-hidden="true" />}
      </div>
    </div>
  )
}
