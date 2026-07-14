// 메디버디 알림용 서비스 워커.
// 모바일 브라우저는 페이지에서 직접 new Notification()을 지원하지 않으므로
// registration.showNotification()을 쓰기 위해 등록한다.
self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const client = clients.find((item) => 'focus' in item)
      if (client) return client.focus()
      return self.clients.openWindow('/')
    }),
  )
})
