import { BookHeart, Check, HeartHandshake, Users } from 'lucide-react'
import { Brand } from '../components/Brand'

interface OnboardingProps {
  role: 'self' | 'family'
  onRoleChange: (role: 'self' | 'family') => void
  onStart: () => void
}

export function Onboarding({ role, onRoleChange, onStart }: OnboardingProps) {
  return (
    <main className="onboarding">
      <Brand />
      <section className="onboarding__hero">
        <span className="hero-mark" aria-hidden="true"><HeartHandshake size={46} /></span>
        <p className="eyebrow">진료 전부터 진료 후까지</p>
        <h1>진료를 더 잘 준비하고,<br />들은 내용을 함께 확인해요.</h1>
        <p>메디버디는 의료진을 대신하지 않아요. 짧은 진료에서 내 이야기를 놓치지 않도록 곁에서 돕습니다.</p>
      </section>

      <section aria-labelledby="role-title" className="role-section">
        <h2 id="role-title">누구를 위해 준비할까요?</h2>
        <div className="role-grid">
          <button
            type="button"
            className={role === 'self' ? 'role-card is-selected' : 'role-card'}
            onClick={() => onRoleChange('self')}
          >
            <span className="role-card__icon"><BookHeart /></span>
            <strong>내 진료 준비</strong>
            <span>제가 직접 사용할게요</span>
            {role === 'self' && <Check className="role-card__check" aria-label="선택됨" />}
          </button>
          <button
            type="button"
            className={role === 'family' ? 'role-card is-selected' : 'role-card'}
            onClick={() => onRoleChange('family')}
          >
            <span className="role-card__icon"><Users /></span>
            <strong>가족 진료 준비</strong>
            <span>부모님 대신 준비할게요</span>
            {role === 'family' && <Check className="role-card__check" aria-label="선택됨" />}
          </button>
        </div>
      </section>

      <button className="button button--primary button--large" type="button" onClick={onStart}>시작하기</button>
      <p className="onboarding__notice">진단·처방을 제공하지 않는 의료 소통 보조 서비스입니다.</p>
    </main>
  )
}
