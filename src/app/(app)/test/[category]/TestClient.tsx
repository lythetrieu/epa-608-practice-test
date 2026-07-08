'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import type { QuestionPublic, SectionScore, SessionResult } from '@/types'
import { ResultView } from './ResultView'
import { QuizEngine } from '@/components/quiz/QuizEngine'
import type { QuizOutcome } from '@/components/quiz/types'
import {
  readQuestionBank,
  ensureQuestionBank,
  pickQuestions,
  type BankQuestion,
} from '@/lib/question-bank'
import { savePendingSubmit, flushPendingSubmit } from '@/lib/pending-submit'
import { canonicalMulti, isMulti } from '@/lib/multi'
import { computePacing, lastPacingKey, type LastPacing } from '@/components/quiz/pacing'
import { writeCache } from '@/lib/local-first'

type Phase = 'loading' | 'active' | 'error'

// Open-book question: practice mode response includes answer_text + explanation.
// Timed mode never sends these (they stay undefined), so the same type is safe
// for both — reveal logic is guarded by the engine's practice mode.
type EngineQuestion = QuestionPublic & {
  question_type?: string
  answer_text?: string
  explanation?: string
}

// Response shape of POST /api/app/submit (snake_case per-question results).
type AppSubmitResponse = {
  sessionId: string
  score: number
  total: number
  percentage: number
  passed: boolean
  sectionScores?: SectionScore[]
  results: {
    question_id: string
    correct: boolean
    correct_answer: string
    explanation: string
    source_ref: string
    user_answer: string | null
  }[]
}

// Adapt /api/app/submit → the SessionResult shape ResultView already consumes
// (identical to the legacy /api/sessions/[id]/submit payload, camelCased).
function appSubmitToSessionResult(d: AppSubmitResponse): SessionResult {
  return {
    sessionId: d.sessionId,
    score: d.score,
    total: d.total,
    percentage: d.percentage,
    passed: d.passed,
    ...(d.sectionScores ? { sectionScores: d.sectionScores } : {}),
    results: d.results.map(r => ({
      questionId: r.question_id,
      correct: r.correct,
      correctAnswer: r.correct_answer,
      userAnswer: r.user_answer,
      explanation: r.explanation,
    })),
  }
}

// Map a local-bank row → the engine's question shape. Answer fields are only
// attached in open-book (practice) mode, mirroring the /api/questions payload;
// multi-select answers are canonicalised exactly like the server graders do.
function bankToEngine(q: BankQuestion, openBook: boolean): EngineQuestion {
  const base: EngineQuestion = {
    id: q.id,
    category: q.category,
    subtopic_id: q.subtopic_id,
    question: q.question,
    options: q.options,
    difficulty: q.difficulty,
    question_type: q.question_type ?? undefined,
  }
  if (openBook) {
    base.answer_text =
      isMulti(q.question_type) && q.correct_answers?.length
        ? canonicalMulti(q.correct_answers)
        : q.answer_text
    base.explanation = q.explanation
  }
  return base
}

/**
 * Data layer for BOTH Timed Simulation and Practice (and the Weak Spots drill).
 * Owns question sourcing + server submit + ResultView; the quiz loop itself is
 * the shared <QuizEngine>. Differs ONLY by:
 *  - `timed`            → countdown + auto-submit at 0 (else no countdown)
 *  - `showExplanations` → inline reveal + explanation + ELI5 after each answer
 *
 * Question sourcing (Quiz Engine v2):
 *  - practice/exam WITH a cached local bank → questions picked ON-DEVICE
 *    (zero network before the first question renders); no server session is
 *    created at start; the finished quiz posts once to /api/app/submit which
 *    re-grades server-side and writes test_sessions + user_progress.
 *  - practice/exam WITHOUT a bank → legacy flow (POST /api/questions creates a
 *    session, submit to /api/sessions/[id]/submit), and the bank download is
 *    kicked off in the background for next time.
 *  - Weak Spots drill (mode='blind-spot') → ALWAYS the legacy server flow: the
 *    weak-question RPC needs the user's per-question error history, which the
 *    local bank does not have.
 *
 * Either way the quiz is scored server-side and appears in Test History.
 */
export function TestClient({
  category,
  mode = 'random',
  timed = true,
  showExplanations = false,
  userId = null,
}: {
  category: string
  mode?: 'random' | 'blind-spot'
  timed?: boolean
  showExplanations?: boolean
  userId?: string | null
}) {
  const [phase, setPhase] = useState<Phase>('loading')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [questions, setQuestions] = useState<EngineQuestion[]>([])
  const [timeLimitSecs, setTimeLimitSecs] = useState(1800)
  const [result, setResult] = useState<SessionResult | null>(null)
  // Client-side outcome kept for the ResultView pacing card — works on BOTH the
  // local-bank and legacy submit flows (the server response has no timing).
  const [outcome, setOutcome] = useState<QuizOutcome | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  // Set when this quiz started from the LOCAL bank (no server session exists):
  // submit goes to /api/app/submit with these client-side session parameters.
  const localStartRef = useRef<{ startedAt: string; timeLimitSecs: number | null } | null>(null)

  function handleRetake() {
    const hardReload = (window as any).__hardReload
    if (hardReload) hardReload()
    else window.location.reload()
  }

  // Offline safety net: retry a previously failed local-bank submit (at most
  // once per app load; see src/lib/pending-submit.ts). Fire-and-forget.
  useEffect(() => {
    if (userId) void flushPendingSubmit(userId)
  }, [userId])

  // Load questions.
  // Local-bank fast path first (practice/exam only — NEVER the blind-spot
  // drill, whose questions come from the server-side weak-spot RPC). Falls
  // back to the legacy network flow whenever the bank isn't usable.
  useEffect(() => {
    const isPractice = showExplanations
    // Mirror the exact /api/questions request parameters of the legacy flow.
    const count = category === 'Universal' ? 100 : 25

    if (mode !== 'blind-spot' && userId) {
      const bank = readQuestionBank(userId)
      if (bank) {
        const picked = pickQuestions(bank, { count, category })
        if (picked.length > 0) {
          // Same timer values /api/questions assigns (practice = untimed).
          const limit = isPractice ? null : category === 'Universal' ? 10800 : 1800
          localStartRef.current = { startedAt: new Date().toISOString(), timeLimitSecs: limit }
          if (limit !== null) setTimeLimitSecs(limit)
          setQuestions(picked.map(q => bankToEngine(q, isPractice)))
          setPhase('active')
          // Background TTL refresh so the bank stays ≤24h stale. Never blocks.
          void ensureQuestionBank(userId)
          return
        }
      }
      // No usable bank → download it in the background for next time.
      void ensureQuestionBank(userId)
    }

    const requestMode = isPractice ? 'practice' : mode
    fetch('/api/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: mode === 'blind-spot' ? 'Universal' : category,
        count,
        mode: requestMode,
      }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          setErrorMsg(data.upgradeRequired ? 'Upgrade to access this category.' : data.error)
          setPhase('error')
          return
        }
        setSessionId(data.sessionId)
        setQuestions(data.questions)
        if (typeof data.timeLimitSecs === 'number') setTimeLimitSecs(data.timeLimitSecs)
        setPhase('active')
      })
      .catch(() => { setErrorMsg('Failed to load questions.'); setPhase('error') })
  }, [category, mode, showExplanations, userId])

  // Exam pace budget per question, ms. Timed tests use their own limit; untimed
  // practice is measured against the REAL exam budget for the category
  // (Universal 10800s/100Q, sections 1800s/25Q → 72s/question either way).
  const budgetPerQMs = questions.length > 0
    ? ((timed ? timeLimitSecs : category === 'Universal' ? 10800 : 1800) * 1000) / questions.length
    : 72_000

  const handleSubmit = useCallback(async (outcome: QuizOutcome) => {
    const local = localStartRef.current
    setOutcome(outcome)

    // Persist a pacing summary of this completed test for the Progress page's
    // "Last test pace" card (localStorage only — the progress API has no timing).
    const pacing = computePacing(outcome.answers, budgetPerQMs, questions.length)
    if (pacing && userId) {
      const summary: LastPacing = {
        date: new Date().toISOString(),
        category,
        avgMs: pacing.avgMs,
        budgetMs: pacing.budgetMs,
        verdict: pacing.verdict,
      }
      writeCache(lastPacingKey(userId), summary)
    }

    // Per-question timing → /api/app/submit only (the legacy endpoint's zod
    // schema is a strict string→string record and would reject extra shapes).
    const timeByQ = new Map(
      outcome.answers.filter(a => a.timeMs != null).map(a => [a.questionId, a.timeMs as number])
    )

    // ── Local-bank start → single server round-trip to /api/app/submit ──
    if (local) {
      // Ids come from the PICKED set only; unanswered questions are sent with
      // selected: '' (the endpoint's zod allows empty strings and the server
      // re-grade marks them wrong).
      const payload = {
        category,
        mode: (showExplanations ? 'practice' : 'exam') as 'practice' | 'exam',
        time_limit_secs: local.timeLimitSecs,
        started_at: local.startedAt,
        answers: questions.map(q => {
          const timeMs = timeByQ.get(q.id)
          return {
            question_id: q.id,
            selected: outcome.answersMap[q.id] ?? '',
            ...(timeMs != null ? { time_ms: timeMs } : {}),
          }
        }),
      }
      try {
        const r = await fetch('/api/app/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await r.json()
        if (r.ok) setResult(appSubmitToSessionResult(data as AppSubmitResponse))
        else { setErrorMsg(data.error ?? 'Submit failed.'); setPhase('error') }
      } catch {
        // Network failure: park the outcome and retry on the next app load.
        if (userId) {
          savePendingSubmit(userId, payload)
          setErrorMsg('You appear to be offline. Your answers were saved and will be submitted automatically next time you open the app.')
        } else {
          setErrorMsg('Submit failed.')
        }
        setPhase('error')
      }
      return
    }

    // ── Legacy server-session flow (unchanged) ──
    if (!sessionId) return
    try {
      const r = await fetch(`/api/sessions/${sessionId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: outcome.answersMap }),
      })
      const data = await r.json()
      if (r.ok) setResult(data)
      else { setErrorMsg(data.error); setPhase('error') }
    } catch {
      setErrorMsg('Submit failed.'); setPhase('error')
    }
  }, [sessionId, category, showExplanations, questions, userId, budgetPerQMs])

  if (phase === 'loading') return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-800 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Loading {category} questions...</p>
      </div>
    </div>
  )

  if (phase === 'error') return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="bg-red-50 border border-red-200 rounded-xl p-8 max-w-md text-center">
        <p className="text-red-700 font-semibold text-lg mb-2">Could not start {showExplanations ? 'practice' : 'test'}</p>
        <p className="text-red-600 mb-6">{errorMsg}</p>
        <a href="/dashboard" className="px-6 py-2 bg-blue-800 text-white rounded-lg">Back to Dashboard</a>
      </div>
    </div>
  )

  if (result) return (
    <ResultView
      result={result}
      category={category}
      questions={questions}
      onRetake={handleRetake}
      outcome={outcome}
      budgetPerQMs={budgetPerQMs}
    />
  )

  return (
    <QuizEngine
      questions={questions}
      mode={showExplanations ? 'practice' : mode === 'blind-spot' ? 'drill' : 'exam'}
      timeLimitSecs={timed ? timeLimitSecs : null}
      title={category}
      showQuestionCategory={category === 'Universal'}
      onComplete={handleSubmit}
    />
  )
}
