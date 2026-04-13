// EPA 608 Practice Test — Service Worker v2
// Strategy: Cache-first for static assets, Network-first for pages
// Offline: serve cached pages + offline fallback page

const CACHE_VERSION = 'epa608-v2'
const STATIC_CACHE = `${CACHE_VERSION}-static`
const PAGE_CACHE = `${CACHE_VERSION}-pages`

// Static asset extensions — cache-first
const STATIC_EXT = /\.(js|css|png|jpg|jpeg|svg|ico|woff2?|ttf|eot|json)$/

// Pages to pre-cache on install
const PRECACHE_PAGES = [
  '/dashboard',
  '/login',
]

// Offline fallback HTML
const OFFLINE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>EPA 608 — Offline</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100dvh;background:#f1f5f9;color:#1e293b;padding:24px}
.card{text-align:center;max-width:400px;background:#fff;border-radius:16px;padding:40px 24px;border:1px solid #e2e8f0}
h1{font-size:22px;margin-bottom:8px}
p{color:#64748b;font-size:15px;margin-bottom:24px;line-height:1.5}
.btn{display:inline-block;background:#1e40af;color:#fff;border:none;padding:14px 28px;border-radius:12px;font-size:16px;font-weight:600;cursor:pointer;text-decoration:none;min-height:48px}
.btn:active{background:#1e3a8a}
.tip{margin-top:20px;font-size:13px;color:#94a3b8}
</style>
</head>
<body>
<div class="card">
<h1>You're Offline</h1>
<p>No internet connection detected. If you've downloaded questions for offline study, tap Practice below.</p>
<a href="/test/core?mode=practice" class="btn">Practice Offline</a>
<p class="tip">Tip: sync questions from Dashboard when you're online so offline practice works.</p>
</div>
</body>
</html>`

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(PAGE_CACHE).then((cache) =>
      Promise.allSettled(
        PRECACHE_PAGES.map((url) => cache.add(url).catch(() => {}))
      )
    )
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => !key.startsWith(CACHE_VERSION))
          .map((key) => caches.delete(key))
      )
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Only handle same-origin GET requests
  if (url.origin !== self.location.origin || request.method !== 'GET') return

  // Static assets (.js, .css, .json, images) — cache-first
  if (STATIC_EXT.test(url.pathname)) {
    event.respondWith(cacheFirst(request))
    return
  }

  // API routes — network-only (don't cache auth-dependent responses)
  if (url.pathname.startsWith('/api/')) {
    return // let browser handle normally
  }

  // Auth routes — network-only
  if (url.pathname.startsWith('/auth/')) {
    return
  }

  // Pages (navigation) — network-first with offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstPage(request))
    return
  }
})

async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached

  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    return new Response('', { status: 503 })
  }
}

async function networkFirstPage(request) {
  try {
    const response = await fetch(request)
    // Cache successful page loads for offline use
    if (response.ok && response.status === 200) {
      const cache = await caches.open(PAGE_CACHE)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    // Offline — try cache
    const cached = await caches.match(request)
    if (cached) return cached

    // No cache — show offline page
    return new Response(OFFLINE_HTML, {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    })
  }
}
