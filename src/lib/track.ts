// Shared, fire-and-forget telemetry helper.
//
// Buffers events client-side and POSTs them to /api/events in small batches.
// EVERYTHING here is best-effort: every path is wrapped in try/catch, nothing
// throws, nothing blocks the UI, and nothing is awaited in a render path. Safe
// to import and call from any 'use client' component.
//
// Server is authoritative — we never read telemetry back from localStorage.
// The buffer lives in memory only; on unload we attempt a sendBeacon flush so
// in-flight events aren't lost, but dropping events is acceptable by design.

type TrackPayload = {
  conceptId?: string
  questionId?: string
  assetId?: string
  sessionId?: string
  payload?: Record<string, unknown>
} & Record<string, unknown>

type TrackEvent = {
  eventType: string
  ts: string
  conceptId?: string
  questionId?: string
  assetId?: string
  sessionId?: string
  payload?: Record<string, unknown>
}

const FLUSH_AT = 5 // flush once this many events are buffered
const FLUSH_MS = 3000 // ...or after this long, whichever comes first
const MAX_BATCH = 50 // API contract: max 50 events per POST

let buffer: TrackEvent[] = []
let timer: ReturnType<typeof setTimeout> | null = null
let listenersBound = false

function isBrowser(): boolean {
  return typeof window !== 'undefined'
}

function clearTimer() {
  if (timer !== null) {
    clearTimeout(timer)
    timer = null
  }
}

// POST a batch with fetch. keepalive lets the request outlive a navigation in
// most browsers; failures are swallowed.
function postBatch(events: TrackEvent[]) {
  if (events.length === 0) return
  try {
    fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events }),
      keepalive: true,
    }).catch(() => {})
  } catch {
    /* never throw */
  }
}

// On pagehide/hidden we prefer sendBeacon — it's the only transport guaranteed
// to survive unload. Falls back to keepalive fetch.
function beaconBatch(events: TrackEvent[]) {
  if (events.length === 0) return
  try {
    const body = JSON.stringify({ events })
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([body], { type: 'application/json' })
      const ok = navigator.sendBeacon('/api/events', blob)
      if (ok) return
    }
    postBatch(events)
  } catch {
    /* never throw */
  }
}

function flush(viaBeacon = false) {
  try {
    clearTimer()
    if (buffer.length === 0) return
    // Drain in chunks of MAX_BATCH so we always honor the API contract.
    const pending = buffer
    buffer = []
    for (let i = 0; i < pending.length; i += MAX_BATCH) {
      const chunk = pending.slice(i, i + MAX_BATCH)
      if (viaBeacon) beaconBatch(chunk)
      else postBatch(chunk)
    }
  } catch {
    /* never throw */
  }
}

function bindUnloadListeners() {
  if (listenersBound || !isBrowser()) return
  listenersBound = true
  try {
    const onHide = () => flush(true)
    window.addEventListener('pagehide', onHide)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flush(true)
    })
  } catch {
    /* never throw */
  }
}

/**
 * Record a telemetry event. Fire-and-forget — returns void immediately and
 * never throws. Buffers and batches behind the scenes.
 */
export function track(eventType: string, payload: TrackPayload = {}) {
  try {
    if (!isBrowser() || !eventType) return
    bindUnloadListeners()

    const { conceptId, questionId, assetId, sessionId, payload: meta, ...rest } = payload
    const event: TrackEvent = {
      eventType,
      ts: new Date().toISOString(),
      ...(conceptId ? { conceptId } : {}),
      ...(questionId ? { questionId } : {}),
      ...(assetId ? { assetId } : {}),
      ...(sessionId ? { sessionId } : {}),
    }
    // Merge any extra keys passed inline into payload so nothing is lost.
    const extra = { ...rest, ...(meta || {}) }
    if (Object.keys(extra).length > 0) event.payload = extra

    buffer.push(event)

    if (buffer.length >= FLUSH_AT) {
      flush()
      return
    }
    if (timer === null) {
      timer = setTimeout(() => flush(), FLUSH_MS)
    }
  } catch {
    /* never throw */
  }
}

/** Force an immediate flush (e.g. before a known navigation). Best-effort. */
export function flushTrack() {
  flush()
}
