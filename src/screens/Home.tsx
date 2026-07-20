import { CalendarDays, CalendarPlus, Check, CheckCircle2, ChevronDown, ClipboardPen, Footprints, LoaderCircle, Mic, Pill, Plus, Settings2, Stethoscope, WifiOff } from 'lucide-react'
import { useState } from 'react'
import { appointmentTypeLabels, formatAppointmentDate, formatDDay, sortAppointments, todayDateKey } from '../appointments'
import { isIntakeTaken, medicationSlotLabels, medicationSlotOrder } from '../medications'
import type { MedicalAppointment, Medication, MedicationIntake, MedicationSlot, Task } from '../types'

interface HomeProps {
  userName: string
  tasks: Task[]
  appointments: MedicalAppointment[]
  medications: Medication[]
  medicationIntakes: MedicationIntake[]
  onToggleIntake: (medicationId: string, slot: MedicationSlot) => void
  onManageMedications: () => void
  onPrepare: (appointmentId?: string) => void
  onOpenCalendar: () => void
  onToggleTask: (id: string) => void
  onQuickHealthLog: () => void
  llm: { status: 'checking' | 'connected' | 'unavailable'; model: string | null }
}

const taskIcons = { pill: Pill, walk: Footprints, water: Plus }

export function Home({ userName, tasks, appointments, medications, medicationIntakes, onToggleIntake, onManageMedications, onPrepare, onOpenCalendar, onToggleTask, onQuickHealthLog, llm }: HomeProps) {
  const nextAppointment = sortAppointments(appointments).find((appointment) => appointment.status === 'scheduled' && appointment.date >= todayDateKey())
  const isPrepared = nextAppointment?.preparation?.status === 'ready'
  const today = todayDateKey()
  const todayDoses = medicationSlotOrder.flatMap((slot) =>
    medications.filter((medication) => medication.slots.includes(slot)).map((medication) => ({ medication, slot })))
  const pendingDoseCount = todayDoses.filter(({ medication, slot }) => !isIntakeTaken(medicationIntakes, medication.id, slot, today)).length
  const pendingTaskCount = tasks.filter((task) => !task.completed).length
  const pendingCount = pendingDoseCount + pendingTaskCount
  const [isTodayOpen, setIsTodayOpen] = useState(() => pendingCount > 0)

  return (
    <div className="page-stack">
      <section className="greeting greeting--compact">
        <p className="eyebrow">오늘의 메디버디</p>
        <h1>{userName} 님, 안녕하세요.</h1>
        <p>지금 할 일을 하나씩 안내해 드릴게요.</p>
        <button className="heading-action greeting__quick-action" type="button" onClick={onQuickHealthLog}><Mic aria-hidden="true" /> 건강 한마디 기록</button>
      </section>
      <section className="journey-card journey-card--focus" aria-labelledby="next-action-title">
        {nextAppointment ? (
          <>
            <div className="journey-card__top">
              <div>
                <p className="eyebrow">지금 할 일</p>
                <h2 id="next-action-title">{isPrepared ? '진료 전에 물어볼 내용을 확인하세요.' : '다음 진료를 미리 준비하세요.'}</h2>
                <p className="next-action-hospital">{nextAppointment.hospital} {nextAppointment.department} <span className="d-day">{formatDDay(nextAppointment.date)}</span></p>
                <p className="icon-text"><CalendarDays size={20} /> {formatAppointmentDate(nextAppointment.date, nextAppointment.time)}</p>
                <div className="next-action-status"><span className={`appointment-type appointment-type--${nextAppointment.type}`}>{appointmentTypeLabels[nextAppointment.type]}</span><span className={isPrepared ? 'preparation-status is-ready' : 'preparation-status'}>{isPrepared ? '준비 완료' : '준비 필요'}</span></div>
              </div>
              <span className="round-icon"><Stethoscope aria-hidden="true" /></span>
            </div>
            <div className="journey-actions">
              <button className="button button--primary button--large" type="button" onClick={() => onPrepare(nextAppointment.id)}><ClipboardPen aria-hidden="true" /> {isPrepared ? '준비한 질문 보기' : '진료 준비 시작하기'}</button>
              <button className="button button--quiet" type="button" onClick={onOpenCalendar}><CalendarDays aria-hidden="true" /> 일정 자세히 보기</button>
            </div>
          </>
        ) : (
          <div className="journey-empty">
            <span className="round-icon round-icon--soft"><CalendarPlus aria-hidden="true" /></span>
            <div><p className="eyebrow">지금 할 일</p><h2 id="next-action-title">다음 병원 일정을 등록하세요.</h2><p>날짜를 등록하면 진료 준비 순서를 차근차근 안내해 드려요.</p></div>
            <div className="journey-actions journey-actions--empty">
              <button className="button button--primary button--large" type="button" onClick={onOpenCalendar}><CalendarPlus aria-hidden="true" /> 병원 일정 등록하기</button>
              <button className="button button--quiet" type="button" onClick={() => onPrepare()}><ClipboardPen aria-hidden="true" /> 일정 없이 진료 준비하기</button>
            </div>
          </div>
        )}
      </section>

      {llm.status !== 'connected' && <div className={`ai-connection ai-connection--${llm.status}`} role="status">
        {llm.status === 'checking' && <LoaderCircle className="spin-icon" aria-hidden="true" />}
        {llm.status === 'unavailable' && <WifiOff aria-hidden="true" />}
        <span><strong>{llm.status === 'checking' ? '진료 준비 기능 확인 중' : '기본 정리 기능을 사용 중이에요'}</strong><small>{llm.status === 'checking' ? '잠시만 기다려 주세요.' : '진료 준비는 그대로 계속할 수 있어요.'}</small></span>
      </div>}

      <details className="today-panel" open={isTodayOpen} onToggle={(event) => setIsTodayOpen(event.currentTarget.open)}>
        <summary><span><strong>오늘 할 일</strong><small>{pendingCount > 0 ? `${pendingCount}개가 남았어요` : '모두 마쳤어요'}</small></span><ChevronDown aria-hidden="true" /></summary>
        <section className="section-stack">
          <div className="section-heading">
            <h2>약 먹기</h2>
            <button className="heading-action" type="button" onClick={onManageMedications}><Settings2 aria-hidden="true" /> 약 관리</button>
          </div>
        {todayDoses.length > 0 ? (
          <div className="task-list">
            {todayDoses.map(({ medication, slot }) => {
              const taken = isIntakeTaken(medicationIntakes, medication.id, slot, today)
              return (
                <button key={`${medication.id}-${slot}`} type="button" className={taken ? 'task-card is-complete' : 'task-card'} onClick={() => onToggleIntake(medication.id, slot)}>
                  <span className="task-card__icon"><Pill /></span>
                  <span>{medicationSlotLabels[slot]} · {medication.name}{medication.memo && <small className="dose-memo"> ({medication.memo})</small>}</span>
                  <span className="task-card__check">{taken && <Check aria-label="복용 완료" />}</span>
                </button>
              )
            })}
          </div>
        ) : (
          <div className="task-empty">
            <Pill aria-hidden="true" />
            <p><strong>복용 중인 약을 등록해 보세요.</strong><small>매일 시간대별로 체크하고 알림을 받을 수 있어요.</small></p>
          </div>
        )}
        </section>

        <section className="section-stack">
        <div className="section-heading"><h2>건강 실천</h2><span>{tasks.length > 0 ? `${tasks.filter((task) => task.completed).length}/${tasks.length} 완료` : '진료 후 추가돼요'}</span></div>
        {tasks.length > 0 ? <div className="task-list">
          {tasks.map((task) => {
            const Icon = taskIcons[task.icon]
            return (
              <button key={task.id} type="button" className={task.completed ? 'task-card is-complete' : 'task-card'} onClick={() => onToggleTask(task.id)}>
                <span className="task-card__icon"><Icon /></span>
                <span>{task.label}</span>
                <span className="task-card__check">{task.completed && <Check aria-label="완료" />}</span>
              </button>
            )
          })}
        </div> : <div className="task-empty"><CheckCircle2 aria-hidden="true" /><p><strong>아직 실천 항목이 없어요.</strong><small>진료 후 정한 약속을 이곳에서 하나씩 확인할 수 있어요.</small></p></div>}
        </section>
      </details>
    </div>
  )
}
