import { Check, ChevronRight, Clock3, Link2, Send, ShieldCheck, UserRound, Users, X } from 'lucide-react'
import type { AppState, FamilyInvitation, FamilyMember, SharePreferences, UserProfile, VisitRecord } from '../types'

interface FamilyProps {
  role: AppState['role']
  profile: UserProfile
  preferences: SharePreferences
  onToggleSharing: (enabled: boolean) => void
  onPrepareForFamily: () => void
  onOpenShareSettings: () => void
  onInviteFamily: () => void
  members: FamilyMember[]
  pendingInvitations: FamilyInvitation[]
  sharedRecords: VisitRecord[]
  onCancelInvitation: (id: string) => void
  onOpenSharedVisit: (id: string) => void
}

export function Family({ role, profile, preferences, onToggleSharing, onPrepareForFamily, onOpenShareSettings, onInviteFamily, members, pendingInvitations, sharedRecords, onCancelInvitation, onOpenSharedVisit }: FamilyProps) {
  const targetName = role === 'family' ? profile.patientName : '가족'

  return (
    <div className="page-stack family-page">
      <section className="greeting greeting--compact"><p className="eyebrow">함께 돌보는 건강</p><h1>연결된 가족</h1><p>공유할 기록과 기간은 언제든 바꿀 수 있어요.</p></section>
      {role === 'family' && <div className="family-person-card family-person-card--profile">
        <span className="family-person-card__avatar"><UserRound aria-hidden="true" /></span><div><p className="eyebrow">내가 진료를 준비하는 가족</p><h2>{profile.relationship} · {profile.patientName}</h2><p>{profile.userName} 님의 메디버디에 등록됨</p></div><span className="connection-status"><Check aria-hidden="true" /> 등록됨</span>
      </div>}
      {members.length > 0 && <div className="family-member-list">{members.map((member) => <div className="family-person-card" key={member.id}>
        <span className="family-person-card__avatar"><UserRound /></span><div><p className="eyebrow">연결된 가족</p><h2>{member.relationship} · {member.name}</h2><p>{member.conditions.length > 0 ? `${member.conditions.join(' · ')} 관리 중` : '건강 기록 공유 중'}</p></div><span className="connection-status"><Check /> 연결됨</span>
      </div>)}</div>}
      {role === 'self' && members.length === 0 && <div className="family-empty"><Users aria-hidden="true" /><p><strong>아직 연결된 가족이 없어요.</strong><small>초대 링크를 보내 함께 기록을 확인할 수 있어요.</small></p></div>}
      <section className="share-card">
        <div className="share-card__heading"><span><ShieldCheck /></span><div><h2>기록 공유 설정</h2><p>진료 준비와 결과만 공유 중</p></div></div>
        <label className="toggle-row"><span><strong>진료 기록 공유</strong><small>질문 카드와 정리된 결과를 볼 수 있어요.</small></span><input type="checkbox" checked={preferences.enabled} onChange={(event) => onToggleSharing(event.target.checked)} /></label>
        <button className="text-row" type="button" onClick={onOpenShareSettings}><span><Link2 /> 공유 범위 자세히 보기</span><ChevronRight /></button>
      </section>
      <section className="family-action-card">
        <span className="round-icon"><Users /></span><div><p className="eyebrow">{targetName} 님의 진료 준비</p><h2>{targetName} 님의 진료를<br />미리 준비할까요?</h2><p>전화로 들은 증상을 대신 적고 질문 카드로 보내드릴 수 있어요.</p></div>
        <button className="button button--primary button--large" type="button" onClick={onPrepareForFamily}><Send /> 대신 준비하기</button>
      </section>
      {pendingInvitations.length > 0 && <section className="section-stack">
        <div className="section-heading"><h2>수락 대기 중인 초대</h2><span>{pendingInvitations.length}명</span></div>
        <div className="pending-invite-list">{pendingInvitations.map((invitation) => <div key={invitation.id}><span className="round-icon"><Clock3 /></span><p><strong>{invitation.name}</strong><small>{invitation.relationship} · 코드 {invitation.code}</small></p><button className="icon-button" type="button" onClick={() => onCancelInvitation(invitation.id)} aria-label={`${invitation.name} 초대 취소`}><X /></button></div>)}</div>
      </section>}
      {preferences.enabled && preferences.results && sharedRecords.length > 0 && <section className="section-stack">
        <div className="section-heading"><h2>가족과 공유된 진료 기록</h2><span>{sharedRecords.length}건</span></div>
        <div className="shared-record-list">{sharedRecords.slice(0, 3).map((record) => <button key={record.id} type="button" onClick={() => onOpenSharedVisit(record.id)}><span className="visit-record__date"><strong>{record.day}</strong><small>{record.month}</small></span><p><strong>{record.hospital} {record.department}</strong><small>{record.disease}</small></p><ChevronRight /></button>)}</div>
      </section>}
      <button className="button button--secondary button--large" type="button" onClick={onInviteFamily}><UserRound /> 다른 가족 초대하기</button>
    </div>
  )
}
