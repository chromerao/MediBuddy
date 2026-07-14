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

export async function enableBackgroundNotifications(): Promise<string> {
  if (!notificationsSupported() || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('이 브라우저에서는 백그라운드 알림을 지원하지 않아요.')
  }
  const permission = await requestNotificationPermission()
  if (permission !== 'granted') throw new Error('브라우저 알림 권한을 허용해 주세요.')
  const configResponse = await fetch('/api/notifications/config', { credentials: 'same-origin' })
  const config = await configResponse.json() as { configured?: boolean; publicKey?: string | null }
  if (!configResponse.ok || !config.configured || !config.publicKey) throw new Error('서버의 백그라운드 알림 키가 아직 설정되지 않았어요.')

  const registration = await navigator.serviceWorker.ready
  const existing = await registration.pushManager.getSubscription()
  const subscription = existing ?? await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(config.publicKey),
  })
  const response = await fetch('/api/notifications/subscribe', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscription.toJSON()),
  })
  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as { error?: string }
    throw new Error(payload.error ?? '백그라운드 알림을 등록하지 못했어요.')
  }
  return '앱을 닫아도 진료 일정 알림을 받을 수 있어요.'
}

export async function disableBackgroundNotifications() {
  if (!('serviceWorker' in navigator)) return
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager?.getSubscription()
  if (!subscription) return
  await fetch('/api/notifications/subscribe', {
    method: 'DELETE',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  }).catch(() => undefined)
  await subscription.unsubscribe()
}

function urlBase64ToUint8Array(value: string) {
  const padding = '='.repeat((4 - value.length % 4) % 4)
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)))
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

export function checkAppointmentReminders(appointments: MedicalAppointment[], settings: UserSettings) {
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

    if (settings.preparationReminders && days === 1 && appointment.preparation?.status !== 'ready') {
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
