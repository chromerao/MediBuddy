import { BookHeart, Check, ChevronRight, Mic, MicOff, Plus, Save } from 'lucide-react'
import { useState } from 'react'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'
import type { HealthLog, Task, VisitRecord } from '../types'

interface NotebookProps {
  tasks: Task[]
  healthLogs: HealthLog[]
  onToggleTask: (id: string) => void
  onAddLog: (text: string) => void
  visitRecords: VisitRecord[]
  onOpenVisit: (id: string) => void
}

export function Notebook({ tasks, healthLogs, visitRecords, onToggleTask, onAddLog, onOpenVisit }: NotebookProps) {
  const [draft, setDraft] = useState('')
  const speech = useSpeechRecognition({ onResult: setDraft })
  function saveLog() {
    if (!draft.trim()) return
    onAddLog(draft.trim())
    setDraft('')
  }

  return (
    <div className="page-stack notebook-page">
      <section className="greeting greeting--compact"><p className="eyebrow">일상에서도 이어지는 진료</p><h1>나의 의료수첩</h1><p>진료에서 정한 실천과 건강 수치를 쉽게 기록해요.</p></section>
      <section className="one-phrase-card">
        <button className={speech.isListening ? 'notebook-voice-button is-listening' : 'notebook-voice-button'} type="button" onClick={speech.toggle} aria-pressed={speech.isListening}>
          {speech.isListening ? <MicOff /> : <Mic />}
          <span>{speech.isListening ? '듣기 멈추기' : '말로 기록하기'}</span>
        </button>
        <div><h2>오늘의 건강 수치를<br />한마디로 기록하세요.</h2><p>예: “오늘 아침 공복 혈당 130”</p></div>
        <label><span className="sr-only">건강 수치 입력</span><input value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') saveLog() }} placeholder="한마디 기록을 입력하세요" /></label>
        {speech.error && <p className="inline-error one-phrase-card__error" role="alert">{speech.error}</p>}
        {speech.isListening && <p className="listening-status" role="status">말씀하신 내용을 듣고 있어요…</p>}
        <button className="button button--primary" type="button" onClick={saveLog} disabled={!draft.trim()}><Save /> 기록 저장</button>
      </section>
      <section className="section-stack">
        <div className="section-heading"><h2>오늘의 실천 항목</h2><span>{tasks.filter((task) => task.completed).length}/{tasks.length}</span></div>
        <div className="task-list">{tasks.map((task) => <button key={task.id} className={task.completed ? 'task-card is-complete' : 'task-card'} type="button" onClick={() => onToggleTask(task.id)}><span className="task-card__icon"><Check /></span><span>{task.label}</span><span className="task-card__check">{task.completed && <Check />}</span></button>)}</div>
      </section>
      <section className="section-stack">
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
      </section>
      <section className="section-stack">
        <div className="section-heading"><h2>최근 기록</h2></div>
        <div className="log-list">{healthLogs.map((log) => <div key={log.id}><span><BookHeart /></span><p><strong>{log.text}</strong><small>{log.time}</small></p></div>)}{healthLogs.length === 0 && <div className="empty-state"><Plus /><p>아직 기록이 없어요.</p></div>}</div>
      </section>
    </div>
  )
}
