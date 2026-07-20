import { Activity, BookHeart, Check, ChevronRight, ListChecks, Mic, MicOff, Plus, Save, Stethoscope, TrendingUp } from 'lucide-react'
import { useState } from 'react'
import { FeatureHub } from '../components/FeatureHub'
import { PageHeader } from '../components/PageHeader'
import { TrendChart } from '../components/TrendChart'
import { formatMetric, getMetricPoints } from '../metrics'
import { useServerSpeechInput } from '../hooks/useServerSpeechInput'
import type { HealthLog, Task, VisitRecord } from '../types'

interface NotebookProps {
  tasks: Task[]
  healthLogs: HealthLog[]
  view: NotebookView
  onViewChange: (view: NotebookView) => void
  onToggleTask: (id: string) => void
  onAddLog: (text: string) => void
  visitRecords: VisitRecord[]
  onOpenVisit: (id: string) => void
}

export type NotebookView = 'overview' | 'record' | 'tasks' | 'visits' | 'trends' | 'logs'

export function Notebook({ tasks, healthLogs, view, onViewChange, visitRecords, onToggleTask, onAddLog, onOpenVisit }: NotebookProps) {
  const [draft, setDraft] = useState('')
  const speech = useServerSpeechInput({ onResult: setDraft })
  const glucosePoints = getMetricPoints(healthLogs, 'glucose')
  const weightPoints = getMetricPoints(healthLogs, 'weight')
  const latestBloodPressure = healthLogs.find((log) => log.metric?.type === 'bloodPressure')?.metric
  function saveLog() {
    if (!draft.trim()) return
    onAddLog(draft.trim())
    setDraft('')
  }

  const viewTitles = { record: '건강 기록하기', tasks: '오늘의 실천', visits: '진료 기록', trends: '건강 수치 추이', logs: '최근 건강 기록' }
  const hasTrends = glucosePoints.length >= 2 || weightPoints.length >= 2 || Boolean(latestBloodPressure)

  if (view === 'overview') {
    return (
      <div className="page-stack notebook-page">
        <section className="greeting greeting--compact"><p className="eyebrow">일상 · 이어지는 진료</p><h1>나의 의료수첩</h1><p>확인하거나 기록할 기능을 선택하세요.</p></section>
        <FeatureHub label="의료수첩 기능" items={[
          { id: 'record', label: '건강 기록하기', description: '말이나 글로 한마디 기록', icon: Mic, onClick: () => onViewChange('record') },
          { id: 'tasks', label: '오늘의 실천', description: '진료에서 정한 할 일', icon: ListChecks, badge: tasks.length ? `${tasks.filter((task) => !task.completed).length}` : undefined, onClick: () => onViewChange('tasks') },
          { id: 'visits', label: '진료 기록', description: '저장된 진료 내용 확인', icon: Stethoscope, badge: visitRecords.length ? `${visitRecords.length}` : undefined, onClick: () => onViewChange('visits') },
          { id: 'trends', label: '수치 추이', description: '혈당·체중·혈압 변화', icon: TrendingUp, badge: hasTrends ? '확인' : undefined, onClick: () => onViewChange('trends') },
          { id: 'logs', label: '최근 기록', description: '내가 남긴 건강 기록', icon: BookHeart, badge: healthLogs.length ? `${healthLogs.length}` : undefined, onClick: () => onViewChange('logs') },
        ]} />
      </div>
    )
  }

  return (
    <div key={view} className="flow-page notebook-page page-transition">
      <PageHeader title={viewTitles[view]} onBack={() => onViewChange('overview')} />

      {view === 'record' && <section className="one-phrase-card">
        <button className={speech.isListening ? 'notebook-voice-button is-listening' : 'notebook-voice-button'} type="button" onClick={speech.toggle} aria-pressed={speech.isListening} disabled={speech.isProcessing}>
          {speech.isListening ? <MicOff /> : <Mic />}
          <span>{speech.isProcessing ? '글로 바꾸는 중…' : speech.isListening ? '듣기 멈추기' : '말로 기록하기'}</span>
        </button>
        <div><h2>오늘의 건강 수치를<br />한마디로 기록하세요.</h2><p>예: “오늘 아침 공복 혈당 130”</p></div>
        <label><span className="sr-only">건강 수치 입력</span><input value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') saveLog() }} placeholder="한마디 기록을 입력하세요" /></label>
        {speech.error && <p className="inline-error one-phrase-card__error" role="alert">{speech.error}</p>}
        {(speech.isListening || speech.isProcessing) && <p className="listening-status" role="status">{speech.isProcessing ? '서버에서 음성을 글로 바꾸고 있어요…' : '말씀하신 내용을 듣고 있어요…'}</p>}
        <button className="button button--primary" type="button" onClick={saveLog} disabled={!draft.trim() || speech.isListening || speech.isProcessing}><Save /> 기록 저장</button>
      </section>}

      {view === 'tasks' && <section className="section-stack">
        <div className="section-heading"><h2>오늘의 실천 항목</h2><span>{tasks.filter((task) => task.completed).length}/{tasks.length}</span></div>
        {tasks.length > 0 ? <div className="task-list">{tasks.map((task) => <button key={task.id} className={task.completed ? 'task-card is-complete' : 'task-card'} type="button" onClick={() => onToggleTask(task.id)}><span className="task-card__icon"><Check /></span><span>{task.label}</span><span className="task-card__check">{task.completed && <Check />}</span></button>)}</div> : <div className="task-empty"><Check aria-hidden="true" /><p><strong>아직 실천 항목이 없어요.</strong><small>진료에서 정한 실천 내용이 이곳에 추가됩니다.</small></p></div>}
      </section>}

      {view === 'visits' && <section className="section-stack">
        <div className="section-heading"><h2>진료 기록</h2></div>
        <div className="visit-record-list">
          {visitRecords.map((record) => (
            <button key={record.id} className="visit-record" type="button" onClick={() => onOpenVisit(record.id)}>
              <span className="visit-record__date"><strong>{record.day}</strong><small>{record.month}</small></span>
              <span><strong>{record.hospital} {record.department}</strong><small>{record.disease} · 기억 확인 완료</small></span><ChevronRight />
            </button>
          ))}
          {visitRecords.length === 0 && <div className="empty-record"><BookHeart /><p><strong>아직 저장된 진료가 없어요.</strong><small>기억 확인을 마치면 이곳에 기록돼요.</small></p></div>}
        </div>
      </section>}

      {view === 'trends' && (
        <section className="section-stack">
          <div className="section-heading"><h2>수치 추이</h2></div>
          {glucosePoints.length >= 2 && (
            <div className="trend-card">
              <div className="trend-card__title"><Activity aria-hidden="true" /><h3>혈당</h3><small>최근 {glucosePoints.length}회</small></div>
              <TrendChart points={glucosePoints} unit="mg/dL" />
            </div>
          )}
          {weightPoints.length >= 2 && (
            <div className="trend-card">
              <div className="trend-card__title"><Activity aria-hidden="true" /><h3>체중</h3><small>최근 {weightPoints.length}회</small></div>
              <TrendChart points={weightPoints} unit="kg" />
            </div>
          )}
          {latestBloodPressure && (
            <div className="trend-card trend-card--inline">
              <div className="trend-card__title"><Activity aria-hidden="true" /><h3>혈압</h3></div>
              <strong className="trend-card__bp">{latestBloodPressure.value}/{latestBloodPressure.secondary}</strong>
              <small>가장 최근 기록</small>
            </div>
          )}
          {!hasTrends && <div className="task-empty"><Activity aria-hidden="true" /><p><strong>아직 비교할 수치가 부족해요.</strong><small>같은 건강 수치를 두 번 이상 기록하면 변화가 보여요.</small></p></div>}
        </section>
      )}

      {view === 'logs' && <section className="section-stack">
        <div className="section-heading"><h2>최근 기록</h2></div>
        <div className="log-list">
          {healthLogs.map((log) => (
            <div key={log.id}>
              <span><BookHeart /></span>
              <p>
                <strong>{log.text}</strong>
                <small>{log.time}{log.metric && <span className="metric-badge">{formatMetric(log.metric)}</span>}</small>
              </p>
            </div>
          ))}
          {healthLogs.length === 0 && <div className="empty-state"><Plus /><p>아직 기록이 없어요.</p></div>}
        </div>
      </section>}
    </div>
  )
}
