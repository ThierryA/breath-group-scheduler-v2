const CACHE_NAME = 'breath-group-v2'
const PRECACHE_URLS = [
  '/',
  '/favicon.png',
  '/manifest.json'
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  // Network-first for API calls
  if (event.request.url.includes('/api/') || event.request.url.includes('backend.blink.new')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    )
    return
  }
  // Cache-first for static assets
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        }
        return response
      }).catch(() => cached)
      return cached || fetchPromise
    })
  )
})

/* ----------------------------------------------------------------
   Push Notification Handlers
---------------------------------------------------------------- */

self.addEventListener('push', (event) => {
  let data = { title: 'Breath Group', body: 'You have a new notification' }

  if (event.data) {
    try {
      data = event.data.json()
    } catch (_e) {
      data.body = event.data.text()
    }
  }

  const options = {
    body: data.body || data.message || 'New notification',
    icon: '/favicon.png',
    badge: '/favicon.png',
    tag: data.tag || 'breath-group-notification',
    data: {
      url: data.url || '/',
      notificationId: data.notificationId || null,
    },
    vibrate: [100, 50, 100],
    actions: [],
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'Breath Group', options)
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const targetUrl = event.notification.data?.url || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Try to focus an existing window
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus()
          if (targetUrl !== '/') {
            client.navigate(targetUrl)
          }
          return
        }
      }
      // Open a new window if none found
      return self.clients.openWindow(targetUrl)
    })
  )
})
