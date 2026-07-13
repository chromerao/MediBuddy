import type { AppointmentType, MedicalAppointment } from './types'

export const appointmentTypeLabels: Record<AppointmentType, string> = {
  outpatient: '일반 진료',
  surgery: '수술',
  examination: '검사',
  procedure: '시술',
}

export function toDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function todayDateKey() {
  return toDateKey(new Date())
}

export function parseDateKey(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function sortAppointments(appointments: MedicalAppointment[]) {
  return [...appointments].sort((left, right) => `${left.date}T${left.time}`.localeCompare(`${right.date}T${right.time}`))
}

export function formatAppointmentDate(date: string, time?: string) {
  const formattedDate = new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(parseDateKey(date))
  return time ? `${formattedDate} ${formatAppointmentTime(time)}` : formattedDate
}

export function formatAppointmentTime(time: string) {
  const [hour, minute] = time.split(':').map(Number)
  const period = hour < 12 ? '오전' : '오후'
  const displayHour = hour % 12 || 12
  return `${period} ${displayHour}:${String(minute).padStart(2, '0')}`
}

export function getDaysUntil(date: string) {
  const today = parseDateKey(todayDateKey())
  return Math.round((parseDateKey(date).getTime() - today.getTime()) / 86_400_000)
}

export function formatDDay(date: string) {
  const days = getDaysUntil(date)
  if (days === 0) return 'D-Day'
  return days > 0 ? `D-${days}` : `D+${Math.abs(days)}`
}
