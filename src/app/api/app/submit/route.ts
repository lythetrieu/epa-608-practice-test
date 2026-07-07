import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserProfile } from '@/lib/supabase/auth'
import { submitRateLimit } from '@/lib/ratelimit'
import { canonicalMulti, isMulti } from '@/lib/multi'
import { filterRowsToPool } from '@/lib/question-pool'
import { z } from 'zod'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Quiz Engine v2 — server-graded finish for CLIENT-picked quizzes.
//
// Local-bank quizzes pick their questions on-device (src/lib/question-bank.ts)
// with zero network, then post the answers here once. This endpoint replicates
// EVERY side effect of the legacy /api/sessions/[sessionId]/submit flow:
//   1. RE-GRADES every answer against the DB (client is_correct is never
//      trusted — the client bank does contain answers, but the session score
//      of record comes from this re-grade).
//   2. Creates the test_sessions row (submitted_at = now, score/total from the
//      re-grade) — feeds history, dashboard streak/stats, readiness.
//   3. Inserts one user_progress row per question — feeds Weak Spots
//      (get_weak_spot_questions RPC + progress pages) and per-question stats.
//      Rich columns (user_answer/source, migration 20260630) with a minimal
//      fallback, matching /api/practice/track.
//   4. Universal per-section pass rules and Type I 84% (open-book) threshold,
//      identical to the legacy submit route.
//
// 'study' mode is intentionally NOT accepted: Study Path mastery submits go
// through /api/study-path/progress (study_path_progress) + /api/practice/track
// and never create test_sessions today — duplicating that here would
// double-count Study Path work.
//
// Server-side timer enforcement is NOT possible here (the session is created
// at submit time; started_at is client-reported and only stored for stats,
// clamped to a sane window).

const MODES = ['practice', 'exam', 'drill'] as const
// 'Weak Spots' is the stored category for drill sessions (matches the
// blind-spot branch of /api/questions).
const CATEGORIES = ['Core', 'Type I', 'Type II', 'Type III', 'Universal', 'Weak Spots'] as const

const schema = z.object({
  category: z.enum(CATEGORIES),
  mode: z.enum(MODES),
  time_limit_secs: z.number().int().min(0).max(14400).nullable(),
  started_at: z.string().refine((s) => !Number.isNaN(Date.parse(s)), 'invalid datetime'),
  answers: z
    .array(
      z.object({
        question_id: z.string().min(1).max(100),
        // Same format the legacy submit uses: option text, or canonicalMulti()
        // of the selected set for multi_select questions.
        selected: z.string().max(4000),
      }),
    )
    .min(1)
    .max(100),
})

// Postgres "undefined column" — rich user_progress columns not ALTERed in yet.
const UNDEFINED_COLUMN = '42703'

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  const { category, mode, time_limit_secs, started_at, answers } = parsed.data

  // Rate limit keyed by user id (authenticated write endpoint).
  const [{ success: ok }, profile] = await Promise.all([
    submitRateLimit.limit(`app:${user.id}`),
    getUserProfile(user.id),
  ])
  if (!ok) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })

  // Last answer wins per question (Record semantics of the legacy route).
  const answerByQuestion = new Map<string, string>()
  for (const a of answers) answerByQuestion.set(a.question_id, a.selected)
  const questionIds = Array.from(answerByQuestion.keys())

  const admin = createAdminClient()

  // Re-grade against the DB — never trust client grading.
  const { data: questions, error: qErr } = await admin
    .from('questions')
    .select('id, category, answer_text, explanation, source_ref, question_type, correct_answers')
    .in('id', questionIds)
    .eq('verified', true)

  if (qErr || !questions) {
    return NextResponse.json({ error: 'Failed to grade' }, { status: 500 })
  }

  // Belt-and-braces entitlement guard (mirrors /api/questions): drop ids
  // outside the user's pool. No-op today (all tiers = full bank).
  const tier = profile?.tier ?? 'free'
  const gradable = filterRowsToPool(
    questions as { id: string; category: string }[],
    tier,
  ) as typeof questions

  if (gradable.length === 0) {
    return NextResponse.json({ error: 'No valid questions to grade' }, { status: 400 })
  }

  // Score server-side. multi_select: compare canonical sets; else exact string.
  // Identical grading to /api/sessions/[sessionId]/submit.
  const results = gradable.map((q) => {
    const correctAnswer = isMulti(q.question_type)
      ? canonicalMulti(q.correct_answers as string[])
      : (q.answer_text as string)
    const userAnswer = answerByQuestion.get(q.id) ?? ''
    return {
      questionId: q.id as string,
      category: q.category as string,
      correct: userAnswer === correctAnswer,
      correctAnswer,
      explanation: (q.explanation as string) ?? '',
      sourceRef: (q.source_ref as string) ?? '',
      userAnswer: userAnswer || null,
    }
  })

  const score = results.filter((r) => r.correct).length
  const total = results.length
  const percentage = Math.round((score / total) * 100)

  // Universal test: per-section scoring (must pass EACH section).
  let passed: boolean
  let sectionScores:
    | { category: string; score: number; total: number; percentage: number; passed: boolean }[]
    | undefined

  if (category === 'Universal') {
    const sections: Record<string, typeof results> = {}
    for (const r of results) {
      if (!sections[r.category]) sections[r.category] = []
      sections[r.category].push(r)
    }
    sectionScores = Object.entries(sections).map(([cat, items]) => {
      const sectionScore = items.filter((r) => r.correct).length
      const sectionPct = Math.round((sectionScore / items.length) * 100)
      // Type I is open-book: requires 84%. All others: 70%.
      const passThreshold = cat === 'Type I' ? 84 : 70
      return {
        category: cat,
        score: sectionScore,
        total: items.length,
        percentage: sectionPct,
        passed: sectionPct >= passThreshold,
      }
    })
    const ORDER = ['Core', 'Type I', 'Type II', 'Type III']
    sectionScores.sort((a, b) => ORDER.indexOf(a.category) - ORDER.indexOf(b.category))
    passed = sectionScores.every((s) => s.passed)
  } else {
    const passThreshold = category === 'Type I' ? 84 : 70
    passed = percentage >= passThreshold
  }

  // started_at is client-reported: clamp to [now - 24h, now] for sane stats.
  const now = Date.now()
  const startedMs = Math.min(Math.max(Date.parse(started_at), now - 24 * 60 * 60 * 1000), now)

  // Drill sessions are stored as 'Weak Spots' (matches the blind-spot branch
  // of /api/questions) regardless of the category the drill drew from.
  const sessionCategory = mode === 'drill' ? 'Weak Spots' : category
  // Sentinel 0 = untimed — works on the pre-migration NOT NULL column and the
  // history/dashboard readers already treat 0 and null as untimed.
  const timeLimitSecs = time_limit_secs ?? 0

  // Session row of record — created fully formed (already submitted + graded).
  const { data: session, error: sessionErr } = await admin
    .from('test_sessions')
    .insert({
      user_id: user.id,
      category: sessionCategory,
      question_ids: results.map((r) => r.questionId),
      started_at: new Date(startedMs).toISOString(),
      time_limit_secs: timeLimitSecs,
      submitted_at: new Date(now).toISOString(),
      score,
      total,
    })
    .select('id')
    .single()

  if (sessionErr || !session) {
    console.error('app/submit: failed to create session:', sessionErr)
    return NextResponse.json({ error: 'Failed to save results' }, { status: 500 })
  }

  // Per-question attempts → Weak Spots + per-question stats. Rich columns
  // first (migration 20260630), minimal retry on ANY failure so tracking
  // never breaks — same strategy as /api/practice/track.
  const richRows = results.map((r) => ({
    user_id: user.id,
    question_id: r.questionId,
    correct: r.correct,
    ...(r.userAnswer !== null ? { user_answer: r.userAnswer } : {}),
    source: `local-${mode}`,
  }))
  const { error: progressErr } = await admin.from('user_progress').insert(richRows)
  if (progressErr) {
    if (progressErr.code !== UNDEFINED_COLUMN) {
      console.warn('app/submit progress insert (rich) failed, retrying minimal:', progressErr.message)
    }
    await admin.from('user_progress').insert(
      results.map((r) => ({ user_id: user.id, question_id: r.questionId, correct: r.correct })),
    )
  }

  return NextResponse.json({
    sessionId: session.id,
    score,
    total,
    percentage,
    passed,
    ...(sectionScores ? { sectionScores } : {}),
    results: results.map((r) => ({
      question_id: r.questionId,
      correct: r.correct,
      correct_answer: r.correctAnswer,
      explanation: r.explanation,
      source_ref: r.sourceRef,
      user_answer: r.userAnswer,
    })),
  })
}
