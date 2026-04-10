// EPA 608 Practice Test — Service Worker
// Strategy: Cache-first for static assets, Network-first for API calls
// Special handling: cache /api/offline/questions for full offline practice

const CACHE_VERSION = 'epa608-v1'
const STATIC_CACHE = `${CACHE_VERSION}-static`
const API_CACHE = `${CACHE_VERSION}-api`

// App shell URLs to pre-cache on install
const APP_SHELL = [
  '/',
  '/dashboard',
  '/practice/core',
  '/practice/type-1',
  '/practice/type-2',
  '/practice/type-3',
  '/practice/universal',
]

// Static asset extensions that should use cache-first
const STATIC_EXTENSIONS = /\.(js|css|png|jpg|jpeg|svg|ico|woff2?|ttf|eot)$/

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      // Pre-cache app shell — don't fail install if some pages 404
      return Promise.allSettled(
        APP_SHELL.map((url) =>
          cache.add(url).catch((err) => {
            console.warn(`[SW] Failed to pre-cache ${url}:`, err.message)
          })
        )
      )
    })
  )
  // Activate immediately without waiting for old SW to finish
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== API_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  )
  // Take control of all open tabs immediately
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return

  // Skip non-GET requests
  if (request.method !== 'GET') return

  // --- API routes: network-first ---
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request, API_CACHE))
    return
  }

  // --- Static assets: cache-first ---
  if (STATIC_EXTENSIONS.test(url.pathname)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE))
    return
  }

  // --- Pages (HTML navigation): network-first ---
  event.respondWith(networkFirst(request, STATIC_CACHE))
})

// ─── Strategies ───────────────────────────────────────────────────────────────

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
    // Offline and not in cache — return a basic offline response
    return new Response('Offline', { status: 503, statusText: 'Offline' })
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
    // Network failed — try cache
    const cached = await caches.match(request)
    if (cached) return cached

    // For navigation requests, return a basic offline page
    if (request.mode === 'navigate') {
      return new Response(
        `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>EPA 608 — Offline</title>
<style>
  body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f9fafb;color:#1e293b}
  .card{text-align:center;padding:2rem;max-width:400px}
  h1{font-size:1.5rem;margin-bottom:.5rem}
  p{color:#64748b;margin-bottom:1.5rem}
  button{background:#1e40af;color:#fff;border:none;padding:.75rem 1.5rem;border-radius:.5rem;font-size:1rem;cursor:pointer}
</style></head>
<body><div class="card">
  <h1>You're Offline</h1>
  <p>No internet connection. If you've synced your questions, open the app from your home screen to use offline practice mode.</p>
  <button onclick="location.reload()">Try Again</button>
</div></body></html>`,
        { status: 200, headers: { 'Content-Type': 'text/html' } }
      )
    }

    return new Response('Offline', { status: 503, statusText: 'Offline' })
  }
}
