import { CalendarDays, HelpCircle, Pill, Stethoscope } from 'lucide-react'
import type { VisitSummary } from '../types'
import { SourceBadge } from './SourceBadge'

interface PatientSummaryCardProps {
  summary: VisitSummary
  familyAuthored?: boolean
  generatedByAi?: boolean
}

export function PatientSummaryCard({ summary, familyAuthored = false, generatedByAi = true }: PatientSummaryCardProps) {
  return (
    <article className="summary-card" aria-label="진료 준비 상태 카드">
      <div className="summary-card__header">
        <div>
          <p className="eyebrow">진료 준비 상태 카드</p>
          <h2>환자 김영희</h2>
          <p className="summary-card__meta"><CalendarDays size={18} /> 성모병원 내과 · 10월 25일</p>
        </div>
        <span className="summary-card__hospital" aria-hidden="true"><Stethoscope /></span>
      </div>

      <div className="summary-card__section">
        <h3>오늘 꼭 말씀드릴 점</h3>
        <p>{summary.symptom}</p>
        <p className="muted">{summary.course}</p>
      </div>

      <div className="summary-card__section summary-card__measurement">
        <Pill size={22} aria-hidden="true" />
        <div><h3>복약·측정 수치</h3><p>{summary.measurement}</p></div>
      </div>

      <div className="summary-card__section">
        <h3><HelpCircle size={22} aria-hidden="true" /> 의료진에게 물을 질문 3개</h3>
        <ol className="question-list">
          {summary.questions.map((question, index) => (
            <li key={question}><span>{index + 1}</span><p>{question}</p></li>
          ))}
        </ol>
      </div>

      <div className="summary-card__footer">
        <SourceBadge tone={familyAuthored ? 'family' : 'patient'}>{familyAuthored ? '가족이 대신 입력' : '환자가 직접 입력'}</SourceBadge>
        <SourceBadge>{generatedByAi ? 'AI가 진료 준비용으로 정리' : '기본 규칙으로 정리'}</SourceBadge>
      </div>
    </article>
  )
}
