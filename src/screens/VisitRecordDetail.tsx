import { CalendarDays, CheckCircle2, CircleAlert, FileText, HelpCircle, ListChecks, Printer, Stethoscope } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { PatientSummaryCard } from '../components/PatientSummaryCard'
import { SourceBadge } from '../components/SourceBadge'
import type { VisitRecord } from '../types'

interface VisitRecordDetailProps {
  record: VisitRecord
  onPrepareAgain: () => void
  onBack: () => void
}

export function VisitRecordDetail({ record, onPrepareAgain, onBack }: VisitRecordDetailProps) {
  return (
    <div className="flow-page visit-detail-page">
      <PageHeader title="진료 기록 상세" onBack={onBack} />
      <section className="visit-detail-hero">
        <span className="round-icon round-icon--soft"><Stethoscope /></span>
        <div><p className="eyebrow">기억 확인 완료</p><h1>{record.hospital} {record.department}</h1><p className="icon-text"><CalendarDays /> {record.date}</p><span>{record.disease}</span></div>
      </section>

      <PatientSummaryCard summary={record.summary} />

      {record.reviewSource && <div className="record-source"><SourceBadge>{record.reviewSource === 'ai' ? `전사 기반 AI 기억 확인${record.reviewModel ? ` · ${record.reviewModel}` : ''}` : '기본 기억 확인 질문'}</SourceBadge></div>}

      {record.transcript && (
        <section className="record-transcript-card">
          <div><FileText /><h2>전사된 진료 내용</h2>{record.transcriptionModel && <small>{record.transcriptionModel}</small>}</div>
          <p>{record.transcript}</p>
          <small>음성 전사는 잘못 들릴 수 있습니다. 중요한 의료 정보는 의료진의 안내를 기준으로 확인하세요.</small>
        </section>
      )}

      <section className="record-result-card record-result-card--success">
        <div><CheckCircle2 /><h2>잘 기억한 내용</h2></div>
        <ul>{record.remembered.length > 0 ? record.remembered.map((item) => <li key={item}>{item}</li>) : <li>저장된 항목이 없어요.</li>}</ul>
      </section>
      <section className="record-result-card record-result-card--warning">
        <div><CircleAlert /><h2>다시 확인한 내용</h2></div>
        <ul>{record.corrected.length > 0 ? record.corrected.map((item) => <li key={item}>{item}</li>) : <li>다시 확인한 항목이 없어요.</li>}</ul>
      </section>
      <section className="record-result-card record-result-card--neutral">
        <div><HelpCircle /><h2>다음에 확인할 질문</h2></div>
        <ul>{record.unanswered.length > 0 ? record.unanswered.map((item) => <li key={item}>{item}</li>) : <li>추가로 확인할 질문이 없어요.</li>}</ul>
      </section>
      <section className="record-actions-card">
        <div><ListChecks /><h2>의료수첩 실천 항목</h2></div>
        <ul>{record.actions.length > 0 ? record.actions.map((action) => <li key={action}>{action}</li>) : <li>전사에서 명확히 확인된 실천 항목이 없어요.</li>}</ul>
      </section>

      <div className="detail-actions">
        <button className="button button--secondary button--large" type="button" onClick={() => window.print()}><Printer /> 기록 인쇄하기</button>
        <button className="button button--primary button--large" type="button" onClick={onPrepareAgain}>이 기록으로 다음 진료 준비하기</button>
      </div>
    </div>
  )
}
