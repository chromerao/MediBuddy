import { formatAppointmentDate, getDaysUntil, todayDateKey } from './appointments'
import { isIntakeTaken, medicationSlotLabels, medicationSlotTimes } from './medications'
import type { MedicalAppointment, Medication, MedicationIntake, UserSettings } from './types'

const NOTIFIED_KEY = 'medibuddy-notified-reminders'

export function notificationsSupported() {
  return typeof window !== 'undefined' && 'Notification' in window
}

// 모바일 브라우저에서도 알림이 동작하도록 서비스 워커를 등록한다(앱 시작 시 1회).
export function registerNotificationServiceWorker() {
  if (!('serviceWorker' in navigator)) return
  navigator.serviceWorker.register('/sw.js').catch(() => {
    // 등록 실패 시에도 페이지 알림 폴백으로 계속 동작한다.
  })
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  return notificationsSupported() ? Notification.permission : 'unsupported'
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!notificationsSupported()) return 'unsupported'
  if (Notification.permission !== 'default') return Notification.permission
  try {
    return await Notification.requestPermission()
  } catch {
    return Notification.permission
  }
}

function loadNotifiedKeys(): Set<string> {
  try {
    const raw = window.localStorage.getItem(NOTIFIED_KEY)
    return new Set(raw ? (JSON.parse(raw) as string[]) : [])
  } catch {
    return new Set()
  }
}

function saveNotifiedKeys(keys: Set<string>) {
  try {
    // 오래된 키가 무한히 쌓이지 않도록 최근 200개만 유지한다.
    window.localStorage.setItem(NOTIFIED_KEY, JSON.stringify([...keys].slice(-200)))
  } catch {
    // 저장 실패는 알림 중복 정도의 영향만 있으므로 무시한다.
  }
}

function showNotification(title: string, body: string) {
  const options: NotificationOptions = { body, icon: '/medibuddy-icon.svg', tag: `${title}-${body}` }
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistration()
      .then((registration) => {
        if (registration) return registration.showNotification(title, options)
        showPageNotification(title, options)
      })
      .catch(() => showPageNotification(title, options))
    return
  }
  showPageNotification(title, options)
}

function showPageNotification(title: string, options: NotificationOptions) {
  try {
    new Notification(title, options)
  } catch {
    // 일부 브라우저(모바일 크롬 등)는 페이지에서 직접 생성하는 알림을 지원하지 않는다.
  }
}

export function checkAppointmentReminders(appointments: MedicalAppointment[], settings: UserSettings, hasPreparedSummary: boolean) {
  if (!notificationsSupported() || Notification.permission !== 'granted') return
  if (!settings.appointmentReminders && !settings.preparationReminders) return

  const notified = loadNotifiedKeys()
  let changed = false

  for (const appointment of appointments) {
    if (appointment.status !== 'scheduled') continue
    const days = getDaysUntil(appointment.date)
    if (days !== 0 && days !== 1) continue

    const when = formatAppointmentDate(appointment.date, appointment.time)
    if (settings.appointmentReminders) {
      const key = `appointment:${appointment.id}:${days === 0 ? 'today' : 'tomorrow'}`
      if (!notified.has(key)) {
        showNotification(
          days === 0 ? '오늘 병원 일정이 있어요' : '내일 병원 일정이 있어요',
          `${appointment.hospital} ${appointment.department} · ${when}`,
        )
        notified.add(key)
        changed = true
      }
    }

    if (settings.preparationReminders && days === 1 && !hasPreparedSummary) {
      const key = `preparation:${appointment.id}`
      if (!notified.has(key)) {
        showNotification('진료 준비를 해볼까요?', `${appointment.hospital} 진료 전에 궁금한 점을 질문 카드로 정리해 보세요.`)
        notified.add(key)
        changed = true
      }
    }
  }

  if (changed) saveNotifiedKeys(notified)
}

// 복용 시간이 지났는데 체크되지 않은 약이 있으면 하루에 한 번(시간대별) 알려준다.
export function checkMedicationReminders(medications: Medication[], intakes: MedicationIntake[], settings: UserSettings) {
  if (!notificationsSupported() || Notification.permission !== 'granted') return
  if (!settings.medicationReminders || medications.length === 0) return

  const today = todayDateKey()
  const now = new Date()
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const notified = loadNotifiedKeys()
  let changed = false

  for (const medication of medications) {
    for (const slot of medication.slots) {
      const [hour, minute] = medicationSlotTimes[slot].split(':').map(Number)
      if (nowMinutes < hour * 60 + minute) continue
      if (isIntakeTaken(intakes, medication.id, slot, today)) continue
      const key = `medication:${medication.id}:${slot}:${today}`
      if (notified.has(key)) continue
      showNotification(
        '약 드실 시간이에요',
        `${medicationSlotLabels[slot]} · ${medication.name}${medication.memo ? ` (${medication.memo})` : ''}`,
      )
      notified.add(key)
      changed = true
    }
  }

  if (changed) saveNotifiedKeys(notified)
}
