import { Check, Clipboard, Link2, ShieldCheck, UserPlus, X } from 'lucide-react'
import { useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import type { FamilyInvitation } from '../types'

interface FamilyInviteProps {
  pendingInvitations: FamilyInvitation[]
  isAccountConnected: boolean
  onCreate: (name: string, relationship: string) => Promise<FamilyInvitation>
  onCancel: (id: string) => void
  onBack: () => void
}

function getInviteUrl(code: string) {
  const url = new URL(window.location.href)
  url.search = ''
  url.hash = ''
  url.searchParams.set('invite', code)
  return url.toString()
}

export function FamilyInvite({ pendingInvitations, isAccountConnected, onCreate, onCancel, onBack }: FamilyInviteProps) {
  const [name, setName] = useState('')
  const [relationship, setRelationship] = useState('자녀')
  const [created, setCreated] = useState<FamilyInvitation | null>(pendingInvitations[0] ?? null)
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'manual'>('idle')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  async function createInvitation() {
    if (!name.trim() || creating) return
    setCreating(true)
    setCreateError('')
    try {
      setCreated(await onCreate(name.trim(), relationship))
      setCopyStatus('idle')
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : '초대를 만들지 못했어요. 잠시 후 다시 시도해 주세요.')
    } finally {
      setCreating(false)
    }
  }

  async function copyInvite() {
    if (!created) return
    const inviteUrl = getInviteUrl(created.code)
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopyStatus('copied')
    } catch {
      setCopyStatus('manual')
    }
  }

  return (
    <div className="flow-page invite-page">
      <PageHeader title="가족 초대" onBack={onBack} />
      <section className="flow-intro flow-intro--center"><span className="hero-mark hero-mark--small"><UserPlus /></span><p className="eyebrow">함께 관리하는 건강</p><h1>가족에게 초대 링크를<br />보내 주세요.</h1><p>초대를 받은 가족이 동의해야 기록이 연결돼요.</p></section>

      {!created ? (
        <section className="invite-form">
          <label><span>초대할 가족 이름</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="예: 김민수" autoComplete="name" /></label>
          <label><span>나와의 관계</span><select value={relationship} onChange={(event) => setRelationship(event.target.value)}><option>자녀</option><option>배우자</option><option>부모</option><option>형제·자매</option><option>기타 가족</option></select></label>
          {createError && <p className="inline-error" role="alert">{createError}</p>}
          {!isAccountConnected && <p className="inline-notice">지금은 로그인하지 않아 초대 링크가 이 브라우저에서만 동작해요. 다른 기기의 가족을 초대하려면 먼저 로그인해 주세요.</p>}
          <button className="button button--primary button--large" type="button" disabled={!name.trim() || creating} onClick={createInvitation}><Link2 /> {creating ? '초대 만드는 중…' : '초대 링크 만들기'}</button>
        </section>
      ) : (
        <section className="invite-card">
          <div className="invite-person"><span className="round-icon"><UserPlus /></span><p><strong>{created.name}</strong><small>{created.relationship} · 수락 대기 중</small></p></div>
          <div className="invite-card__code"><span>초대 코드</span><strong>{created.code}</strong></div>
          <label className="invite-link"><Link2 /><input aria-label="초대 링크" readOnly value={getInviteUrl(created.code)} onFocus={(event) => event.target.select()} /></label>
          {copyStatus === 'manual' && <p className="inline-error">자동 복사가 제한됐어요. 위 링크를 길게 눌러 복사해 주세요.</p>}
          <button className="button button--primary button--large" type="button" onClick={copyInvite}>{copyStatus === 'copied' ? <Check /> : <Clipboard />}{copyStatus === 'copied' ? '초대 링크를 복사했어요' : '초대 링크 복사하기'}</button>
          <button className="button button--quiet" type="button" onClick={() => { onCancel(created.id); setCreated(null) }}><X /> 이 초대 취소하기</button>
        </section>
      )}

      <div className="privacy-list"><div><span><Check /></span><p><strong>상대방 동의 후 연결</strong><small>초대 링크만으로 기록이 바로 공개되지 않아요.</small></p></div><div><span><ShieldCheck /></span><p><strong>공유 범위 선택 가능</strong><small>연결 후에도 보여줄 기록을 직접 선택할 수 있어요.</small></p></div></div>
    </div>
  )
}
