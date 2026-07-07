'use client'

// Quiz Engine v2 — offline safety net for local-bank submits.
//
// A local-bank quiz (src/lib/question-bank.ts) has NO server session until the
// final POST /api/app/submit. If that POST fails on the network, the graded
// outcome would be lost — so we park the exact request body here (localStorage,
// epa608:lf: envelope → wiped by clearLocalFirstCache() on sign-out and keyed
// per user) and retry it once on the next app load.
//
// Semantics: ONE pending submit per user (last failure wins — losing an older
// unsent quiz to a newer one is acceptable), one retry attempt per page load,
// dropped after a success, a permanent 4xx rejection, or 7 days.

import { readCache, writeCache, removeCache } from '@/lib/local-first'

/** Exact request body of POST /api/app/submit (see its zod schema). */
export type PendingSubmitPayload = {
  category: string
  mode: 'practice' | 'exam' | 'drill'
  time_limit_secs: number | null
  started_at: string
  answers: { question_id: string; selected: string }[]
}

type PendingSubmit = {
  savedAt: number
  payload: PendingSubmitPayload
}

const KEY = (userId: string) => `pendingSubmit:${userId}`
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

export function savePendingSubmit(userId: string, payload: PendingSubmitPayload): void {
  writeCache<PendingSubmit>(KEY(userId), { savedAt: Date.now(), payload })
}

// One attempt per page load per user — module-level, resets on full reload.
const attempted = new Set<string>()

/**
 * Fire-and-forget retry of a parked submit. Call on app/quiz-surface mount.
 * Keeps the entry only when the failure looks transient (network error, 401,
 * 429, 5xx); drops it on success, permanent 4xx, or age > 7 days.
 */
export async function flushPendingSubmit(userId: string): Promise<void> {
  if (attempted.has(userId)) return
  attempted.add(userId)

  const pending = readCache<PendingSubmit>(KEY(userId))
  if (!pending?.payload) return
  if (Date.now() - pending.savedAt > MAX_AGE_MS) {
    removeCache(KEY(userId))
    return
  }

  try {
    const res = await fetch('/api/app/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(pending.payload),
    })
    // Success → done. Permanent client rejection (bad payload, forbidden) →
    // retrying will never help, drop it. 401/429/5xx → keep for next load.
    if (res.ok || (res.status >= 400 && res.status < 500 && res.status !== 401 && res.status !== 429)) {
      removeCache(KEY(userId))
    }
  } catch {
    /* still offline — keep the entry and retry on the next load */
  }
}
