import { CalendarDays, CalendarPlus, Check, CheckCircle2, ChevronRight, ClipboardPen, Footprints, LoaderCircle, Mic, Pill, Plus, Settings2, Sparkles, Stethoscope, WifiOff } from 'lucide-react'
import { appointmentTypeLabels, formatAppointmentDate, formatDDay, sortAppointments, todayDateKey } from '../appointments'
import { isIntakeTaken, medicationSlotLabels, medicationSlotOrder } from '../medications'
import type { HealthLog, MedicalAppointment, Medication, MedicationIntake, MedicationSlot, Task } from '../types'

interface HomeProps {
  userName: string
  tasks: Task[]
  healthLogs: HealthLog[]
  appointments: MedicalAppointment[]
  medications: Medication[]
  medicationIntakes: MedicationIntake[]
  onToggleIntake: (medicationId: string, slot: MedicationSlot) => void
  onManageMedications: () => void
  onPrepare: () => void
  onOpenCalendar: () => void
  onToggleTask: (id: string) => void
  onOpenNotebook: () => void
  llm: { status: 'checking' | 'connected' | 'unavailable'; model: string | null }
}

const taskIcons = { pill: Pill, walk: Footprints, water: Plus }

export function Home({ userName, tasks, healthLogs, appointments, medications, medicationIntakes, onToggleIntake, onManageMedications, onPrepare, onOpenCalendar, onToggleTask, onOpenNotebook, llm }: HomeProps) {
  const nextAppointment = sortAppointments(appointments).find((appointment) => appointment.status === 'scheduled' && appointment.date >= todayDateKey())
  const today = todayDateKey()
  const todayDoses = medicationSlotOrder.flatMap((slot) =>
    medications.filter((medication) => medication.slots.includes(slot)).map((medication) => ({ medication, slot })))

  return (
    <div className="page-stack">
      <section className="greeting">
        <p className="eyebrow">오늘도 메디버디와 함께</p>
        <h1>{userName} 님,<br />안녕하세요.</h1>
        <p>다음 진료를 차근차근 준비해 볼까요?</p>
      </section>
      <div className={`ai-connection ai-connection--${llm.status}`} role="status">
        {llm.status === 'checking' && <LoaderCircle className="spin-icon" aria-hidden="true" />}
        {llm.status === 'connected' && <CheckCircle2 aria-hidden="true" />}
        {llm.status === 'unavailable' && <WifiOff aria-hidden="true" />}
        <span><strong>{llm.status === 'connected' ? 'AI 진료 준비 연결됨' : llm.status === 'checking' ? 'AI 연결 확인 중' : '기본 정리 모드'}</strong><small>{llm.status === 'connected' ? `${llm.model} 모델을 사용해요.` : llm.status === 'checking' ? '잠시만 기다려 주세요.' : 'AI 서버 없이도 진료 준비를 계속할 수 있어요.'}</small></span>
        <Sparkles aria-hidden="true" />
      </div>

      <section className="journey-card">
        {nextAppointment ? (
          <>
            <div className="journey-card__top">
              <div>
                <p className="eyebrow">다음 병원 일정</p>
                <h2>{nextAppointment.hospital} {nextAppointment.department} <span className="d-day">{formatDDay(nextAppointment.date)}</span></h2>
                <p className="icon-text"><CalendarDays size={20} /> {formatAppointmentDate(nextAppointment.date, nextAppointment.time)}</p>
                <span className={`appointment-type appointment-type--${nextAppointment.type}`}>{appointmentTypeLabels[nextAppointment.type]}</span>
              </div>
              <span className="round-icon"><Stethoscope aria-hidden="true" /></span>
            </div>
            <div className="journey-progress" aria-label="진료 여정">
              <span className="is-current">준비</span><i /><span>진료</span><i /><span>확인</span><i /><span>실천</span>
            </div>
            <div className="journey-actions">
              <button className="button button--secondary" type="button" onClick={onOpenCalendar}><CalendarDays aria-hidden="true" /> 일정 보기</button>
              <button className="button button--primary" type="button" onClick={onPrepare}><ClipboardPen aria-hidden="true" /> 진료 준비하기</button>
            </div>
          </>
        ) : (
          <div className="journey-empty">
            <span className="round-icon round-icon--soft"><CalendarPlus aria-hidden="true" /></span>
            <div><p className="eyebrow">다음 병원 일정</p><h2>예정된 일정이 없어요.</h2><p>진료나 수술 날짜를 등록하면 여기에서 바로 확인할 수 있어요.</p></div>
            <div className="journey-actions journey-actions--empty">
              <button className="button button--primary" type="button" onClick={onOpenCalendar}><CalendarPlus aria-hidden="true" /> 일정 등록하기</button>
              <button className="button button--secondary" type="button" onClick={onPrepare}><ClipboardPen aria-hidden="true" /> 바로 진료 준비</button>
            </div>
          </div>
        )}
      </section>

      <section className="section-stack">
        <div className="section-heading">
          <h2>오늘의 복약</h2>
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
        <div className="section-heading"><h2>오늘의 건강 실천</h2><span>{tasks.length > 0 ? `${tasks.filter((task) => task.completed).length}/${tasks.length} 완료` : '진료 후 추가돼요'}</span></div>
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

      <section className="section-stack">
        <div className="section-heading"><h2>최근 한마디 기록</h2></div>
        <button className="voice-log-card" type="button" onClick={onOpenNotebook}>
          <span className="voice-log-card__icon"><Mic /></span>
          <span><strong>“{healthLogs[0]?.text ?? '아직 기록이 없어요'}”</strong><small>{healthLogs[0]?.time ?? '한마디로 기록해 보세요'}</small></span>
          <ChevronRight aria-hidden="true" />
        </button>
      </section>
    </div>
  )
}
