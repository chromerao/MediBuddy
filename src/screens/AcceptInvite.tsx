import { Check, LogIn, ShieldCheck, UserRound, X } from 'lucide-react'
import { Brand } from '../components/Brand'
import type { FamilyInvitation } from '../types'

interface AcceptInviteProps {
  invitation: FamilyInvitation | null
  needsLogin: boolean
  onAccept: () => void
  onDecline: () => void
}

export function AcceptInvite({ invitation, needsLogin, onAccept, onDecline }: AcceptInviteProps) {
  if (!invitation) {
    return (
      <main className="invite-accept-page">
        <Brand />
        <section className="invite-accept-card">
          <span className="hero-mark hero-mark--small"><X /></span>
          <h1>유효하지 않은<br />초대 링크예요.</h1>
          <p>초대가 취소됐거나 이미 사용된 링크일 수 있어요.{needsLogin && <><br />초대를 받은 계정으로 로그인한 뒤 링크를 다시 열어 주세요.</>}</p>
          <button className="button button--secondary button--large" type="button" onClick={onDecline}>메디버디로 돌아가기</button>
        </section>
      </main>
    )
  }

  return (
    <main className="invite-accept-page">
      <Brand />
      <section className="invite-accept-card">
        <span className="hero-mark hero-mark--small"><UserRound /></span>
        <p className="eyebrow">가족 연결 초대</p>
        <h1>{invitation.name} 님,<br />가족과 건강 기록을<br />함께 보시겠어요?</h1>
        <div className="accept-summary"><ShieldCheck /><p><strong>동의한 기록만 공유돼요.</strong><small>연결 후에도 공유 범위를 변경하거나 연결을 해제할 수 있어요.</small></p></div>
        {needsLogin && <div className="accept-summary"><LogIn /><p><strong>이 브라우저에서만 연결돼요.</strong><small>다른 기기에서도 이어 보려면 로그인 후 초대 링크를 다시 열어 주세요.</small></p></div>}
        <button className="button button--primary button--large" type="button" onClick={onAccept}><Check /> 동의하고 가족 연결하기</button>
        <button className="button button--quiet" type="button" onClick={onDecline}>지금은 연결하지 않기</button>
      </section>
    </main>
  )
}
