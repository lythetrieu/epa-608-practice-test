'use client'

// Quiz Engine v2 — LOCAL QUESTION BANK.
//
// Logged-in users download the full question bank once (GET
// /api/app/question-bank) and cache it in localStorage via the local-first
// envelope (prefix epa608:lf: → automatically wiped by clearLocalFirstCache()
// on sign-out, and keyed per user so accounts sharing a device never see each
// other's bank). Quizzes then pick questions on-device with ZERO network and
// post answers once, at the end, to POST /api/app/submit for server grading.

import { readCache, writeCache } from '@/lib/local-first'

// Must match BANK_VERSION in src/app/api/app/question-bank/route.ts — bump
// BOTH when the row shape changes; mismatched cached payloads are refetched.
const BANK_VERSION = 1

/** Refetch the bank when the cached copy is older than this. */
const BANK_TTL_MS = 24 * 60 * 60 * 1000

/**
 * One bank question — exactly the shape /api/app/question-bank returns.
 * Includes the correct answer + explanation by design (every account is
 * entitled to the full bank; grading of record still happens server-side).
 */
export type BankQuestion = {
  id: string
  category: 'Core' | 'Type I' | 'Type II' | 'Type III'
  subtopic_id: string | null
  question: string
  options: string[]
  /** 'multi_select' for select-all-that-apply; anything else = single choice. */
  question_type: string | null
  difficulty: 'easy' | 'medium' | 'hard'
  answer_text: string
  /** Correct option set for multi_select questions (null otherwise). */
  correct_answers: string[] | null
  explanation: string
  source_ref: string
}

export type BankPayload = {
  v: number
  fetchedAt: string
  questions: BankQuestion[]
}

export const QBANK_KEY = (userId: string) => `qbank:${userId}`

function isValidPayload(p: BankPayload | null): p is BankPayload {
  return (
    p !== null &&
    p.v === BANK_VERSION &&
    typeof p.fetchedAt === 'string' &&
    Array.isArray(p.questions) &&
    p.questions.length > 0
  )
}

/** Sync, cache-only read. Null when no valid cached bank exists (any age). */
export function readQuestionBank(userId: string): BankQuestion[] | null {
  const cached = readCache<BankPayload>(QBANK_KEY(userId))
  return isValidPayload(cached) ? cached.questions : null
}

/**
 * Returns the local bank, downloading/refreshing it when missing or older
 * than 24h. On fetch failure a stale cached bank is still returned (better
 * offline than nothing); null only when there is no usable bank at all —
 * callers fall back to the server-picked /api/questions flow.
 */
export async function ensureQuestionBank(userId: string): Promise<BankQuestion[] | null> {
  const cached = readCache<BankPayload>(QBANK_KEY(userId))
  const valid = isValidPayload(cached) ? cached : null

  if (valid && Date.now() - Date.parse(valid.fetchedAt) < BANK_TTL_MS) {
    return valid.questions
  }

  try {
    const res = await fetch('/api/app/question-bank', { credentials: 'same-origin' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const payload = (await res.json()) as BankPayload
    if (!isValidPayload(payload)) throw new Error('bad payload')
    writeCache(QBANK_KEY(userId), payload)
    return payload.questions
  } catch {
    // Offline / rate-limited / server error: a stale bank still beats a
    // network dependency. Null only when we truly have nothing.
    return valid ? valid.questions : null
  }
}

/** In-place Fisher-Yates. Returns the same array for chaining. */
function fisherYates<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

// UNIVERSAL MIX — copied verbatim from the `category === 'Universal'` branch
// of src/app/api/questions/route.ts: it iterates
// TIER_LIMITS[tier].categories = ['Core','Type I','Type II','Type III','Universal']
// (identical for every tier) and draws Math.floor(count / cats.length) random
// questions PER entry. 'Universal' itself matches no bank rows, so a
// count=100 Universal exam draws floor(100/5)=20 per real category = 80
// questions total. That quirk is intentional here — the local pick must be
// indistinguishable from the server's.
const UNIVERSAL_MIX_CATEGORIES = ['Core', 'Type I', 'Type II', 'Type III', 'Universal'] as const

/**
 * Picks a quiz's questions from the local bank — the client-side equivalent
 * of what /api/questions assembles server-side.
 *
 * Selection is always random (Fisher-Yates sample, mirroring the RPC's
 * ORDER BY random()) EXCEPT when `questionIds` is given, which returns those
 * questions in the given order. `shuffle: false` additionally skips the final
 * question-order and per-question option shuffles (default true — the server
 * shuffles options so the correct answer isn't positionally biased).
 */
export function pickQuestions(
  bank: BankQuestion[],
  opts: {
    count: number
    /** 'Universal' = the same 4-category mix /api/questions builds (see above). */
    category?: string
    /** For weak-spot drills / Study Path concepts. */
    subtopicIds?: string[]
    /** Explicit set (e.g. retry-these-questions). */
    questionIds?: string[]
    shuffle?: boolean
  },
): BankQuestion[] {
  const { count, category, subtopicIds, questionIds } = opts
  const shuffle = opts.shuffle !== false

  let picked: BankQuestion[]

  if (questionIds && questionIds.length > 0) {
    const byId = new Map(bank.map((q) => [q.id, q]))
    picked = questionIds
      .map((id) => byId.get(id))
      .filter((q): q is BankQuestion => q !== undefined)
      .slice(0, count)
  } else {
    let candidates = bank
    if (subtopicIds && subtopicIds.length > 0) {
      const wanted = new Set(subtopicIds)
      candidates = candidates.filter((q) => q.subtopic_id !== null && wanted.has(q.subtopic_id))
    }

    if (category === 'Universal') {
      const perCat = Math.floor(count / UNIVERSAL_MIX_CATEGORIES.length)
      picked = []
      for (const cat of UNIVERSAL_MIX_CATEGORIES) {
        const pool = candidates.filter((q) => q.category === cat)
        picked.push(...fisherYates([...pool]).slice(0, perCat))
      }
    } else {
      if (category) candidates = candidates.filter((q) => q.category === category)
      picked = fisherYates([...candidates]).slice(0, count)
    }
  }

  if (shuffle) fisherYates(picked)

  // Per-question option shuffle on COPIES (never mutate the cached bank),
  // matching the server response from /api/questions.
  return picked.map((q) => (shuffle ? { ...q, options: fisherYates([...q.options]) } : q))
}
