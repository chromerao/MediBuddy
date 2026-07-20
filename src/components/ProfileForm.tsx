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
        <span>{role === 'self' ? '이름' : '이 앱을 사용하는 분의 이름'}</span>
        <input id={`${idPrefix}-user-name`} type="text" value={profile.userName} onChange={(event) => changeUserName(event.target.value)} autoComplete="name" placeholder={role === 'self' ? '예: 김영희' : '예: 이민수'} maxLength={30} required />
      </label>

      {role === 'family' && (
        <>
          <label htmlFor={`${idPrefix}-patient-name`}>
            <span>진료받으실 가족의 이름</span>
            <input id={`${idPrefix}-patient-name`} type="text" value={profile.patientName} onChange={(event) => onChange({ ...profile, patientName: event.target.value })} placeholder="예: 김영희" maxLength={30} required />
          </label>
          <label htmlFor={`${idPrefix}-relationship`}>
            <span>진료받으실 가족과 나의 관계</span>
            <input id={`${idPrefix}-relationship`} type="text" value={profile.relationship} onChange={(event) => onChange({ ...profile, relationship: event.target.value })} placeholder="예: 어머니, 배우자, 자녀" maxLength={20} required />
          </label>
        </>
      )}

      <div className="profile-live-preview" aria-live="polite">
        <span aria-hidden="true">{displayPatientName.slice(0, 1)}</span>
        <div>
          <p className="eyebrow">입력한 내용을 확인해 주세요</p>
          <strong>{role === 'self' ? `${displayUserName} 님의 진료를 준비해요.` : `${displayUserName} 님이 ${displayPatientName} 님의 진료를 준비합니다.`}</strong>
          <small>{role === 'self' ? '내 건강 기록과 진료 일정을 관리합니다.' : `진료받으실 가족과의 관계: ${profile.relationship.trim() || '입력 전'}`}</small>
        </div>
        {role === 'family' ? <HeartHandshake aria-hidden="true" /> : <UserRound aria-hidden="true" />}
      </div>
    </div>
  )
}
