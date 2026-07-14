import { useState, type FormEvent } from 'react'
import { BookHeart, Check, Save, Users } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { ProfileForm } from '../components/ProfileForm'
import { isProfileComplete } from '../profiles'
import type { AppState, UserProfile } from '../types'

interface ProfileSettingsProps {
  role: AppState['role']
  profile: UserProfile
  onSave: (role: AppState['role'], profile: UserProfile) => void
  onBack: () => void
}

export function ProfileSettings({ role, profile, onSave, onBack }: ProfileSettingsProps) {
  const [draftRole, setDraftRole] = useState(role)
  const [draftProfile, setDraftProfile] = useState(profile)

  function changeRole(nextRole: AppState['role']) {
    setDraftRole(nextRole)
    setDraftProfile((current) => nextRole === 'self'
      ? { userName: current.userName, patientName: current.userName, relationship: '본인' }
      : { ...current, patientName: current.relationship === '본인' ? '' : current.patientName, relationship: current.relationship === '본인' ? '' : current.relationship })
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isProfileComplete(draftProfile, draftRole)) onSave(draftRole, draftProfile)
  }

  return (
    <div className="flow-page profile-settings-page">
      <PageHeader title="사용자 정보" onBack={onBack} />
      <section className="flow-intro"><p className="eyebrow">언제든 바꿀 수 있어요</p><h1>사용자와 진료 대상<br />정보를 관리하세요.</h1><p>변경하면 홈과 진료 준비 화면에 바로 적용됩니다.</p></section>
      <form className="profile-settings-form" onSubmit={submit}>
        <fieldset className="profile-role-options">
          <legend>사용 방식</legend>
          <label className={draftRole === 'self' ? 'is-selected' : ''}><input type="radio" name="profile-role" checked={draftRole === 'self'} onChange={() => changeRole('self')} /><BookHeart aria-hidden="true" /><span><strong>내 진료</strong><small>직접 사용해요</small></span>{draftRole === 'self' && <Check aria-hidden="true" />}</label>
          <label className={draftRole === 'family' ? 'is-selected' : ''}><input type="radio" name="profile-role" checked={draftRole === 'family'} onChange={() => changeRole('family')} /><Users aria-hidden="true" /><span><strong>가족 진료</strong><small>대신 준비해요</small></span>{draftRole === 'family' && <Check aria-hidden="true" />}</label>
        </fieldset>
        <ProfileForm role={draftRole} profile={draftProfile} onChange={setDraftProfile} idPrefix="settings" />
        <button className="button button--primary button--large" type="submit" disabled={!isProfileComplete(draftProfile, draftRole)}><Save aria-hidden="true" /> 사용자 정보 저장</button>
      </form>
    </div>
  )
}
