import type { Medication, MedicationIntake, MedicationSlot } from './types'

export const medicationSlotOrder: MedicationSlot[] = ['morning', 'noon', 'evening', 'night']

export const medicationSlotLabels: Record<MedicationSlot, string> = {
  morning: '아침',
  noon: '점심',
  evening: '저녁',
  night: '취침 전',
}

// 알림 기준 시각. 슬롯별 시간 설정 기능을 붙이기 전까지의 기본값.
export const medicationSlotTimes: Record<MedicationSlot, string> = {
  morning: '08:00',
  noon: '12:30',
  evening: '18:30',
  night: '22:00',
}

export function isIntakeTaken(intakes: MedicationIntake[], medicationId: string, slot: MedicationSlot, date: string) {
  return intakes.some((intake) => intake.medicationId === medicationId && intake.slot === slot && intake.date === date)
}

export interface DailyAdherence {
  date: string
  taken: number
  total: number
}

// 최근 days일간의 복약 이행률(등록일 이후만 계산 대상).
export function getRecentAdherence(medications: Medication[], intakes: MedicationIntake[], days = 7): DailyAdherence[] {
  const result: DailyAdherence[] = []
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const day = new Date()
    day.setDate(day.getDate() - offset)
    const date = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`
    let total = 0
    let taken = 0
    for (const medication of medications) {
      if (medication.createdAt.slice(0, 10) > date) continue
      for (const slot of medication.slots) {
        total += 1
        if (isIntakeTaken(intakes, medication.id, slot, date)) taken += 1
      }
    }
    result.push({ date, taken, total })
  }
  return result
}
