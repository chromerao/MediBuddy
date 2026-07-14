import { useState } from 'react'
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, ClipboardPen, Clock3, FileText, MapPin, Pencil, Plus, Stethoscope, Trash2, UserRound } from 'lucide-react'
import { appointmentTypeLabels, formatAppointmentDate, parseDateKey, sortAppointments, todayDateKey, toDateKey } from '../appointments'
import { AppointmentForm } from '../components/AppointmentForm'
import { PageHeader } from '../components/PageHeader'
import type { AppointmentInput, MedicalAppointment } from '../types'

interface CalendarProps {
  appointments: MedicalAppointment[]
  onSave: (input: AppointmentInput, appointmentId?: string) => void
  onDelete: (appointmentId: string) => void
  onPrepare: (appointmentId: string) => void
  onBack: () => void
}

const weekdays = ['일', '월', '화', '수', '목', '금', '토']

export function Calendar({ appointments, onSave, onDelete, onPrepare, onBack }: CalendarProps) {
  const initialDate = sortAppointments(appointments).find((appointment) => appointment.date >= todayDateKey())?.date ?? todayDateKey()
  const [selectedDate, setSelectedDate] = useState(initialDate)
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const date = parseDateKey(initialDate)
    return new Date(date.getFullYear(), date.getMonth(), 1)
  })
  const [editingAppointment, setEditingAppointment] = useState<MedicalAppointment | null>(null)
  const [formOpen, setFormOpen] = useState(false)

  const calendarDays = createCalendarDays(visibleMonth)
  const selectedAppointments = sortAppointments(appointments.filter((appointment) => appointment.date === selectedDate))
  const monthLabel = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long' }).format(visibleMonth)
  const selectedDateLabel = formatAppointmentDate(selectedDate)

  function selectDate(date: Date) {
    setSelectedDate(toDateKey(date))
    setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1))
    setEditingAppointment(null)
    setFormOpen(false)
  }

  function moveMonth(amount: number) {
    const nextMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + amount, 1)
    setVisibleMonth(nextMonth)
  }

  function openNewAppointment() {
    setEditingAppointment(null)
    setFormOpen(true)
  }

  function saveAppointment(input: AppointmentInput) {
    onSave(input, editingAppointment?.id)
    setSelectedDate(input.date)
    const savedDate = parseDateKey(input.date)
    setVisibleMonth(new Date(savedDate.getFullYear(), savedDate.getMonth(), 1))
    setEditingAppointment(null)
    setFormOpen(false)
  }

  function deleteAppointment(appointment: MedicalAppointment) {
    if (!window.confirm(`${appointment.hospital} ${appointmentTypeLabels[appointment.type]} 일정을 삭제할까요?`)) return
    onDelete(appointment.id)
    if (editingAppointment?.id === appointment.id) {
      setEditingAppointment(null)
      setFormOpen(false)
    }
  }

  return (
    <div className="flow-page calendar-page">
      <PageHeader title="진료 캘린더" onBack={onBack} />
      <section className="flow-intro">
        <p className="eyebrow">병원 일정을 한눈에</p>
        <h1>진료와 수술 일정을<br />잊지 않게 기록하세요.</h1>
        <p>날짜를 선택하면 그날의 예약 정보를 확인하고 등록할 수 있어요.</p>
      </section>

      <section className="calendar-card" aria-label="월간 진료 일정">
        <div className="calendar-card__header">
          <button className="icon-button" type="button" aria-label="이전 달" onClick={() => moveMonth(-1)}><ChevronLeft aria-hidden="true" /></button>
          <div><h2 aria-live="polite">{monthLabel}</h2><button type="button" onClick={() => selectDate(parseDateKey(todayDateKey()))}>오늘</button></div>
          <button className="icon-button" type="button" aria-label="다음 달" onClick={() => moveMonth(1)}><ChevronRight aria-hidden="true" /></button>
        </div>
        <div className="calendar-weekdays" aria-hidden="true">{weekdays.map((weekday) => <span key={weekday}>{weekday}</span>)}</div>
        <div className="calendar-grid">
          {calendarDays.map((date) => {
            const dateKey = toDateKey(date)
            const dateAppointments = appointments.filter((appointment) => appointment.date === dateKey)
            const isCurrentMonth = date.getMonth() === visibleMonth.getMonth()
            const classNames = [
              'calendar-day',
              !isCurrentMonth && 'is-outside',
              dateKey === selectedDate && 'is-selected',
              dateKey === todayDateKey() && 'is-today',
            ].filter(Boolean).join(' ')
            const accessibleDate = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }).format(date)
            return (
              <button key={dateKey} className={classNames} type="button" aria-pressed={dateKey === selectedDate} aria-label={`${accessibleDate}, 일정 ${dateAppointments.length}개`} onClick={() => selectDate(date)}>
                <time dateTime={dateKey}>{date.getDate()}</time>
                <span className="calendar-day__dots" aria-hidden="true">
                  {dateAppointments.slice(0, 3).map((appointment) => <i key={appointment.id} className={`appointment-dot appointment-dot--${appointment.type}`} />)}
                  {dateAppointments.length > 3 && <small>+{dateAppointments.length - 3}</small>}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <section className="appointment-section">
        <div className="section-heading">
          <div><p className="eyebrow">선택한 날짜</p><h2>{selectedDateLabel}</h2></div>
          <button className="button button--secondary" type="button" onClick={openNewAppointment}><Plus aria-hidden="true" /> 일정 등록</button>
        </div>

        {formOpen && (
          <AppointmentForm
            key={editingAppointment?.id ?? `new-${selectedDate}`}
            date={selectedDate}
            appointment={editingAppointment}
            onSave={saveAppointment}
            onCancel={() => { setEditingAppointment(null); setFormOpen(false) }}
          />
        )}

        {selectedAppointments.length === 0 ? (
          <div className="appointment-empty"><CalendarDays aria-hidden="true" /><p><strong>등록된 병원 일정이 없어요.</strong><small>진료, 검사, 수술 일정을 미리 적어 두세요.</small></p></div>
        ) : (
          <div className="appointment-list">
            {selectedAppointments.map((appointment) => (
              <article key={appointment.id} className={`appointment-card appointment-card--${appointment.type}`}>
                <div className="appointment-card__header"><span className={`appointment-type appointment-type--${appointment.type}`}>{appointmentTypeLabels[appointment.type]}</span><strong><Clock3 aria-hidden="true" /> {appointment.time}</strong></div>
                <h3>{appointment.hospital}</h3>
                <p><Stethoscope aria-hidden="true" /> {appointment.department}</p>
                {appointment.doctor && <p><UserRound aria-hidden="true" /> {appointment.doctor}</p>}
                {appointment.memo && <p className="appointment-card__memo"><FileText aria-hidden="true" /> {appointment.memo}</p>}
                <p className={appointment.preparation?.status === 'ready' ? 'preparation-status is-ready' : 'preparation-status'}>
                  {appointment.preparation?.status === 'ready' ? <><CheckCircle2 aria-hidden="true" /> 질문 카드 준비됨</> : appointment.preparation ? '작성 중인 질문 카드가 있어요' : '질문 카드 준비 전'}
                </p>
                <div className="appointment-card__actions">
                  {appointment.status === 'scheduled' && <button type="button" onClick={() => onPrepare(appointment.id)}><ClipboardPen aria-hidden="true" /> {appointment.preparation?.status === 'ready' ? '카드 보기' : '진료 준비'}</button>}
                  <button type="button" onClick={() => { setEditingAppointment(appointment); setFormOpen(true) }}><Pencil aria-hidden="true" /> 수정</button>
                  <button type="button" className="is-danger" onClick={() => deleteAppointment(appointment)}><Trash2 aria-hidden="true" /> 삭제</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <p className="calendar-privacy-note"><MapPin aria-hidden="true" /> 등록한 일정은 현재 브라우저 또는 로그인한 내 계정에만 저장됩니다.</p>
    </div>
  )
}

function createCalendarDays(month: Date) {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1)
  const calendarStart = new Date(firstDay)
  calendarStart.setDate(firstDay.getDate() - firstDay.getDay())
  return Array.from({ length: 42 }, (_, index) => new Date(calendarStart.getFullYear(), calendarStart.getMonth(), calendarStart.getDate() + index))
}
