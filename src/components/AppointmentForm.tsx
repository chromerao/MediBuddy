import { useState, type FormEvent } from 'react'
import { CalendarPlus, Info, Save, X } from 'lucide-react'
import { appointmentTypeLabels } from '../appointments'
import type { AppointmentInput, AppointmentType, MedicalAppointment } from '../types'

interface AppointmentFormProps {
  date: string
  appointment: MedicalAppointment | null
  onSave: (input: AppointmentInput) => void
  onCancel: () => void
}

const appointmentTypes = Object.entries(appointmentTypeLabels) as [AppointmentType, string][]

export function AppointmentForm({ date, appointment, onSave, onCancel }: AppointmentFormProps) {
  const [input, setInput] = useState<AppointmentInput>(() => appointment ? {
    date: appointment.date,
    time: appointment.time,
    hospital: appointment.hospital,
    department: appointment.department,
    doctor: appointment.doctor,
    type: appointment.type,
    memo: appointment.memo,
  } : {
    date,
    time: '09:00',
    hospital: '',
    department: '',
    doctor: '',
    type: 'outpatient',
    memo: '',
  })

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSave({
      ...input,
      hospital: input.hospital.trim(),
      department: input.department.trim(),
      doctor: input.doctor.trim(),
      memo: input.memo.trim(),
    })
  }

  return (
    <form className="appointment-form" onSubmit={handleSubmit}>
      <div className="appointment-form__heading">
        <span className="round-icon"><CalendarPlus aria-hidden="true" /></span>
        <div><p className="eyebrow">{appointment ? '일정 수정' : '새 일정'}</p><h2>{appointment ? '진료 정보를 수정하세요.' : '병원 진료 정보를 등록하세요.'}</h2></div>
      </div>

      <div className="appointment-form__row">
        <label><span>진료 날짜</span><input type="date" value={input.date} onChange={(event) => setInput((current) => ({ ...current, date: event.target.value }))} required /></label>
        <label><span>예약 시간</span><input type="time" value={input.time} onChange={(event) => setInput((current) => ({ ...current, time: event.target.value }))} required /></label>
      </div>

      <fieldset className="appointment-type-fieldset">
        <legend>진료 구분</legend>
        <div>
          {appointmentTypes.map(([value, label]) => (
            <label key={value} className={input.type === value ? `appointment-type-option appointment-type-option--${value} is-selected` : `appointment-type-option appointment-type-option--${value}`}>
              <input type="radio" name="appointment-type" value={value} checked={input.type === value} onChange={() => setInput((current) => ({ ...current, type: value }))} />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="appointment-field"><span>병원명</span><input type="text" value={input.hospital} onChange={(event) => setInput((current) => ({ ...current, hospital: event.target.value }))} placeholder="예: 성모병원" maxLength={80} required /></label>
      <div className="appointment-form__row">
        <label><span>진료과</span><input type="text" value={input.department} onChange={(event) => setInput((current) => ({ ...current, department: event.target.value }))} placeholder="예: 내과" maxLength={50} required /></label>
        <label><span>담당 의료진 <small>(선택)</small></span><input type="text" value={input.doctor} onChange={(event) => setInput((current) => ({ ...current, doctor: event.target.value }))} placeholder="예: 김의사" maxLength={50} /></label>
      </div>
      <label className="appointment-field"><span>준비사항 또는 메모 <small>(선택)</small></span><textarea value={input.memo} onChange={(event) => setInput((current) => ({ ...current, memo: event.target.value }))} placeholder="금식, 준비물, 접수 위치 등을 적어 두세요." maxLength={500} /></label>

      {input.type === 'surgery' && <p className="appointment-form__notice"><Info aria-hidden="true" /> 수술 시간과 금식·입원 안내는 병원에서 받은 내용을 다시 확인해 주세요.</p>}

      <div className="appointment-form__actions">
        <button className="button button--quiet" type="button" onClick={onCancel}><X aria-hidden="true" /> 취소</button>
        <button className="button button--primary" type="submit"><Save aria-hidden="true" /> {appointment ? '수정 내용 저장' : '일정 등록하기'}</button>
      </div>
    </form>
  )
}
