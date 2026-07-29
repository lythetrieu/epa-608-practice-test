// Behaviour analytics — what people DO, as opposed to how many of them exist.
//
// The existing analytics page counts only submitted tests, so a quiz someone
// opened and walked away from leaves no trace at all. That is worth measuring
// whatever the number turns out to be.
//
// Everything here excludes the e2e personas, and that exclusion is not a
// nicety. CI drives them eight times a day and they abandon 100% of the
// sessions they start, against 17% for real students — read together the two
// populations average to 65%, a crisis that exists only in the arithmetic.
// Every rate on this page is wrong by a similar margin if they are left in.

import { createAdminClient } from '@/lib/supabase/server'

const TEST_DOMAIN = '@epa608-test.local'

/** Metrics are windowed so the queries stay bounded as the tables grow. */
export const WINDOW_DAYS = 30

export type Funnel = {
  anonStarts: number
  anonFinished: number
  signups: number
  tookAQuiz: number
  cameBack: number
  paid: number
}

export type Abandon = { category: string; started: number; finished: number; rate: number }
export type HardQuestion = { questionId: string; attempts: number; accuracy: number }

export type Behaviour = {
  windowDays: number
  /** True when the answer stream hit the safety cap — figures below undercount. */
  truncated: boolean
  funnel: Funnel
  abandonOverall: { started: number; finished: number; rate: number }
  abandonByCategory: Abandon[]
  hardest: HardQuestion[]
  medianSecsPerQuestion: number | null
  aiAdoption: { tried: number; ofUsers: number }
  returnRate: { returned: number; ofUsers: number }
}

/**
 * PostgREST answers an unbounded select with at most 1000 rows and says nothing
 * about the rest. The first draft of this file asked for 30 days of
 * user_progress, got 1000 of 13,520 rows back, and would have computed every
 * accuracy and pace figure on that arbitrary 7% while looking perfectly
 * healthy. Page through explicitly, and if the cap is ever hit, return the flag
 * so the page can say so instead of quietly rounding a lie.
 */
async function fetchAllRows<T>(
  query: (from: number, to: number) => PromiseLike<{ data: T[] | null }>,
  maxRows = 60_000,
): Promise<{ rows: T[]; truncated: boolean }> {
  const PAGE = 1000
  const rows: T[] = []
  for (let from = 0; from < maxRows; from += PAGE) {
    const { data } = await query(from, from + PAGE - 1)
    const batch = data ?? []
    rows.push(...batch)
    if (batch.length < PAGE) return { rows, truncated: false }
  }
  return { rows, truncated: true }
}

export async function getBehaviour(): Promise<Behaviour> {
  const admin = createAdminClient()
  const since = new Date(Date.now() - WINDOW_DAYS * 86_400_000).toISOString()

  const { data: profiles } = await admin.from('users_profile').select('id, email, lifetime_access, created_at')
  const real = (profiles ?? []).filter((p) => !String(p.email ?? '').endsWith(TEST_DOMAIN))
  const realIds = new Set(real.map((p) => p.id))

  const [startsRes, anonRes, sessionsRes, progressRes, chatsRes] = await Promise.all([
    admin.from('anonymous_starts').select('*', { count: 'exact', head: true }).gte('started_at', since),
    admin.from('anonymous_sessions').select('*', { count: 'exact', head: true }).not('submitted_at', 'is', null).gte('started_at', since),
    // Paged for the same reason as the answer stream: today this is ~200 rows
    // in a window, but the ceiling is silent and the failure looks like health.
    fetchAllRows<{ user_id: string; category: string | null; started_at: string; submitted_at: string | null }>(
      (from, to) =>
        admin
          .from('test_sessions')
          .select('user_id, category, started_at, submitted_at')
          .gte('started_at', since)
          .order('started_at', { ascending: false })
          .range(from, to),
    ),
    // Paged: this table is the one that outgrows PostgREST's 1000-row ceiling.
    fetchAllRows<{ user_id: string; question_id: string; correct: boolean; answered_at: string | null; time_ms: number | null }>(
      (from, to) =>
        admin
          .from('user_progress')
          .select('user_id, question_id, correct, answered_at, time_ms')
          .gte('answered_at', since)
          .order('answered_at', { ascending: false })
          .range(from, to),
    ),
    admin.from('ai_chat_sessions').select('user_id').gte('created_at', since),
  ])

  const sessions = sessionsRes.rows.filter((s) => realIds.has(s.user_id))
  const progress = progressRes.rows.filter((p) => realIds.has(p.user_id))
  const progressTruncated = progressRes.truncated

  // ── Abandonment ─────────────────────────────────────────────────────────
  const started = sessions.length
  const finished = sessions.filter((s) => s.submitted_at).length
  const byCat = new Map<string, { started: number; finished: number }>()
  for (const s of sessions) {
    const k = s.category ?? '?'
    const e = byCat.get(k) ?? { started: 0, finished: 0 }
    e.started++
    if (s.submitted_at) e.finished++
    byCat.set(k, e)
  }
  const abandonByCategory: Abandon[] = [...byCat.entries()]
    .map(([category, v]) => ({
      category,
      started: v.started,
      finished: v.finished,
      rate: v.started ? 1 - v.finished / v.started : 0,
    }))
    .sort((a, b) => b.rate - a.rate)

  // ── Funnel ──────────────────────────────────────────────────────────────
  // Stages are counts within the window, NOT a tracked cohort: the people who
  // signed up this month are mostly not the ones who started anonymously this
  // month. Useful for shape and order-of-magnitude, misleading if read as
  // "X of these exact people converted".
  const quizUsers = new Set(sessions.map((s) => s.user_id))
  const dayKey = (d: string) => d.slice(0, 10)
  const daysByUser = new Map<string, Set<string>>()
  for (const p of progress) {
    if (!p.answered_at) continue
    const set = daysByUser.get(p.user_id) ?? new Set<string>()
    set.add(dayKey(p.answered_at))
    daysByUser.set(p.user_id, set)
  }
  const cameBack = [...daysByUser.values()].filter((d) => d.size >= 2).length

  const funnel: Funnel = {
    anonStarts: startsRes.count ?? 0,
    anonFinished: anonRes.count ?? 0,
    signups: real.filter((p) => p.created_at >= since).length,
    tookAQuiz: quizUsers.size,
    cameBack,
    paid: real.filter((p) => p.lifetime_access).length,
  }

  // ── Hardest questions ───────────────────────────────────────────────────
  // Only questions with enough attempts to mean anything; a single wrong answer
  // is noise, not a difficulty signal.
  const perQ = new Map<string, { n: number; ok: number }>()
  for (const p of progress) {
    const e = perQ.get(p.question_id) ?? { n: 0, ok: 0 }
    e.n++
    if (p.correct) e.ok++
    perQ.set(p.question_id, e)
  }
  const hardest: HardQuestion[] = [...perQ.entries()]
    .filter(([, v]) => v.n >= 8)
    .map(([questionId, v]) => ({ questionId, attempts: v.n, accuracy: v.ok / v.n }))
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 12)

  // ── Pace ────────────────────────────────────────────────────────────────
  // Median, not mean: a single answer left open over lunch drags an average
  // into nonsense.
  const times = progress.map((p) => p.time_ms).filter((t): t is number => typeof t === 'number' && t > 0).sort((a, b) => a - b)
  const medianSecsPerQuestion = times.length ? Math.round(times[Math.floor(times.length / 2)] / 100) / 10 : null

  const aiUsers = new Set((chatsRes.data ?? []).map((c) => c.user_id).filter((id) => realIds.has(id)))

  return {
    windowDays: WINDOW_DAYS,
    truncated: progressTruncated || sessionsRes.truncated,
    funnel,
    abandonOverall: { started, finished, rate: started ? 1 - finished / started : 0 },
    abandonByCategory,
    hardest,
    medianSecsPerQuestion,
    aiAdoption: { tried: aiUsers.size, ofUsers: real.length },
    returnRate: { returned: cameBack, ofUsers: quizUsers.size },
  }
}
