// ArtTime PWA Service Worker v1
const CACHE_NAME = 'arttime-v1'
const STATIC_CACHE = 'arttime-static-v1'
const API_CACHE = 'arttime-api-v1'

// Ресурсы для предзагрузки
const PRECACHE_URLS = [
  '/ru/judge',
  '/offline',
]

// ============================================================
// Install: предзагрузка оболочки приложения
// ============================================================
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      // Пробуем предзагрузить, но не падаем если не получилось
      return Promise.allSettled(
        PRECACHE_URLS.map(url =>
          fetch(url).then(r => r.ok ? cache.put(url, r) : null).catch(() => null)
        )
      )
    }).then(() => self.skipWaiting())
  )
})

// ============================================================
// Activate: очистка старых кэшей
// ============================================================
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME && k !== STATIC_CACHE && k !== API_CACHE)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  )
})

// ============================================================
// Fetch: стратегии кэширования
// ============================================================
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Игнорируем не-GET и chrome-extension
  if (request.method !== 'GET') return
  if (!url.protocol.startsWith('http')) return

  // API judge/scores — Network First (важно получать свежие данные)
  if (url.pathname.startsWith('/api/judge/')) {
    event.respondWith(networkFirst(request, API_CACHE))
    return
  }

  // Остальные API — только network
  if (url.pathname.startsWith('/api/')) {
    return
  }

  // _next/static — Cache First (immutable assets)
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request, STATIC_CACHE))
    return
  }

  // Страницы — Network First с offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Кэшируем только страницу судьи
          if (url.pathname.includes('/judge')) {
            const clone = response.clone()
            caches.open(STATIC_CACHE).then(c => c.put(request, clone))
          }
          return response
        })
        .catch(() => {
          // Офлайн: возвращаем кэш или страницу /offline
          return caches.match(request)
            .then(cached => cached || caches.match('/offline') || offlineFallback())
        })
    )
    return
  }

  // Картинки и шрифты — Cache First
  if (request.destination === 'image' || request.destination === 'font') {
    event.respondWith(cacheFirst(request, STATIC_CACHE))
    return
  }
})

// ============================================================
// Sync: фоновая синхронизация оценок при восстановлении сети
// ============================================================
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-scores') {
    event.waitUntil(syncPendingScores())
  }
})

async function syncPendingScores() {
  // Сигнализируем всем клиентам о начале синхронизации
  const clients = await self.clients.matchAll()
  clients.forEach(client => client.postMessage({ type: 'SYNC_START' }))
}

// ============================================================
// Push: уведомления (например, от организатора)
// ============================================================
self.addEventListener('push', (event) => {
  if (!event.data) return
  const data = event.data.json()
  event.waitUntil(
    self.registration.showNotification(data.title || 'ArtTime', {
      body: data.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: data.tag || 'arttime',
      data: { url: data.url || '/ru/judge' },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/ru/judge'
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(clients => {
      const existing = clients.find(c => c.url.includes('/judge'))
      if (existing) return existing.focus()
      return self.clients.openWindow(url)
    })
  )
})

// ============================================================
// Helpers
// ============================================================
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request)
  if (cached) return cached
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    return new Response('', { status: 503 })
  }
}

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    const cached = await caches.match(request)
    return cached || new Response(JSON.stringify({ error: 'offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

function offlineFallback() {
  return new Response(
    `<!DOCTYPE html>
    <html lang="ru">
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>ArtTime — Офлайн</title>
    <style>
      body { font-family: system-ui; display: flex; align-items: center; justify-content: center;
             min-height: 100vh; margin: 0; background: #FFFBFE; color: #1C1B1F; }
      .box { text-align: center; padding: 2rem; }
      h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
      p { color: #49454F; }
    </style>
    </head>
    <body>
      <div class="box">
        <div style="font-size:3rem">📡</div>
        <h1>Нет подключения</h1>
        <p>Проверьте интернет-соединение и попробуйте снова.</p>
        <button onclick="location.reload()" style="margin-top:1rem;padding:0.75rem 1.5rem;
          background:#6750A4;color:white;border:none;border-radius:100px;cursor:pointer;font-size:1rem">
          Повторить
        </button>
      </div>
    </body>
    </html>`,
    { headers: { 'Content-Type': 'text/html' } }
  )
}
