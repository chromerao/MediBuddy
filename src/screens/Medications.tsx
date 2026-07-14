import { CalendarCheck2, Pill, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import { getRecentAdherence, medicationSlotLabels, medicationSlotOrder } from '../medications'
import type { Medication, MedicationIntake, MedicationSlot } from '../types'

interface MedicationsProps {
  medications: Medication[]
  intakes: MedicationIntake[]
  onAdd: (name: string, slots: MedicationSlot[], memo: string) => void
  onDelete: (id: string) => void
  onBack: () => void
}

export function Medications({ medications, intakes, onAdd, onDelete, onBack }: MedicationsProps) {
  const [name, setName] = useState('')
  const [memo, setMemo] = useState('')
  const [slots, setSlots] = useState<MedicationSlot[]>(['morning'])
  const adherence = getRecentAdherence(medications, intakes)
  const weekTotal = adherence.reduce((sum, day) => sum + day.total, 0)
  const weekTaken = adherence.reduce((sum, day) => sum + day.taken, 0)

  function toggleSlot(slot: MedicationSlot) {
    setSlots((current) => current.includes(slot) ? current.filter((item) => item !== slot) : [...current, slot])
  }

  function addMedication() {
    if (!name.trim() || slots.length === 0) return
    onAdd(name.trim(), medicationSlotOrder.filter((slot) => slots.includes(slot)), memo.trim())
    setName('')
    setMemo('')
    setSlots(['morning'])
  }

  return (
    <div className="flow-page medications-page">
      <PageHeader title="복약 관리" onBack={onBack} />
      <section className="flow-intro">
        <p className="eyebrow">매일 챙기는 약속</p>
        <h1>드시는 약을 등록하면<br />시간에 맞춰 챙겨드려요.</h1>
        <p>홈 화면에서 매일 체크하고, 일주일 복약 현황을 볼 수 있어요.</p>
      </section>

      {medications.length > 0 && (
        <section className="settings-card">
          <div className="settings-card__title"><span className="round-icon"><CalendarCheck2 /></span><div><h2>최근 7일 복약 현황</h2><p>{weekTotal > 0 ? `${weekTaken}/${weekTotal}회 복용했어요.` : '이번 주 기록이 아직 없어요.'}</p></div></div>
          <div className="adherence-grid" role="img" aria-label="최근 7일 복약 현황">
            {adherence.map((day) => {
              const ratio = day.total > 0 ? day.taken / day.total : 0
              return (
                <div key={day.date} className="adherence-day">
                  <span className={`adherence-dot ${day.total === 0 ? 'is-empty' : ratio >= 1 ? 'is-full' : ratio > 0 ? 'is-partial' : 'is-missed'}`}>
                    {day.total > 0 ? `${day.taken}/${day.total}` : '–'}
                  </span>
                  <small>{Number(day.date.slice(8, 10))}일</small>
                </div>
              )
            })}
          </div>
        </section>
      )}

      <section className="settings-card">
        <div className="settings-card__title"><span className="round-icon"><Pill /></span><div><h2>복용 중인 약</h2><p>{medications.length > 0 ? `${medications.length}개 등록됨` : '아직 등록한 약이 없어요.'}</p></div></div>
        {medications.map((medication) => (
          <div key={medication.id} className="medication-row">
            <div>
              <strong>{medication.name}</strong>
              <small>
                {medication.slots.map((slot) => medicationSlotLabels[slot]).join(' · ')}
                {medication.memo && ` · ${medication.memo}`}
              </small>
            </div>
            <button className="icon-button" type="button" aria-label={`${medication.name} 삭제`} onClick={() => { if (window.confirm(`${medication.name} 약을 목록에서 삭제할까요?`)) onDelete(medication.id) }}><Trash2 /></button>
          </div>
        ))}
      </section>

      <section className="invite-form">
        <label><span>약 이름</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="예: 혈압약, 메트포르민" /></label>
        <div className="slot-picker">
          <span>복용 시간대</span>
          <div>
            {medicationSlotOrder.map((slot) => (
              <button key={slot} type="button" aria-pressed={slots.includes(slot)} className={slots.includes(slot) ? 'slot-chip is-selected' : 'slot-chip'} onClick={() => toggleSlot(slot)}>
                {medicationSlotLabels[slot]}
              </button>
            ))}
          </div>
        </div>
        <label><span>메모 (선택)</span><input value={memo} onChange={(event) => setMemo(event.target.value)} placeholder="예: 식후 30분" /></label>
        <button className="button button--primary button--large" type="button" disabled={!name.trim() || slots.length === 0} onClick={addMedication}><Plus /> 약 추가하기</button>
      </section>
    </div>
  )
}
