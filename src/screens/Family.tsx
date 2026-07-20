import { BookHeart, Check, ChevronRight, Clock3, Link2, Pill, RefreshCw, Send, ShieldCheck, UserRound, Users, X } from 'lucide-react'
import { useState } from 'react'
import { FeatureHub } from '../components/FeatureHub'
import { PageHeader } from '../components/PageHeader'
import { PatientSummaryCard } from '../components/PatientSummaryCard'
import type { AppState, FamilyInvitation, FamilyMember, SharedFamilyBundle, SharePreferences, UserProfile, VisitRecord } from '../types'

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
  sharedFamilyData: SharedFamilyBundle[]
  onRefreshShared: () => void
  onCancelInvitation: (id: string) => void
  onOpenSharedVisit: (id: string) => void
}

export function Family({ role, profile, preferences, onToggleSharing, onPrepareForFamily, onOpenShareSettings, onInviteFamily, members, pendingInvitations, sharedRecords, sharedFamilyData, onRefreshShared, onCancelInvitation, onOpenSharedVisit }: FamilyProps) {
  const targetName = role === 'family' ? profile.patientName : '가족'
  const [view, setView] = useState<'overview' | 'connections' | 'sharing' | 'received' | 'sent'>('overview')

  if (view === 'overview') {
    return (
      <div className="page-stack family-page">
        <section className="greeting greeting--compact"><p className="eyebrow">함께 돌보는 건강</p><h1>가족</h1><p>확인하거나 관리할 기능을 선택하세요.</p></section>
        <FeatureHub label="가족 기능" items={[
          { id: 'connections', label: '연결된 가족', description: '가족과 초대 상태 확인', icon: Users, badge: members.length || pendingInvitations.length ? `${members.length + pendingInvitations.length}` : undefined, onClick: () => setView('connections') },
          { id: 'sharing', label: '공유 설정', description: preferences.enabled ? '진료 기록 공유 중' : '공유 꺼짐', icon: Link2, onClick: () => setView('sharing') },
          { id: 'prepare', label: '대신 진료 준비', description: `${targetName} 님의 질문 카드`, icon: Send, onClick: onPrepareForFamily },
          { id: 'invite', label: '가족 초대하기', description: '초대 링크 또는 코드 만들기', icon: UserRound, onClick: onInviteFamily },
          { id: 'received', label: '받은 가족 기록', description: '가족이 공유한 진료 내용', icon: BookHeart, badge: sharedFamilyData.length ? `${sharedFamilyData.length}` : undefined, onClick: () => setView('received') },
          { id: 'sent', label: '공유 중인 내 기록', description: '가족에게 보이는 내 기록', icon: ShieldCheck, badge: sharedRecords.length ? `${sharedRecords.length}` : undefined, onClick: () => setView('sent') },
        ]} />
      </div>
    )
  }

  return (
    <div key={view} className="flow-page family-page page-transition">
      <PageHeader title={{ connections: '연결된 가족', sharing: '공유 설정', received: '받은 가족 기록', sent: '공유 중인 내 기록' }[view]} onBack={() => setView('overview')} />

      {view === 'connections' && <>
      {role === 'family' && <div className="family-person-card family-person-card--profile">
        <span className="family-person-card__avatar"><UserRound aria-hidden="true" /></span><div><p className="eyebrow">내가 진료를 준비하는 가족</p><h2>{profile.relationship} · {profile.patientName}</h2><p>{profile.userName} 님의 메디버디에 등록됨</p></div><span className="connection-status"><Check aria-hidden="true" /> 등록됨</span>
      </div>}
      {members.length > 0 && <div className="family-member-list">{members.map((member) => <div className="family-person-card" key={member.id}>
        <span className="family-person-card__avatar"><UserRound /></span><div><p className="eyebrow">연결된 가족</p><h2>{member.relationship} · {member.name}</h2><p>{member.conditions.length > 0 ? `${member.conditions.join(' · ')} 관리 중` : '건강 기록 공유 중'}</p></div><span className="connection-status"><Check /> 연결됨</span>
      </div>)}</div>}
      {role === 'self' && members.length === 0 && <div className="family-empty"><Users aria-hidden="true" /><p><strong>아직 연결된 가족이 없어요.</strong><small>초대 링크를 보내 함께 기록을 확인할 수 있어요.</small></p></div>}
      {pendingInvitations.length > 0 && <section className="section-stack">
        <div className="section-heading"><h2>수락 대기 중인 초대</h2><span>{pendingInvitations.length}명</span></div>
        <div className="pending-invite-list">{pendingInvitations.map((invitation) => <div key={invitation.id}><span className="round-icon"><Clock3 /></span><p><strong>{invitation.name}</strong><small>{invitation.relationship} · 코드 {invitation.code}</small></p><button className="icon-button" type="button" onClick={() => onCancelInvitation(invitation.id)} aria-label={`${invitation.name} 초대 취소`}><X /></button></div>)}</div>
      </section>}
      <button className="button button--secondary button--large" type="button" onClick={onInviteFamily}><UserRound /> 다른 가족 초대하기</button>
      </>}

      {view === 'sharing' && <section className="share-card">
        <div className="share-card__heading"><span><ShieldCheck /></span><div><h2>기록 공유 설정</h2><p>진료 준비와 결과만 공유 중</p></div></div>
        <label className="toggle-row"><span><strong>진료 기록 공유</strong><small>질문 카드와 정리된 결과를 볼 수 있어요.</small></span><input type="checkbox" checked={preferences.enabled} onChange={(event) => onToggleSharing(event.target.checked)} /></label>
        <button className="text-row" type="button" onClick={onOpenShareSettings}><span><Link2 /> 공유 범위 자세히 보기</span><ChevronRight /></button>
      </section>}

      {view === 'received' && <section className="section-stack shared-family-section">
        <div className="section-heading">
          <div><h2>가족에게 공유받은 기록</h2><span>{sharedFamilyData.length > 0 ? `${sharedFamilyData.length}명` : '공유 대기 중'}</span></div>
          <button className="heading-action" type="button" onClick={onRefreshShared}><RefreshCw aria-hidden="true" /> 새로고침</button>
        </div>
        {sharedFamilyData.length === 0 ? (
          <div className="family-empty"><BookHeart aria-hidden="true" /><p><strong>아직 공유받은 기록이 없어요.</strong><small>연결된 가족이 기록 공유를 켜면 이곳에서 확인할 수 있어요.</small></p></div>
        ) : sharedFamilyData.map((bundle) => (
          <article className="shared-family-bundle" key={bundle.ownerId}>
            <header><span className="family-person-card__avatar"><UserRound aria-hidden="true" /></span><div><p className="eyebrow">공유한 가족</p><h3>{bundle.ownerName} 님</h3><small>{durationLabel(bundle.duration)}</small></div></header>
            {bundle.preparations.map((preparation) => (
              <div className="shared-preparation" key={preparation.appointmentId}>
                <p className="shared-record-meta">{preparation.date} · {preparation.hospital} {preparation.department}</p>
                <PatientSummaryCard summary={preparation.summary} patientName={bundle.ownerName} />
              </div>
            ))}
            {bundle.visitRecords.map((record) => (
              <section className="remote-visit-card" key={record.id}>
                <p className="eyebrow">{record.date} · {record.hospital} {record.department}</p>
                <h4>{record.summary.symptom}</h4>
                {record.remembered.length > 0 && <p><strong>기억한 내용</strong>{record.remembered.join(' · ')}</p>}
                {record.unanswered.length > 0 && <p><strong>다시 확인할 내용</strong>{record.unanswered.join(' · ')}</p>}
                {record.actions.length > 0 && <p><strong>실천 항목</strong>{record.actions.join(' · ')}</p>}
              </section>
            ))}
            {(bundle.tasks.length > 0 || bundle.medications.length > 0 || bundle.healthLogs.length > 0) && (
              <div className="shared-daily-summary">
                {bundle.tasks.length > 0 && <p><Check aria-hidden="true" /><span><strong>실천 현황</strong>{bundle.tasks.filter((task) => task.completed).length}/{bundle.tasks.length} 완료</span></p>}
                {bundle.medications.length > 0 && <p><Pill aria-hidden="true" /><span><strong>등록한 복약</strong>{bundle.medications.map((medication) => medication.name).join(' · ')}</span></p>}
                {bundle.healthLogs.length > 0 && <p><BookHeart aria-hidden="true" /><span><strong>최근 건강 기록</strong>{bundle.healthLogs.slice(0, 3).map((log) => log.text).join(' · ')}</span></p>}
              </div>
            )}
          </article>
        ))}
      </section>}

      {view === 'sent' && preferences.enabled && preferences.results && sharedRecords.length > 0 && <section className="section-stack">
        <div className="section-heading"><h2>내가 가족에게 공유 중인 기록</h2><span>{sharedRecords.length}건</span></div>
        <div className="shared-record-list">{sharedRecords.map((record) => <button key={record.id} type="button" onClick={() => onOpenSharedVisit(record.id)}><span className="visit-record__date"><strong>{record.day}</strong><small>{record.month}</small></span><p><strong>{record.hospital} {record.department}</strong><small>{record.disease}</small></p><ChevronRight /></button>)}</div>
      </section>}
      {view === 'sent' && (!preferences.enabled || !preferences.results || sharedRecords.length === 0) && <div className="family-empty"><ShieldCheck aria-hidden="true" /><p><strong>가족에게 공유 중인 기록이 없어요.</strong><small>공유 설정에서 진료 결과 공유를 켜면 이곳에서 확인할 수 있어요.</small></p></div>}
    </div>
  )
}

function durationLabel(duration: SharedFamilyBundle['duration']) {
  if (duration === 'once') return '최근 진료 1건 공유'
  if (duration === '30days') return '최근 30일 기록 공유'
  return '연결을 해제할 때까지 공유'
}
