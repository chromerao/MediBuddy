import { ArrowLeft, Check, Edit3, Keyboard, LoaderCircle, Mic, MicOff, Share2, Sparkles, WifiOff } from 'lucide-react'
import { PatientSummaryCard } from '../components/PatientSummaryCard'
import { SourceBadge } from '../components/SourceBadge'
import { useServerSpeechInput } from '../hooks/useServerSpeechInput'
import type { AppStep, VisitSummary } from '../types'

interface PrepareVisitProps {
  step: Extract<AppStep, 'symptom' | 'review' | 'summary'>
  value: string
  summary: VisitSummary
  familyMode: boolean
  patientName: string
  onValueChange: (value: string) => void
  onReview: () => void
  onCreateCard: () => void
  onStartVisit: () => void
  onSaveCard: () => void
  onShareCard: () => void
  onBack: () => void
  isGenerating: boolean
  aiNotice: string
  aiModel: string | null
  appointmentLabel: string | null
  historyContextNote: string | null
}

export function PrepareVisit({ step, value, summary, familyMode, patientName, onValueChange, onReview, onCreateCard, onStartVisit, onSaveCard, onShareCard, onBack, isGenerating, aiNotice, aiModel, appointmentLabel, historyContextNote }: PrepareVisitProps) {
  const { isListening, isProcessing, error, supported, toggle } = useServerSpeechInput({ onResult: onValueChange })

  if (step === 'summary') {
    return (
      <div className="flow-page">
        <FlowHeader title="질문 카드가 준비됐어요" onBack={onBack} />
        {appointmentLabel && <div className="appointment-context">이 질문 카드의 일정 · {appointmentLabel}</div>}
        {familyMode && <div className="family-context">{patientName} 님을 위해 대신 작성 중입니다.</div>}
        <PatientSummaryCard summary={summary} patientName={patientName} familyAuthored={familyMode} generatedByAi={!aiNotice} />
        <div className="safety-note"><Check aria-hidden="true" /><p>입력하신 내용만 정리했어요. 진단이나 위험도 판단은 포함하지 않습니다.</p></div>
        <details className="secondary-actions">
          <summary>다른 작업</summary>
          <div>
            <button className="button button--quiet" type="button" onClick={onShareCard}>
              <Share2 aria-hidden="true" /> 가족에게 공유하기
            </button>
            {familyMode && <button className="button button--quiet" type="button" onClick={onSaveCard}>질문만 저장하고 나가기</button>}
          </div>
        </details>
        <div className="sticky-actions">
          <button className="button button--primary button--large" type="button" onClick={onStartVisit}>
            진료 기록 시작하기
          </button>
        </div>
      </div>
    )
  }

  if (step === 'review') {
    return (
      <div className="flow-page">
        <FlowHeader title="내용 확인" onBack={onBack} />
        <div className="progress-line"><span style={{ width: '66%' }} /></div>
        {aiNotice ? <div className="ai-fallback-notice"><WifiOff aria-hidden="true" /><p><strong>기본 정리 모드로 만들었어요.</strong><small>{aiNotice}</small></p></div> : <div className="ai-success-notice"><Sparkles aria-hidden="true" /><p><strong>AI가 진료 준비용으로 정리했어요.</strong><small>{aiModel ? `${aiModel} 구조화 출력` : '입력하신 사실만 사용했어요.'}</small></p></div>}
        <section className="flow-intro">
          <span className="round-icon round-icon--soft"><Sparkles /></span>
          <h1>말씀하신 내용을<br />이렇게 정리했어요.</h1>
          <p>다른 부분이 있으면 직접 고쳐 주세요.</p>
        </section>
        <section className="review-card">
          <div className="review-card__heading"><SourceBadge tone={familyMode ? 'family' : 'patient'}>{familyMode ? '가족이 대신 입력' : '내가 한 말'}</SourceBadge><Edit3 size={20} /></div>
          <textarea aria-label="입력 내용 수정" value={value} onChange={(event) => onValueChange(event.target.value)} />
        </section>
        <section className="ai-preview">
          <SourceBadge>{aiNotice ? '기본 정리 미리보기' : 'AI 정리 미리보기'}</SourceBadge>
          <h2>핵심 증상 정리</h2>
          <ul><li>{summary.symptom}</li><li>{summary.course}</li><li>{summary.measurement}</li></ul>
        </section>
        <div className="sticky-actions"><button className="button button--primary button--large" type="button" onClick={onCreateCard}>이 내용으로 질문 만들기</button></div>
      </div>
    )
  }

  return (
    <div className="flow-page symptom-page">
      <FlowHeader title="진료 준비" onBack={onBack} />
      <div className="progress-line"><span style={{ width: '33%' }} /></div>
      {appointmentLabel && <div className="appointment-context">준비 중인 일정 · {appointmentLabel}</div>}
      {familyMode && <div className="family-context">{patientName} 님을 위해 대신 작성 중입니다.</div>}
      <section className="flow-intro flow-intro--center">
        <p className="eyebrow">진료 전 · 편하게 말씀해 주세요</p>
        <h1>요즘 불편한 점이나<br />선생님께 말씀드리고 싶은<br />내용을 알려주세요.</h1>
        <p>말씀하셔도 되고, 아래 칸에 직접 적어도 괜찮아요.</p>
      </section>
      <button className={isListening ? 'voice-button is-listening' : 'voice-button'} type="button" onClick={toggle} aria-pressed={isListening} disabled={isProcessing}>
        <span>{isListening ? <MicOff /> : <Mic />}</span>
        <strong>{isProcessing ? '음성을 글로 바꾸는 중…' : isListening ? '듣기 멈추기' : '말로 입력하기'}</strong>
        <small>{supported ? '말을 마치면 다시 눌러 주세요' : '이 브라우저에서는 음성 녹음을 지원하지 않아요'}</small>
      </button>
      {error && <p className="inline-error" role="alert">{error}</p>}
      <div className="divider"><span>또는</span></div>
      <label className="text-input-card">
        <span><Keyboard size={20} /> 글로 입력하기</span>
        <textarea value={value} onChange={(event) => onValueChange(event.target.value)} placeholder="예: 요즘 새벽에 발이 저리고, 공복 혈당은 130이었어요." />
      </label>
      {historyContextNote && <p className="inline-notice">다음 질문을 만드는 데 함께 참고해요: {historyContextNote}</p>}
      <div className="sticky-actions"><button className="button button--primary button--large" type="button" onClick={onReview} disabled={!value.trim() || isGenerating || isListening || isProcessing}>{isGenerating ? <><LoaderCircle className="spin-icon" aria-hidden="true" /> AI가 질문을 정리하고 있어요</> : '입력 내용 확인하기'}</button></div>
    </div>
  )
}

interface FlowHeaderProps { title: string; onBack: () => void }

function FlowHeader({ title, onBack }: FlowHeaderProps) {
  return (
    <header className="flow-header">
      <button className="icon-button" type="button" onClick={onBack} aria-label="이전 화면"><ArrowLeft /></button>
      <strong>{title}</strong><span aria-hidden="true" />
    </header>
  )
}
