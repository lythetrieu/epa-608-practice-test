'use client'

// Local-first data layer (Perf Phase 3).
//
// Pattern: a page's client component renders INSTANTLY from the last snapshot
// in localStorage (0 network), then fetches fresh JSON in the background and
// re-renders + re-caches when it lands. Tab switches feel native-app instant
// even on high-latency connections; the data is at most one visit stale.
//
// Privacy: every cache key MUST embed the user id (e.g. `dashboard:${userId}`)
// so two accounts on one device never see each other's snapshot, and
// clearLocalFirstCache() must be called on sign-out.

import { useCallback, useEffect, useState } from 'react'

const PREFIX = 'epa608:lf:'
// Bump when a cached payload's SHAPE changes — stale-version entries are ignored.
const VERSION = 1

type Envelope<T> = { v: number; t: number; data: T }

export function readCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (!raw) return null
    const env = JSON.parse(raw) as Envelope<T>
    if (env.v !== VERSION) return null
    return env.data
  } catch {
    return null
  }
}

export function writeCache<T>(key: string, data: T): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify({ v: VERSION, t: Date.now(), data }))
  } catch {
    /* quota exceeded / private mode — cache is best-effort */
  }
}

export function removeCache(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key)
  } catch {
    /* ignore */
  }
}

export function clearLocalFirstCache(): void {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i)
      if (k?.startsWith(PREFIX)) localStorage.removeItem(k)
    }
  } catch {
    /* ignore */
  }
}

/**
 * Warm a cache entry without React — used for idle prefetching of the OTHER
 * tabs' data while the user sits on the current one. Skips the network if the
 * cached entry is younger than maxAgeMs.
 */
export async function prefetchLocalFirst(key: string, url: string, maxAgeMs = 30_000): Promise<void> {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (raw) {
      const env = JSON.parse(raw) as Envelope<unknown>
      if (env.v === VERSION && Date.now() - env.t < maxAgeMs) return
    }
    const res = await fetch(url, { credentials: 'same-origin' })
    if (!res.ok) return
    writeCache(key, await res.json())
  } catch {
    /* prefetch is opportunistic — never surface errors */
  }
}

/**
 * Stale-while-revalidate against localStorage.
 *
 * - `data`   — cached snapshot immediately after mount, fresh payload once fetched.
 * - `fresh`  — true only after a successful fetch THIS mount. Gate anything that
 *              must not fire on stale data (onboarding tours, "0 tests" empty
 *              states) on this flag.
 * - `refreshing` — a fetch is in flight (initial or manual refresh()).
 * - `error`  — the fetch failed AND there is no cached data to show.
 *
 * Cache reading happens in useEffect (not the useState initializer) so the
 * first client render matches the server-rendered HTML — avoids hydration
 * mismatches at the cost of one extra ~16ms skeleton frame.
 */
export function useLocalFirst<T>(key: string, url: string) {
  const [data, setData] = useState<T | null>(null)
  const [fresh, setFresh] = useState(false)
  const [refreshing, setRefreshing] = useState(true)
  const [failed, setFailed] = useState(false)

  const refresh = useCallback(async () => {
    setRefreshing(true)
    try {
      const res = await fetch(url, { credentials: 'same-origin' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const payload = (await res.json()) as T
      writeCache(key, payload)
      setData(payload)
      setFresh(true)
      setFailed(false)
    } catch {
      setFailed(true)
    } finally {
      setRefreshing(false)
    }
  }, [key, url])

  useEffect(() => {
    setFresh(false)
    setData(readCache<T>(key))
    void refresh()
  }, [key, refresh])

  return { data, fresh, refreshing, error: failed && data === null, refresh }
}
