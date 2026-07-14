import { ArrowLeft, CalendarDays, Check, CheckCircle2, CircleAlert, Clock3, FileText, HelpCircle, ListChecks, LockKeyhole, Mic, ShieldCheck, Sparkles, Square, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { generatePostVisitReview, transcribeVisitAudio } from '../api'
import { appointmentTypeLabels, formatAppointmentDate } from '../appointments'
import { SourceBadge } from '../components/SourceBadge'
import { evaluateVisitReview } from '../data'
import { useVisitRecorder } from '../hooks/useVisitRecorder'
import type { AppStep, MedicalAppointment, QuizAnswer, ReviewSource, VisitReview, VisitSummary } from '../types'

interface VisitFlowProps {
  step: Extract<AppStep, 'consent' | 'recording' | 'processing' | 'quiz' | 'results'>
  summary: VisitSummary
  consented: boolean
  answers: QuizAnswer[]
  transcript: string
  transcriptionModel: string | null
  review: VisitReview | null
  reviewModel: string | null
  reviewSource: ReviewSource
  upcomingAppointments: MedicalAppointment[]
  selectedAppointmentId: string | null
  onSelectAppointment: (appointmentId: string | null) => void
  onConsentChange: (value: boolean) => void
  onStepChange: (step: AppStep) => void
  onAnswer: (answer: QuizAnswer) => void
  onTranscriptionComplete: (transcript: string, model: string | null) => void
  onReviewComplete: (review: VisitReview | null, model: string | null, source: ReviewSource) => void
  onSaveResults: () => void
  onBack: () => void
}

type ProcessingState = 'idle' | 'transcribing' | 'generating' | 'ready' | 'error' | 'review-error'

export function VisitFlow({ step, summary, consented, answers, transcript, transcriptionModel, review, reviewModel, upcomingAppointments, selectedAppointmentId, onSelectAppointment, onConsentChange, onStepChange, onAnswer, onTranscriptionComplete, onReviewComplete, onSaveResults, onBack }: VisitFlowProps) {
  const recorder = useVisitRecorder()
  const [quizIndex, setQuizIndex] = useState(answers.length)
  const [processingState, setProcessingState] = useState<ProcessingState>('idle')
  const [processingError, setProcessingError] = useState('')
  const audioRef = useRef<Blob | null>(null)

  async function startRecording() {
    audioRef.current = null
    setProcessingState('idle')
    setProcessingError('')
    onTranscriptionComplete('', null)
    onReviewComplete(null, null, 'none')
    await recorder.start()
  }

  async function finishRecording() {
    setProcessingState('transcribing')
    setProcessingError('')
    onStepChange('processing')
    const audio = await recorder.stop()
    if (!audio) {
      setProcessingState('error')
      setProcessingError('녹음된 음성이 없습니다. 다시 녹음해 주세요.')
      return
    }
    audioRef.current = audio
    await runTranscription(audio)
  }

  async function runTranscription(audio: Blob) {
    setProcessingState('transcribing')
    setProcessingError('')
    try {
      const result = await transcribeVisitAudio(audio)
      onTranscriptionComplete(result.transcript, result.model)
      audioRef.current = null
      recorder.destroyRecording()
      await runReviewGeneration(result.transcript)
    } catch (error) {
      setProcessingState('error')
      setProcessingError(error instanceof Error ? error.message : '음성을 글로 바꾸지 못했습니다.')
    }
  }

  async function runReviewGeneration(visitTranscript: string) {
    setProcessingState('generating')
    setProcessingError('')
    try {
      const result = await generatePostVisitReview(visitTranscript, summary.questions)
      onReviewComplete(result.review, result.model, 'ai')
      setProcessingState('ready')
    } catch (error) {
      // 실제 진료와 무관한 고정 질문을 보여주지 않기 위해, 실패 시에는
      // 전사문 확인·질문 생성 재시도·전사문만 저장·다시 녹음만 제공한다.
      onReviewComplete(null, null, 'none')
      setProcessingState('review-error')
      setProcessingError(error instanceof Error ? error.message : '기억 확인 질문을 만들지 못했습니다.')
    }
  }

  function recordAgain() {
    audioRef.current = null
    recorder.destroyRecording()
    setProcessingState('idle')
    setProcessingError('')
    onTranscriptionComplete('', null)
    onReviewComplete(null, null, 'none')
    onStepChange('recording')
  }

  function retryTranscription() {
    const audio = audioRef.current
    if (audio) void runTranscription(audio)
  }

  if (step === 'consent') {
    return (
      <div className="flow-page consent-page">
        <FlowHeader title="진료 기록 안내" onBack={onBack} />
        <section className="flow-intro flow-intro--center">
          <span className="hero-mark hero-mark--small"><ShieldCheck /></span>
          <h1>진료 기록을<br />도와드릴까요?</h1>
          <p>진료 내용을 녹음해 기억 확인 질문을 만들어요.</p>
        </section>
        <div className="privacy-list">
          <div><span><Mic /></span><p><strong>기억 확인에만 사용</strong><small>진료 내용을 글로 바꾸고 질문을 만드는 데 사용해요.</small></p></div>
          <div><span><LockKeyhole /></span><p><strong>글로 바꿀 때만 전송</strong><small>원본 녹음은 글로 바꾸기 위해 서버와 OpenAI API로 전송해요.</small></p></div>
          <div><span><Trash2 /></span><p><strong>앱에 원본을 저장하지 않음</strong><small>글로 바꾸고 나면 앱에는 녹음 파일 대신 바뀐 글만 남겨요.</small></p></div>
        </div>
        {upcomingAppointments.length > 0 && (
          <section className="appointment-link-picker">
            <p className="eyebrow"><CalendarDays aria-hidden="true" /> 이번 녹음을 연결할 일정</p>
            <div role="radiogroup" aria-label="이번 진료 일정 선택">
              {upcomingAppointments.map((appointment) => (
                <button
                  key={appointment.id}
                  type="button"
                  role="radio"
                  aria-checked={selectedAppointmentId === appointment.id}
                  className={selectedAppointmentId === appointment.id ? 'quiz-option is-selected' : 'quiz-option'}
                  onClick={() => onSelectAppointment(appointment.id)}
                >
                  <span>{appointment.hospital} {appointment.department} · {formatAppointmentDate(appointment.date, appointment.time)} ({appointmentTypeLabels[appointment.type]})</span>
                  {selectedAppointmentId === appointment.id && <Check aria-hidden="true" />}
                </button>
              ))}
              <button
                type="button"
                role="radio"
                aria-checked={selectedAppointmentId === null}
                className={selectedAppointmentId === null ? 'quiz-option is-selected' : 'quiz-option'}
                onClick={() => onSelectAppointment(null)}
              >
                <span>등록된 일정과 연결하지 않을래요</span>
                {selectedAppointmentId === null && <Check aria-hidden="true" />}
              </button>
            </div>
          </section>
        )}
        <label className="consent-check">
          <input type="checkbox" checked={consented} onChange={(event) => onConsentChange(event.target.checked)} />
          <span>위 내용을 이해했으며 진료 녹음에 동의합니다.</span>
        </label>
        <p className="medical-notice">대화에 참여한 본인이 사용하는 것을 전제로 한 시연 기능입니다.</p>
        <div className="sticky-actions"><button className="button button--primary button--large" disabled={!consented} type="button" onClick={() => onStepChange('recording')}>동의하고 시작하기</button></div>
      </div>
    )
  }

  if (step === 'recording') {
    return (
      <div className="flow-page recording-page">
        <div className="recording-status" role="status"><span className={recorder.isRecording ? 'recording-dot is-live' : 'recording-dot'} />{recorder.isRecording ? '진료 내용을 기록 중입니다' : '녹음 준비가 되었어요'}</div>
        <div className="recording-time"><Clock3 /><strong>{formatTime(recorder.elapsedSeconds)}</strong></div>
        {recorder.error && <p className="inline-error" role="alert">{recorder.error}</p>}
        <section className="recording-questions">
          <p className="eyebrow">이번 진료 핵심 질문</p>
          <h1>질문 카드를 보며<br />천천히 물어보세요.</h1>
          <ol className="question-list question-list--recording">
            {summary.questions.map((question, index) => <li key={question}><span>{index + 1}</span><p>{question}</p></li>)}
          </ol>
        </section>
        <div className="recording-actions">
          {!recorder.isRecording ? (
            <button className="button button--primary button--large" type="button" onClick={startRecording}><Mic /> 녹음 시작</button>
          ) : (
            <button className="button button--danger button--large" type="button" onClick={finishRecording}><Square /> 진료 종료</button>
          )}
          <small>녹음 중에도 질문 카드는 계속 볼 수 있어요.</small>
        </div>
      </div>
    )
  }

  if (step === 'processing') {
    const isTranscribing = processingState === 'idle' || processingState === 'transcribing'
    const isGenerating = processingState === 'generating'
    const isReviewError = processingState === 'review-error'
    return (
      <div className="processing-page" aria-live="polite">
        <span className="processing-orbit"><Sparkles /></span>
        <h1>{isTranscribing ? <>진료 음성을<br />글로 바꾸고 있어요.</> : isGenerating ? <>기억 확인 질문을<br />만들고 있어요.</> : processingState === 'ready' ? <>바뀐 글을<br />확인해 주세요.</> : isReviewError ? <>기억 확인 질문을<br />만들지 못했어요.</> : <>음성을 글로<br />바꾸지 못했어요.</>}</h1>
        <p>{isTranscribing ? '녹음 길이에 따라 잠시 시간이 걸릴 수 있어요.' : isGenerating ? '진료 대화에서 명확히 확인되는 내용만 질문으로 정리하고 있어요.' : processingState === 'ready' ? '잘못 들린 부분이 있을 수 있으니 중요한 내용은 의료진에게 다시 확인해 주세요.' : isReviewError ? `${processingError} 아래 글을 확인한 뒤 다시 시도하거나, 글로 바꾼 내용만 저장할 수 있어요.` : processingError}</p>
        <div className="processing-steps">
          <span className={isGenerating || processingState === 'ready' || isReviewError ? 'is-done' : isTranscribing ? 'is-current' : ''}>{isTranscribing ? <span className="spinner" /> : <Check />} 음성을 글로 바꾸기</span>
          <span className={processingState === 'ready' ? 'is-done' : isGenerating ? 'is-current' : ''}>{isGenerating ? <span className="spinner" /> : processingState === 'ready' ? <Check /> : null} 기억 확인 질문 만들기</span>
          <span className={processingState === 'ready' || isReviewError ? 'is-current' : ''}>바뀐 글 확인하기</span>
        </div>
        {processingState === 'ready' && <SourceBadge>{`AI 질문 · ${reviewModel ?? '연결됨'}`}</SourceBadge>}
        {(processingState === 'ready' || isReviewError) && transcript && (
          <section className="processing-transcript">
            <div><h2>글로 바꾼 진료 내용</h2>{transcriptionModel && <small>{transcriptionModel}</small>}</div>
            <p>{transcript}</p>
          </section>
        )}
        {processingState === 'ready' && <div className="processing-actions"><button className="button button--primary button--large" type="button" onClick={() => onStepChange('quiz')}>기억 확인 시작하기</button><button className="button button--secondary" type="button" onClick={recordAgain}>다시 녹음하기</button></div>}
        {isReviewError && (
          <div className="processing-actions">
            <button className="button button--primary button--large" type="button" onClick={() => runReviewGeneration(transcript)}>질문 만들기 다시 시도</button>
            <button className="button button--secondary" type="button" onClick={() => onStepChange('results')}>글로 바꾼 내용만 저장하기</button>
            <button className="skip-link" type="button" onClick={recordAgain}>다시 녹음하기</button>
          </div>
        )}
        {processingState === 'error' && <div className="processing-actions">{audioRef.current && <button className="button button--primary button--large" type="button" onClick={retryTranscription}>글로 바꾸기 다시 시도</button>}<button className="button button--secondary" type="button" onClick={recordAgain}>다시 녹음하기</button></div>}
      </div>
    )
  }

  if (step === 'quiz' && review && review.questions.length > 0) {
    const quizQuestions = review.questions
    const question = quizQuestions[Math.min(quizIndex, quizQuestions.length - 1)]
    const selected = answers.find((answer) => answer.questionId === question.id)?.answer
    return (
      <div className="flow-page quiz-page">
        <div className="quiz-progress"><span>{quizIndex + 1} / {quizQuestions.length}</span><div><i style={{ width: `${((quizIndex + 1) / quizQuestions.length) * 100}%` }} /></div></div>
        <section className="flow-intro">
          <SourceBadge>진료 대화로 만든 AI 질문</SourceBadge>
          <p className="eyebrow">기억 확인</p>
          <h1>{question.question}</h1>
          <p>시험이 아니에요. 기억나는 대로 골라 주세요.</p>
        </section>
        <div className="quiz-options" role="radiogroup" aria-label={question.question}>
          {question.options.map((option) => (
            <button key={option} type="button" role="radio" aria-checked={selected === option} className={selected === option ? 'quiz-option is-selected' : 'quiz-option'} onClick={() => onAnswer({ questionId: question.id, answer: option })}>
              <span>{option}</span>{selected === option && <Check aria-hidden="true" />}
            </button>
          ))}
        </div>
        <button className="skip-link" type="button" onClick={() => onAnswer({ questionId: question.id, answer: '잘 모르겠어요' })}>잘 모르겠어요</button>
        <div className="sticky-actions"><button className="button button--primary button--large" type="button" disabled={!selected} onClick={() => { if (quizIndex === quizQuestions.length - 1) { recorder.destroyRecording(); onStepChange('results') } else { setQuizIndex((current) => current + 1) } }}>{quizIndex === quizQuestions.length - 1 ? '결과 확인하기' : '다음 질문'}</button></div>
      </div>
    )
  }

  if (!review) {
    // AI 질문 생성에 실패했거나 건너뛴 경우: 전사문만 저장하는 결과 화면.
    return (
      <div className="flow-page results-page">
        <section className="flow-intro">
          <p className="eyebrow">진료 기록</p>
          <h1>글로 바꾼 진료 내용을<br />그대로 저장할 수 있어요.</h1>
          <p>기억 확인 질문은 만들지 못했어요. 진료에서 들은 내용은 아래 글과 의료진의 안내를 기준으로 확인해 주세요.</p>
        </section>
        {transcript ? (
          <section className="processing-transcript">
            <div><FileText /><h2>글로 바꾼 진료 내용</h2>{transcriptionModel && <small>{transcriptionModel}</small>}</div>
            <p>{transcript}</p>
          </section>
        ) : (
          <p className="inline-error" role="alert">저장할 글이 없습니다. 다시 녹음해 주세요.</p>
        )}
        <div className="deletion-receipt"><ShieldCheck /><p><strong>원본 녹음은 앱에 저장되지 않았습니다.</strong><span>글로 바꾼 내용만 의료수첩에 저장할 수 있어요.</span></p></div>
        <div className="sticky-actions">
          {transcript && <button className="button button--primary button--large" type="button" onClick={onSaveResults}>글로 바꾼 내용 의료수첩에 저장하기</button>}
          <button className="button button--secondary" type="button" onClick={recordAgain}>다시 녹음하기</button>
        </div>
      </div>
    )
  }

  const evaluation = evaluateVisitReview(review, answers)

  return (
    <div className="flow-page results-page">
      <section className="flow-intro">
        <p className="eyebrow">기억 확인 완료</p>
        <h1>오늘 진료 내용을<br />정리했어요.</h1>
        <p>기억한 내용과 다시 확인할 내용을 나눠 보았어요.</p>
      </section>
      <div className="result-section result-section--success">
        <div className="result-section__title"><CheckCircle2 /><h2>잘 기억한 내용</h2></div>
        {evaluation.remembered.length > 0 ? evaluation.remembered.map((item) => <p key={item}>{item}</p>) : <p>이번에는 이 항목이 없어요. 다시 확인해도 괜찮아요.</p>}
      </div>
      <div className="result-section result-section--warning">
        <div className="result-section__title"><CircleAlert /><h2>다시 확인한 내용</h2></div>
        {evaluation.corrected.length > 0 ? evaluation.corrected.map((item) => <p key={item}><small>진료에서 확인된 내용</small>{item}</p>) : <p>다시 확인할 내용이 없어요.</p>}
      </div>
      <div className="result-section result-section--neutral">
        <div className="result-section__title"><HelpCircle /><h2>답을 못 들었거나 헷갈린 내용</h2></div>
        {evaluation.unanswered.length > 0 ? evaluation.unanswered.map((item) => <p key={item}>{item}</p>) : <p>추가로 확인할 질문이 없어요.</p>}
      </div>
      <div className="result-section result-section--actions">
        <div className="result-section__title"><ListChecks /><h2>진료에서 정한 실천 항목</h2></div>
        {review.actions.length > 0 ? review.actions.map((item) => <p key={item}>{item}</p>) : <p>진료 대화에서 명확히 확인된 실천 항목이 없어요.</p>}
      </div>
      <div className="deletion-receipt"><ShieldCheck /><p><strong>원본 녹음은 앱에 저장되지 않았습니다.</strong><span>글로 바꾼 내용과 정리된 진료 기록만 의료수첩에 저장할 수 있어요.</span></p></div>
      <div className="sticky-actions"><button className="button button--primary button--large" type="button" onClick={onSaveResults}>의료수첩에 저장하기</button></div>
    </div>
  )
}

interface FlowHeaderProps { title: string; onBack: () => void }
function FlowHeader({ title, onBack }: FlowHeaderProps) {
  return <header className="flow-header"><button className="icon-button" type="button" onClick={onBack} aria-label="이전 화면"><ArrowLeft /></button><strong>{title}</strong><span /></header>
}

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0')
  const seconds = (totalSeconds % 60).toString().padStart(2, '0')
  return `${minutes}:${seconds}`
}
