// 메디버디 알림용 서비스 워커.
// 모바일 브라우저는 페이지에서 직접 new Notification()을 지원하지 않으므로
// registration.showNotification()을 쓰기 위해 등록한다.
self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch {
    payload = { body: event.data?.text() ?? '' }
  }
  event.waitUntil(self.registration.showNotification(payload.title || '메디버디 알림', {
    body: payload.body || '진료 일정을 확인해 주세요.',
    icon: '/medibuddy-icon.svg',
    badge: '/medibuddy-icon.svg',
    tag: payload.type || 'medibuddy-reminder',
    data: { url: payload.url || '/' },
  }))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const targetUrl = new URL(event.notification.data?.url || '/', self.location.origin).href
      const client = clients.find((item) => item.url === targetUrl) || clients.find((item) => 'focus' in item)
      if (client) {
        if ('navigate' in client) client.navigate(targetUrl)
        return client.focus()
      }
      return self.clients.openWindow(targetUrl)
    }),
  )
})
