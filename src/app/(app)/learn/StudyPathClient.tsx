'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { ArrowLeft, Check, X, ChevronRight, Lock, LayoutGrid, Bot, Trophy, ArrowRight, Lightbulb, AlertTriangle, BookOpen } from 'lucide-react'
import { MULTI_SEP } from '@/lib/multi'
import { useLocalFirst } from '@/lib/local-first'
import { readQuestionBank, ensureQuestionBank, pickQuestions } from '@/lib/question-bank'
import { QuizEngine } from '@/components/quiz/QuizEngine'
import type { QuizOutcome, QuizQuestion } from '@/components/quiz/types'
import { CONCEPT_VISUALS } from './concept-visuals'
import { track } from '@/lib/track'
import StudyMaterials from './StudyMaterials'

// Per-question AI tutor — on-demand "explain simply" for any reviewed question.
// Mirrors the PracticeClient pattern so every learning surface has the same tutor.
function ExplainButton({ questionText, correctAnswer }: { questionText: string; correctAnswer: string }) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [explanation, setExplanation] = useState('')

  async function handleClick() {
    if (state === 'done') return
    setState('loading')
    try {
      const res = await fetch('/api/ai/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionText, correctAnswer, userAnswer: 'wrong' }),
        signal: AbortSignal.timeout(30000),
      })
      const data = await res.json()
      if (!res.ok || !data.explanation) { setState('error'); return }
      setExplanation(data.explanation)
      setState('done')
    } catch { setState('error') }
  }

  if (state === 'done') {
    return (
      <div className="mt-2.5 bg-purple-50 border border-purple-200 rounded-lg p-3">
        <div className="flex items-center gap-1.5 mb-1">
          <Bot size={13} className="text-purple-600" />
          <span className="font-semibold text-purple-700 text-[11px] uppercase tracking-wide">AI Tutor</span>
        </div>
        <p className="text-sm text-purple-900 leading-relaxed">{explanation}</p>
      </div>
    )
  }

  return (
    <button onClick={handleClick} disabled={state === 'loading'}
      className="mt-2.5 inline-flex items-center gap-1.5 text-xs px-3 py-2 min-h-[40px] rounded-lg bg-purple-100 text-purple-700 hover:bg-purple-200 disabled:opacity-50 font-medium">
      {state === 'loading' ? (
        <><span className="w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" /> Explaining...</>
      ) : state === 'error' ? (
        <><Bot size={14} /> Try again</>
      ) : (
        <><Bot size={14} /> Ask AI: why?</>
      )}
    </button>
  )
}

// Quiz Engine v2: register a CLIENT-picked (local-bank) mastery check with the
// server so the unchanged /api/public/score grading flow has a quizId to grade
// against. Answers are looked up server-side from the DB — this call carries
// ids only. Returns null on any failure (submit will retry once, then fail
// into the existing catch path).
async function registerLocalStudyQuiz(conceptPrefix: string, questionIds: string[]): Promise<string | null> {
  try {
    const res = await fetch('/api/public/study-path', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conceptPrefix, count: 10, questionIds }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return typeof data.quizId === 'string' && data.quizId ? data.quizId : null
  } catch {
    return null
  }
}

type Concept = {
  id: string
  title: string
  category: string
  subtopicPrefix: string
  summary: string
  lesson: string
  keyNumbers: string[]
  memoryTrick: string
  examWarning: string
}

type QuizData = {
  quizId: string
  concept: { id: string; title: string; category: string; subtopicPrefix?: string }
  lesson: string
  keyNumbers: string[]
  memoryTrick: string
  examWarning: string
  facts: string[]
  questions: QuizQuestion[]
  total: number
}

type ConceptProgress = {
  status: 'pending' | 'mastered' | 'weak'
  passCount: number
  lastPassed: string | null
  bestScore?: number
  lastScore?: number | null
  attempts?: number
}

function getProgress(): Record<string, ConceptProgress> {
  try {
    const raw = localStorage.getItem('epa608StudyPath')
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    for (const k of Object.keys(parsed)) {
      if (typeof parsed[k] === 'string') {
        parsed[k] = { status: parsed[k] === 'reviewed' ? 'mastered' : parsed[k], passCount: (parsed[k] === 'mastered' || parsed[k] === 'reviewed') ? 1 : 0, lastPassed: null }
      }
    }
    return parsed
  } catch { return {} }
}

function saveProgress(p: Record<string, ConceptProgress>) {
  localStorage.setItem('epa608StudyPath', JSON.stringify(p))
}

// Stars per level, from best_score (0-100): 80-89 → 1, 90-99 → 2, 100 → 3.
// Below the 80% passing mark there are no stars.
function starsFor(score: number | null | undefined): number {
  if (!score || score < 80) return 0
  if (score >= 100) return 3
  if (score >= 90) return 2
  return 1
}

// Small gold star row for a level node. The gold lives ONLY inside the star
// glyphs (approved achievement/star art) — never in surrounding UI.
function Stars({ score }: { score?: number | null }) {
  const n = starsFor(score)
  if (n === 0) return null
  return (
    <span aria-label={`${n} of 3 stars`} className="shrink-0 text-[13px] leading-none" style={{ color: '#f5b840' }}>
      {'★'.repeat(n)}
    </span>
  )
}

function getEffectiveStatus(prog: ConceptProgress): string {
  // One clean pass (8/10) clears a concept for good — there is no two-pass
  // 'reviewed' step and no spaced-repetition revert. Legacy 'reviewed' rows
  // from the old model count as mastered.
  const status = (prog.status as string) || 'pending'
  return status === 'reviewed' ? 'mastered' : status
}

// Raw account progress row shape (snake_case, straight from study_path_progress).
export type ProgressRow = {
  concept_id: string
  status: string
  pass_count?: number | null
  last_passed?: string | null
  best_score?: number | null
  last_score?: number | null
  attempts?: number | null
}

// Map raw DB rows → the client's ConceptProgress map. Same mapping the mount
// fetch used, so the SSR-provided rows behave identically.
function rowsToProgress(
  rows: ProgressRow[],
  base: Record<string, ConceptProgress> = {},
): Record<string, ConceptProgress> {
  const merged: Record<string, ConceptProgress> = { ...base }
  for (const row of rows) {
    merged[row.concept_id] = {
      status: row.status as ConceptProgress['status'],
      passCount: row.pass_count ?? 0,
      lastPassed: row.last_passed ?? null,
      bestScore: row.best_score ?? 0,
      lastScore: row.last_score ?? null,
      attempts: row.attempts ?? 0,
    }
  }
  return merged
}

export default function StudyPathClient({
  initialConcepts,
  userId,
}: {
  // Concepts are pure synchronous local computation on the server — always
  // present, so the worlds grid renders immediately with zero fetches.
  initialConcepts: Concept[]
  userId: string
}) {
  const concepts = initialConcepts
  // Local-first account progress + tier gate: render instantly from the last
  // localStorage snapshot (0 network), revalidate in the background. `fresh`
  // gates the upgrade screen so a stale cache never locks a Pro user out.
  const { data: serverData, fresh } = useLocalFirst<{ hasStudyPath: boolean; progress: ProgressRow[] }>(
    `study-progress:${userId}`,
    '/api/app/study-progress',
  )
  const [progress, setProgress] = useState<Record<string, ConceptProgress>>({})
  const [activeConceptPrefix, setActiveConceptPrefix] = useState<string | null>(null)
  const [activeConceptId, setActiveConceptId] = useState<string | null>(null)
  const [quiz, setQuiz] = useState<QuizData | null>(null)
  const [quizPhase, setQuizPhase] = useState<'lesson' | 'quiz' | 'result'>('lesson')
  const [result, setResult] = useState<{
    percentage: number
    passed: boolean
    results?: { questionId: string; correct: boolean; userAnswer: string | null; correctAnswer: string }[]
  } | null>(null)
  const [activeWorld, setActiveWorld] = useState<string | null>(null) // null = dashboard; else show that World's path

  // Deep link: /learn?section=Core (Home's section cards) opens that world's
  // path directly instead of landing on the section picker again.
  useEffect(() => {
    const section = new URLSearchParams(window.location.search).get('section')
    if (section && ['Core', 'Type I', 'Type II', 'Type III'].includes(section)) {
      setActiveWorld(section)
    }
  }, [])

  // One id per study session (generated once on mount) — stitches telemetry
  // events together server-side. Memory only; not persisted.
  const sessionIdRef = useRef<string>('')
  if (!sessionIdRef.current) {
    sessionIdRef.current =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `s_${Date.now()}_${Math.random().toString(36).slice(2)}`
  }

  // Seed from localStorage first so the grid shows something on the very first
  // frame (0% for brand-new users — never a spinner).
  useEffect(() => {
    setProgress(getProgress())
  }, [])

  // When the server snapshot lands (cached first, then the fresh payload),
  // merge its rows ON TOP of localStorage — identical semantics to the old
  // initialProgress / mount-fetch paths. Only the FRESH merge is written back
  // to localStorage so a stale cached snapshot can't overwrite newer offline
  // progress permanently.
  useEffect(() => {
    if (!serverData || !Array.isArray(serverData.progress)) return
    const merged = rowsToProgress(serverData.progress, getProgress())
    setProgress(merged)
    if (fresh) saveProgress(merged)
  }, [serverData, fresh])

  // Ordered flat list: Core → Type I → Type II → Type III
  const sections = ['Core', 'Type I', 'Type II', 'Type III']
  const orderedConcepts: Concept[] = []
  const grouped: Record<string, Concept[]> = {}
  concepts.forEach(c => {
    if (!grouped[c.category]) grouped[c.category] = []
    grouped[c.category].push(c)
  })
  sections.forEach(cat => { orderedConcepts.push(...(grouped[cat] || [])) })

  // Stats
  let totalMastered = 0
  for (const c of concepts) {
    if (getEffectiveStatus(progress[c.id] || { status: 'pending', passCount: 0, lastPassed: null }) === 'mastered') totalMastered++
  }
  const overallPct = concepts.length > 0 ? Math.round(totalMastered / concepts.length * 100) : 0


  // Find next lesson after active concept (for "Next Lesson" button in results)
  const getNextLesson = useCallback(() => {
    if (!activeConceptId) return null
    const idx = orderedConcepts.findIndex(c => c.id === activeConceptId)
    // Find next non-mastered after current
    for (let i = idx + 1; i < orderedConcepts.length; i++) {
      const p = progress[orderedConcepts[i].id]
      if (!p || getEffectiveStatus(p) !== 'mastered') return orderedConcepts[i]
    }
    // Wrap around: find any non-mastered before current
    for (let i = 0; i < idx; i++) {
      const p = progress[orderedConcepts[i].id]
      if (!p || getEffectiveStatus(p) !== 'mastered') return orderedConcepts[i]
    }
    return null
  }, [activeConceptId, orderedConcepts, progress])

  // Monotonic open counter + current local pick — guards the background
  // quizId registration against a concept switch mid-flight, and lets
  // submitQuiz retry the registration once if it hadn't landed by submit time.
  const openSeqRef = useRef(0)
  const localPickRef = useRef<{ prefix: string; ids: string[] } | null>(null)

  const openConcept = useCallback((prefix: string, conceptId: string) => {
    setActiveConceptPrefix(prefix)
    setActiveConceptId(conceptId)
    setQuizPhase('quiz') // straight into the questions — no interstitial lesson screen
    setQuiz(null)
    setResult(null)
    const seq = ++openSeqRef.current
    localPickRef.current = null

    // Telemetry: a lesson was opened. Fire-and-forget.
    track('lesson_start', { conceptId, sessionId: sessionIdRef.current })

    // ── Local-bank fast path: pick this concept's 10 questions ON-DEVICE ──
    // Replicates the server's selection exactly (subtopic_id LIKE `${prefix}-%`,
    // count 10, random sample + option shuffle — see /api/public/study-path).
    // The quiz renders with ZERO network; the fetch below then runs in the
    // background only to register the picked ids for /api/public/score.
    const bank = readQuestionBank(userId)
    const concept = concepts.find(c => c.id === conceptId)
    if (bank && concept) {
      const subs = new Set<string>()
      for (const q of bank) {
        if (q.subtopic_id && q.subtopic_id.startsWith(`${prefix}-`)) subs.add(q.subtopic_id)
      }
      const picked = subs.size > 0 ? pickQuestions(bank, { count: 10, subtopicIds: [...subs] }) : []
      // The registration endpoint requires ≥3 ids — below that, use the server flow.
      if (picked.length >= 3) {
        const ids = picked.map(q => q.id)
        localPickRef.current = { prefix, ids }
        setQuiz({
          quizId: '', // filled by the background registration below
          concept: { id: concept.id, title: concept.title, category: concept.category, subtopicPrefix: prefix },
          lesson: concept.lesson,
          keyNumbers: concept.keyNumbers,
          memoryTrick: concept.memoryTrick,
          examWarning: concept.examWarning,
          facts: [],
          questions: picked.map(q => ({
            id: q.id,
            category: q.category,
            question: q.question,
            options: q.options,
            difficulty: q.difficulty,
            question_type: q.question_type ?? undefined,
          })),
          total: picked.length,
        })
        // Keep the bank ≤24h stale; never blocks the quiz.
        void ensureQuestionBank(userId)
        // Background registration → quizId for the byte-identical submit path.
        void registerLocalStudyQuiz(prefix, ids).then(quizId => {
          if (quizId && openSeqRef.current === seq) {
            setQuiz(q => (q ? { ...q, quizId } : q))
          }
        })
        return
      }
    }
    if (!bank) void ensureQuestionBank(userId) // download for next time

    // ── Fallback: today's server-picked flow, unchanged ──
    fetch('/api/public/study-path', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conceptPrefix: prefix, count: 10 }),
    })
      .then(r => r.json())
      .then(data => { if (openSeqRef.current === seq) setQuiz(data) })
      .catch(() => {})
  }, [userId, concepts])

  // Called by the QuizEngine when the mastery check is submitted. The engine
  // hands over the collected answers + per-question first-view timestamps
  // (previously qStartRef); all scoring/tracking POSTs are unchanged.
  const submitQuiz = useCallback(async (outcome: QuizOutcome) => {
    if (!quiz) return
    try {
      // Local-bank start: the quizId arrives from the background registration.
      // If it hasn't landed by submit time (slow/failed request), retry the
      // registration ONCE inline; if that also fails, fall into the existing
      // catch below — same behavior as an expired server quiz today.
      let quizId = quiz.quizId
      if (!quizId && localPickRef.current) {
        quizId = (await registerLocalStudyQuiz(localPickRef.current.prefix, localPickRef.current.ids)) ?? ''
      }
      if (!quizId) throw new Error('quiz not registered')
      const res = await fetch('/api/public/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quizId, answers: outcome.answersMap }),
      })
      const data = await res.json()
      const passed = data.percentage >= 80
      const conceptId = activeConceptId!
      const p = { ...progress }
      const existing = p[conceptId] || { status: 'pending' as const, passCount: 0, lastPassed: null }

      if (passed) {
        existing.passCount = (existing.passCount || 0) + 1
        existing.lastPassed = new Date().toISOString()
        // One clean pass (8/10) clears the level → unlocks the next + shows
        // "Next level". A pass is permanent — no spaced-repetition revert.
        existing.status = 'mastered'
      } else {
        existing.status = 'weak'
        existing.passCount = 0
      }

      existing.lastScore = data.percentage
      existing.bestScore = Math.max(existing.bestScore ?? 0, data.percentage)
      existing.attempts = (existing.attempts ?? 0) + 1
      p[conceptId] = existing
      setProgress(p)
      saveProgress(p)

      // Telemetry: the quiz was submitted. Fire-and-forget.
      track('quiz_submit', {
        conceptId,
        sessionId: sessionIdRef.current,
        payload: { score: data.percentage, passed },
      })

      // Record each question's result to user_progress so Weak Spots +
      // per-question stats include Study Path activity. Same question-id space
      // as the practice test (IDs come from the questions table). Fire-and-forget,
      // fail-open — never blocks the result screen for a logged-out/edge case.
      // Enriched with OPTIONAL userAnswer / timeMs / attemptNo / source — the
      // track route strips unknown fields if it hasn't been upgraded yet, so
      // this stays backward-compatible.
      if (Array.isArray(data.results) && data.results.length > 0) {
        const attemptNo = existing.attempts // already incremented above for this submit
        const firstViewed: Record<string, number> = {}
        for (const a of outcome.answers) {
          if (typeof a.firstViewedAt === 'number') firstViewed[a.questionId] = a.firstViewedAt
        }
        fetch('/api/practice/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            results: data.results.map((r: { questionId: string; correct: boolean; userAnswer?: string | null }) => {
              const started = firstViewed[r.questionId]
              return {
                questionId: r.questionId,
                correct: r.correct,
                userAnswer: r.userAnswer ?? outcome.answersMap[r.questionId] ?? null,
                ...(typeof started === 'number' ? { timeMs: Math.max(0, Date.now() - started) } : {}),
                attemptNo,
                source: 'study_path',
              }
            }),
          }),
        }).catch(() => {})
      }

      // Persist this attempt to the account (per-username, synced across devices).
      fetch('/api/study-path/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conceptId,
          status: existing.status,
          passCount: existing.passCount,
          lastPassed: existing.lastPassed,
          lastScore: data.percentage,
        }),
      }).catch(() => {})

      setResult({ percentage: data.percentage, passed, results: data.results })
      setQuizPhase('result')
    } catch {
      setResult({ percentage: 0, passed: false })
      setQuizPhase('result')
    }
  }, [quiz, activeConceptId, progress])

  const closeModal = useCallback(() => {
    // Telemetry: leaving the concept. Fire-and-forget.
    if (activeConceptId) track('exit', { conceptId: activeConceptId, sessionId: sessionIdRef.current })
    setActiveConceptPrefix(null)
    setActiveConceptId(null)
  }, [activeConceptId])

  // Tier gate — moved here from the /learn server component. Only rendered on
  // a FRESH server answer (never on a stale cached snapshot), so a Pro user is
  // never flashed the upgrade screen by an outdated cache.
  if (fresh && serverData && !serverData.hasStudyPath) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <div className="text-5xl mb-4">🗺️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Study Path</h1>
          <p className="text-gray-500 mb-6">
            A guided, concept-by-concept path through every EPA 608 topic — with
            mini-lessons, key numbers, and a 10-question mastery check for each
            concept. Your progress is tracked across the whole path.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-6">
            <p className="text-sm text-blue-800 font-medium mb-1">
              Upgrade to unlock the full Study Path
            </p>
            <p className="text-xs text-blue-600">
              Free accounts can browse concepts and try samples. Pro unlocks the
              full guided path with saved progress and mastery tracking.
            </p>
          </div>
          <Link
            href={`/checkout.html`}
            className="inline-block px-6 py-3 bg-blue-800 text-white rounded-xl font-bold hover:bg-blue-900 transition-colors"
          >
            Upgrade Now
          </Link>
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CONCEPT DETAIL VIEW (lesson → quiz → result)
  // ═══════════════════════════════════════════════════════════════════════════
  // Loading a concept's lesson → a plain spinner (the sidebar stays for exit).
  // No separate Back button / "Loading quiz…" text — it just flashes an extra
  // screen before the lesson, and the lesson opens with its own Exit button.
  if (activeConceptPrefix && !quiz) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (activeConceptPrefix && quiz) {
    const conceptProg = progress[activeConceptId!] || { status: 'pending', passCount: 0, lastPassed: null }
    const nextLesson = getNextLesson()
    const A = '#003087'
    const C = 2 * Math.PI * 52 // ring circumference

    return (
      <div className="min-h-screen flex justify-center px-3 sm:px-4 py-6" style={{ backgroundColor: '#f8fafc', backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(15,23,42,0.045) 1px, transparent 0)', backgroundSize: '22px 22px' }}>
        <div className="w-full max-w-2xl">

          {/* LESSON — teach the concept before the quiz */}
          {quizPhase === 'lesson' && (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,.04),0_10px_30px_-14px_rgba(15,23,42,.18)]">
              <header className="border-b border-slate-100 px-5 py-4 sm:px-7">
                <div className="flex items-center justify-between gap-3">
                  <button onClick={closeModal} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 shadow-sm hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900">
                    <ArrowLeft size={16} /> Exit
                  </button>
                  <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide" style={{ background: '#eef4fb', color: '#003087' }}>
                    <BookOpen size={13} /> Lesson
                  </span>
                </div>
              </header>

              <div className="px-5 py-6 sm:px-7 sm:py-8">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{quiz.concept.category}</p>
                <h2 className="mt-1 text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">{quiz.concept.title}</h2>

                {CONCEPT_VISUALS[activeConceptId!] && (
                  <div className="mt-5 overflow-x-auto rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                    {CONCEPT_VISUALS[activeConceptId!]()}
                  </div>
                )}

                {quiz.lesson && <p className="mt-5 text-[15px] leading-relaxed text-slate-700">{quiz.lesson}</p>}

                {quiz.keyNumbers?.length > 0 && (
                  <div className="mt-5">
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Key numbers</p>
                    <div className="flex flex-wrap gap-2">
                      {quiz.keyNumbers.map((n, i) => (
                        <span key={i} className="rounded-lg bg-blue-50 px-2.5 py-1 text-[13px] font-semibold text-blue-800">{n}</span>
                      ))}
                    </div>
                  </div>
                )}

                {quiz.memoryTrick && (
                  <div className="mt-4 flex gap-3 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
                    <Lightbulb size={18} className="mt-0.5 shrink-0 text-amber-500" />
                    <p className="text-[14px] leading-relaxed text-amber-900"><span className="font-bold">Memory trick:</span> {quiz.memoryTrick}</p>
                  </div>
                )}

                {quiz.examWarning && (
                  <div className="mt-3 flex gap-3 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3">
                    <AlertTriangle size={18} className="mt-0.5 shrink-0 text-rose-500" />
                    <p className="text-[14px] leading-relaxed text-rose-900"><span className="font-bold">Exam watch-out:</span> {quiz.examWarning}</p>
                  </div>
                )}

                {!quiz.lesson && quiz.facts?.length > 0 && (
                  <ul className="mt-5 space-y-2">
                    {quiz.facts.slice(0, 8).map((f, i) => (
                      <li key={i} className="flex gap-2.5 text-[14px] leading-relaxed text-slate-700">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: A }} />{f}
                      </li>
                    ))}
                  </ul>
                )}

                {/* Optional video / PDF / infographic for this concept. Renders
                    nothing when there are no seeded assets (graceful default). */}
                <StudyMaterials conceptId={activeConceptId!} />
              </div>

              <footer className="border-t border-slate-100 bg-slate-50/60 px-5 py-4 sm:px-7">
                <button onClick={() => setQuizPhase('quiz')} className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold text-white shadow transition hover:brightness-110" style={{ background: A }}>
                  Start quiz — 10 questions <ArrowRight size={16} />
                </button>
                <p className="mt-2 text-center text-xs text-slate-400">Pass 8 of 10 to clear this level</p>
              </footer>
            </div>
          )}

          {/* QUIZ — shared engine, Study Path chrome (mode="study") */}
          {quizPhase === 'quiz' && (
            <QuizEngine
              questions={quiz.questions}
              mode="study"
              title={`${quiz.concept.category} · ${quiz.concept.title}`}
              header={
                <button onClick={closeModal} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 shadow-sm hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900">
                  <ArrowLeft size={16} /> Exit
                </button>
              }
              onComplete={submitQuiz}
            />
          )}

          {/* RESULT */}
          {quizPhase === 'result' && result && (
            <div className="space-y-4">
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,.04),0_10px_30px_-14px_rgba(15,23,42,.18)] px-6 py-8 text-center sm:px-10 sm:py-10">
                <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide" style={result.passed ? { background: '#ecfdf5', color: '#059669' } : { background: '#fff1f2', color: '#e11d48' }}>
                  {result.passed ? <><Check size={14} strokeWidth={3} /> Level cleared</> : <><X size={14} strokeWidth={3} /> Keep going</>}
                </span>

                <div className="relative mx-auto mt-6 h-40 w-40">
                  <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                    <circle cx="60" cy="60" r="52" fill="none" stroke="#e2e8f0" strokeWidth="11" />
                    <circle cx="60" cy="60" r="52" fill="none" stroke={result.passed ? '#059669' : '#e11d48'} strokeWidth="11" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - result.percentage / 100)} style={{ transition: 'stroke-dashoffset .6s ease' }} />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-extrabold tracking-tight text-slate-900 tabular-nums">{result.percentage}<span className="text-slate-300">%</span></span>
                    <span className="mt-0.5 text-xs font-bold tabular-nums" style={{ color: result.passed ? '#059669' : '#e11d48' }}>
                      {(result.results || []).filter(r => r.correct).length}/{(result.results || []).length || quiz.total}
                    </span>
                  </div>
                </div>

                {(conceptProg.bestScore ?? 0) > 0 && (
                  <p className="mt-3 text-xs font-medium text-slate-400">
                    Best score <span className="font-bold text-slate-600 tabular-nums">{conceptProg.bestScore}%</span>
                    {(conceptProg.attempts ?? 0) > 1 ? ` · ${conceptProg.attempts} attempts` : ''}
                  </p>
                )}

                <h2 className="mt-6 text-2xl font-extrabold tracking-tight text-slate-900">
                  {result.passed ? 'Concept mastered.' : 'Almost there.'}
                </h2>
                <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-slate-500">
                  {result.passed ? <>You mastered <span className="font-semibold text-slate-700">{quiz.concept.title}</span> — passing mark is 80%. It stays cleared.</>
                  : <>You need 80% to clear this level. Review the misses below and try again.</>}
                </p>

                <div className="mx-auto mt-7 flex max-w-md flex-col gap-3 sm:flex-row-reverse">
                  {result.passed && nextLesson ? (
                    <button onClick={() => openConcept(nextLesson.subtopicPrefix, nextLesson.id)} className="btn inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold text-white shadow hover:brightness-110" style={{ background: A }}>
                      Next level <ArrowRight size={16} />
                    </button>
                  ) : !result.passed ? (
                    <button onClick={() => openConcept(activeConceptPrefix!, activeConceptId!)} className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold text-white shadow hover:brightness-110" style={{ background: A }}>
                      Try again
                    </button>
                  ) : (
                    <button onClick={closeModal} className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold text-white shadow hover:brightness-110" style={{ background: A }}>
                      Back to route <ArrowRight size={16} />
                    </button>
                  )}
                  <button onClick={closeModal} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-6 py-3.5 text-sm font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50">
                    Back to route
                  </button>
                </div>
              </div>

              {result.results && result.results.length > 0 && (
                <div className="space-y-3">
                  <h3 className="px-1 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Review your answers</h3>
                  {result.results.map((r, i) => {
                    const qq = quiz.questions.find(x => x.id === r.questionId)
                    if (!qq) return null
                    return (
                      <div key={r.questionId} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="flex items-center gap-2 border-b px-5 py-3" style={r.correct ? { borderColor: '#d1fae5', background: '#ecfdf5' } : { borderColor: '#ffe4e6', background: '#fff1f2' }}>
                          <span className="grid h-6 w-6 place-items-center rounded-full text-white" style={{ background: r.correct ? '#059669' : '#e11d48' }}>
                            {r.correct ? <Check size={14} strokeWidth={3} /> : <X size={14} strokeWidth={3} />}
                          </span>
                          <span className="text-sm font-bold" style={{ color: r.correct ? '#059669' : '#e11d48' }}>{r.correct ? 'Correct' : 'Incorrect'}</span>
                          <span className="ml-auto text-xs font-medium text-slate-400">Question {i + 1} of {result.results!.length}</span>
                        </div>
                        <div className="px-5 py-5">
                          <h4 className="text-[15px] font-bold leading-snug text-slate-900">{qq.question}</h4>
                          <div className="mt-4 space-y-2">
                            {!r.correct && (
                              <div className="flex items-start gap-3 rounded-xl border-2 px-4 py-3" style={{ borderColor: '#e11d48', background: '#fff1f2' }}>
                                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md text-white" style={{ background: '#e11d48' }}><X size={13} strokeWidth={3} /></span>
                                <div>
                                  <p className="text-[13px] font-semibold" style={{ color: '#e11d48' }}>Your answer · Incorrect</p>
                                  <p className="text-[15px] font-medium text-slate-900 line-through decoration-rose-300 decoration-2">{(r.userAnswer || '—').split(MULTI_SEP).join(', ')}</p>
                                </div>
                              </div>
                            )}
                            <div className="flex items-start gap-3 rounded-xl border-2 px-4 py-3" style={{ borderColor: '#059669', background: '#ecfdf5' }}>
                              <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md text-white" style={{ background: '#059669' }}><Check size={13} strokeWidth={3} /></span>
                              <div>
                                <p className="text-[13px] font-semibold" style={{ color: '#059669' }}>{r.correct ? 'Your answer · Correct' : 'Correct answer'}</p>
                                <p className="text-[15px] font-medium text-slate-900">{(r.correctAnswer || '').split(MULTI_SEP).join(', ')}</p>
                              </div>
                            </div>
                          </div>
                          {!r.correct && (
                            <div className="mt-3">
                              <ExplainButton questionText={qq.question} correctAnswer={r.correctAnswer} />
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN VIEW
  // ═══════════════════════════════════════════════════════════════════════════
    // Linear skill-unlock: first non-cleared concept is the current level; later ones lock.
  const isCleared = (c: Concept) => getEffectiveStatus(progress[c.id] || { status: 'pending', passCount: 0, lastPassed: null }) === 'mastered'

  const WORLD_THEME: Record<string, { grad: string; cardGrad: string; pill: string; blob: string; emoji: string; sub: string; props: string[]; scene: [string, string, string] }> = {
    'Core':     { grad: 'from-sky-200 via-sky-100 to-blue-100',     cardGrad: 'from-sky-400 to-blue-500',       pill: 'bg-sky-600',     blob: 'bg-sky-400',     emoji: '☁️', sub: 'Foundations — required for every cert', props: ['☁️','🌍','♻️','🧪','📋','⚗️'], scene: ['#7dd3fc','#bae6fd','#e0f2fe'] },
    'Type I':   { grad: 'from-cyan-200 via-teal-100 to-emerald-100', cardGrad: 'from-teal-400 to-cyan-500',      pill: 'bg-teal-600',    blob: 'bg-teal-400',    emoji: '❄️', sub: 'Small appliances', props: ['❄️','🧊','🔧','🧰','🥶','🛠️'], scene: ['#5eead4','#99f6e4','#cffafe'] },
    'Type II':  { grad: 'from-violet-200 via-indigo-100 to-blue-100',cardGrad: 'from-indigo-400 to-violet-500',  pill: 'bg-indigo-600',  blob: 'bg-indigo-400',  emoji: '🎛️', sub: 'High-pressure systems', props: ['🎛️','🌡️','⚙️','🔩','🧯','📈'], scene: ['#a5b4fc','#c7d2fe','#e0e7ff'] },
    'Type III': { grad: 'from-emerald-200 via-green-100 to-teal-100',cardGrad: 'from-emerald-400 to-green-500',  pill: 'bg-emerald-600', blob: 'bg-emerald-400', emoji: '💧', sub: 'Low-pressure chillers', props: ['💧','🌀','🧊','⚙️','🚿','🌡️'], scene: ['#6ee7b7','#a7f3d0','#d1fae5'] },
  }

  // ════════════════════════════════════════════════════════════════════
  // /learn DASHBOARD — pick a World
  // ════════════════════════════════════════════════════════════════════
  if (!activeWorld) {
    return (
      <div className="min-h-screen bg-slate-100">
        <div className="sticky top-0 z-20 bg-white/85 backdrop-blur border-b border-gray-100 px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-base font-extrabold text-gray-900">Study Path</h1>
            <p className="text-[11px] text-gray-400">{totalMastered}/{concepts.length} mastered · {overallPct}%</p>
          </div>
          <div className="w-24 h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full transition-all duration-500" style={{ width: `${overallPct}%` }} />
          </div>
        </div>

        <div className="px-4 py-6 max-w-3xl mx-auto">
          <p className="text-sm text-gray-500 mb-4 font-medium">Choose a certification to study</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {sections.map(cat => {
              const items = grouped[cat] || []
              if (!items.length) return null
              const t = WORLD_THEME[cat] || WORLD_THEME['Core']
              const done = items.filter(isCleared).length
              const pct = items.length ? Math.round(done / items.length * 100) : 0
              const started = items.some(c => progress[c.id])
              const allDone = done === items.length
              const starsEarned = items.reduce((sum, c) => sum + starsFor(progress[c.id]?.bestScore), 0)
              const starsPossible = items.length * 3
              return (
                <button key={cat} onClick={() => setActiveWorld(cat)}
                  className={`relative overflow-hidden rounded-3xl p-5 text-left text-white shadow-lg border-b-4 border-black/15 bg-gradient-to-br ${t.cardGrad} active:translate-y-0.5 transition-transform`}>
                  <span aria-hidden className="absolute -right-3 -top-3 text-7xl opacity-20 select-none">{t.emoji}</span>
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl">{t.emoji}</span>
                      <h3 className="text-lg font-extrabold">{cat}</h3>
                      {allDone && <Check size={18} className="ml-auto" strokeWidth={3} />}
                    </div>
                    <p className="text-xs text-white/80 mb-4">{t.sub}</p>
                    <div className="h-2 bg-white/30 rounded-full overflow-hidden mb-1.5">
                      <div className="h-full bg-white rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-white/90">
                        {done}/{items.length} levels · {pct}% ·{' '}
                        <span aria-hidden="true" style={{ color: '#f5b840' }}>★</span>
                        <span className="tabular-nums"> {starsEarned}/{starsPossible}</span>
                        <span className="sr-only"> stars</span>
                      </span>
                      <span className="text-xs font-extrabold bg-white/25 px-3 py-1 rounded-full">
                        {allDone ? 'Review' : started ? 'Continue →' : 'Start →'}
                      </span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Flashcards */}
          <a href="/flashcards"
            className="mt-5 flex items-center gap-3 bg-white rounded-xl border border-gray-200 p-3 hover:border-blue-300 hover:bg-blue-50/50 transition-colors">
            <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
              <LayoutGrid size={18} className="text-purple-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900">Flashcards</p>
              <p className="text-xs text-gray-400">Swipe-drill any section</p>
            </div>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 shrink-0">Free</span>
            <ChevronRight size={16} className="text-gray-300 shrink-0" />
          </a>
        </div>
      </div>
    )
  }

  // ════════════════════════════════════════════════════════════════════
  // WORLD PATH — winding skill path for the selected cert
  // ════════════════════════════════════════════════════════════════════
  const worldItems = grouped[activeWorld] || []
  const wt = WORLD_THEME[activeWorld] || WORLD_THEME['Core']
  const worldDone = worldItems.filter(isCleared).length
  let cur = worldItems.findIndex(c => !isCleared(c))
  if (cur === -1) cur = worldItems.length

  const ACCENT = '#003087' // brand navy (v3 "study route")
  const statusAt = (i: number) => (i > cur ? 'locked' : i === cur ? 'current' : 'done')

  // Boss Exam link — slugs verified against /test/[category]/page.tsx VALID list.
  // Timed mode is Pro-gated ON the test page itself (free users are redirected
  // to the mode selector with the upgrade path) — no client gating here.
  const WORLD_SLUGS: Record<string, string> = { 'Core': 'core', 'Type I': 'type-1', 'Type II': 'type-2', 'Type III': 'type-3' }
  const bossSlug = WORLD_SLUGS[activeWorld] ?? 'core'

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f8fafc', backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(15,23,42,0.045) 1px, transparent 0)', backgroundSize: '22px 22px' }}>
      {/* header */}
      <div className="sticky top-0 z-20 bg-white/85 backdrop-blur border-b border-slate-200">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-3 h-14">
            <button onClick={() => setActiveWorld(null)} className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 shrink-0">
              <ArrowLeft size={16} /> Sections
            </button>
            <div className="h-5 w-px bg-slate-200 shrink-0" />
            <h1 className="text-[15px] font-semibold tracking-tight text-slate-900 truncate">{wt.emoji} {activeWorld}</h1>
            <span className="ml-auto shrink-0 text-xs font-semibold px-2 py-1 rounded-md tabular-nums" style={{ color: ACCENT, backgroundColor: '#eef4fb' }}>{worldDone} / {worldItems.length}</span>
          </div>
          <div className="pb-3 -mt-0.5">
            <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${worldItems.length ? Math.round(worldDone / worldItems.length * 100) : 0}%`, background: ACCENT }} />
            </div>
          </div>
        </div>
      </div>

      {/* title */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-7">
        <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: ACCENT }}>EPA 608 · Study Route</p>
        <h2 className="mt-1.5 text-2xl font-extrabold tracking-tight text-slate-900">{activeWorld} levels</h2>
        <p className="mt-1.5 text-sm text-slate-500 max-w-md">Clear each level with 8 of 10 to unlock the next one.</p>
      </div>

      {/* metro study line */}
      <ol className="max-w-2xl mx-auto px-4 sm:px-6 pt-8 pb-24 relative">
        {worldItems.map((c, i) => {
          const s = statusAt(i)
          const num = String(i + 1).padStart(2, '0')
          const first = i === 0
          const aboveFilled = i > 0 && (i - 1) < cur
          const belowFilled = i < cur
          return (
            <li key={c.id} className="relative flex gap-3 sm:gap-5">
              <div className="hidden sm:flex w-7 shrink-0 items-center justify-end pt-3">
                <span className={`text-xs font-bold tabular-nums ${s === 'locked' ? 'text-slate-300' : 'text-slate-400'}`}>{num}</span>
              </div>
              <div className="relative flex flex-col items-center w-10 shrink-0 self-stretch">
                {first ? <span className="flex-1" /> : <span className="w-[3px] flex-1 rounded-full" style={{ background: aboveFilled ? ACCENT : '#e2e8f0' }} />}
                <div className="my-1">
                  {s === 'done' && (
                    <span className="relative z-10 grid place-items-center w-9 h-9 rounded-full text-white ring-4 ring-white shadow-sm" style={{ background: ACCENT }}>
                      <Check size={16} strokeWidth={3} />
                    </span>
                  )}
                  {s === 'current' && (
                    <span className="relative z-10 grid place-items-center w-10 h-10">
                      <span className="absolute inset-0 rounded-full animate-ping" style={{ background: `${ACCENT}40` }} />
                      <span className="relative grid place-items-center w-10 h-10 rounded-full bg-white shadow-md ring-4" style={{ ['--tw-ring-color' as unknown as string]: ACCENT }}>
                        <span className="w-3 h-3 rounded-full" style={{ background: ACCENT }} />
                      </span>
                    </span>
                  )}
                  {s === 'locked' && (
                    <span className="relative z-10 grid place-items-center w-9 h-9 rounded-full bg-white border-2 border-slate-300 text-slate-400 ring-4 ring-white">
                      <Lock size={15} />
                    </span>
                  )}
                </div>
                {/* Always a bottom connector — the Boss Exam node follows the last level. */}
                <span className="w-[3px] flex-1 rounded-full" style={{ background: belowFilled ? ACCENT : '#e2e8f0' }} />
              </div>
              <div className={`flex-1 min-w-0 ${s === 'current' ? 'py-1.5' : 'py-2.5'}`}>
                {s === 'done' && (
                  <button onClick={() => openConcept(c.subtopicPrefix, c.id)} className="w-full text-left rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm hover:shadow-md hover:border-slate-300 transition">
                    <div className="flex items-center gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <h3 className="text-[15px] font-semibold tracking-tight text-slate-900 truncate">{c.title}</h3>
                          <Stars score={progress[c.id]?.bestScore} />
                        </div>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {progress[c.id]?.bestScore ? `Best ${progress[c.id].bestScore}%` : '10 questions · pass 8/10'}
                          {progress[c.id]?.attempts ? ` · ${progress[c.id].attempts} ${progress[c.id].attempts === 1 ? 'try' : 'tries'}` : ''}
                        </p>
                      </div>
                      <span className="ml-auto shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-md">
                        <Check size={12} strokeWidth={3} /> {progress[c.id]?.bestScore ? `${progress[c.id].bestScore}%` : 'Cleared'}
                      </span>
                    </div>
                  </button>
                )}
                {s === 'current' && (
                  <div className="rounded-2xl border-2 bg-white px-4 py-4 sm:px-5" style={{ borderColor: ACCENT, boxShadow: '0 8px 24px -8px rgba(0,48,135,0.35)' }}>
                    <div className="flex items-center justify-between gap-3">
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md" style={{ color: ACCENT, backgroundColor: '#eef4fb' }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: ACCENT }} /> You are here
                      </span>
                      {(progress[c.id]?.attempts ?? 0) > 0 ? (
                        <span className="text-[11px] font-bold tabular-nums" style={{ color: '#e11d48' }}>Last {progress[c.id]?.lastScore}% · need 80%</span>
                      ) : (
                        <span className="text-[11px] font-medium text-slate-400">Next up</span>
                      )}
                    </div>
                    <div className="mt-2.5 flex items-center gap-1.5 min-w-0">
                      <h3 className="text-lg font-bold tracking-tight text-slate-900">{c.title}</h3>
                      <Stars score={progress[c.id]?.bestScore} />
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      10 questions · pass 8/10
                      {(progress[c.id]?.attempts ?? 0) > 0 ? ` · best ${progress[c.id]?.bestScore}% · ${progress[c.id]?.attempts} ${progress[c.id]?.attempts === 1 ? 'try' : 'tries'}` : ''}
                    </p>
                    <button onClick={() => openConcept(c.subtopicPrefix, c.id)} className="mt-3.5 inline-flex items-center gap-1.5 text-white text-sm font-semibold pl-4 pr-3.5 py-2.5 rounded-xl shadow-sm w-full sm:w-auto justify-center hover:brightness-110 transition" style={{ background: ACCENT }}>
                      {(progress[c.id]?.attempts ?? 0) > 0 ? 'Try again' : 'Start level'} <ArrowRight size={16} />
                    </button>
                  </div>
                )}
                {s === 'locked' && (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="min-w-0">
                        <h3 className="text-[15px] font-semibold tracking-tight text-slate-400 truncate">{c.title}</h3>
                        <p className="mt-0.5 text-xs text-slate-300">10 questions</p>
                      </div>
                      <span className="ml-auto shrink-0 inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 bg-white border border-slate-200 px-2 py-1 rounded-md">
                        <Lock size={12} /> Locked
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </li>
          )
        })}

        {/* BOSS EXAM — final node of the world: the real timed section exam */}
        <li className="relative flex gap-3 sm:gap-5">
          <div className="hidden sm:flex w-7 shrink-0" aria-hidden="true" />
          <div className="relative flex flex-col items-center w-10 shrink-0 self-stretch">
            <span className="w-[3px] flex-1 rounded-full" style={{ background: cur >= worldItems.length && worldItems.length > 0 ? ACCENT : '#e2e8f0' }} />
            <div className="my-1">
              <span aria-hidden="true" className="relative z-10 grid place-items-center w-10 h-10 rounded-full text-lg text-white ring-4 ring-white shadow-sm" style={{ background: '#001d57' }}>
                🏰
              </span>
            </div>
            <span className="flex-1" />
          </div>
          <div className="flex-1 min-w-0 py-1.5">
            <Link
              href={`/test/${bossSlug}?mode=test`}
              className="block rounded-2xl px-4 py-4 sm:px-5 text-white shadow-md border-b-4 border-black/25 hover:brightness-110 active:translate-y-0.5 transition"
              style={{ background: '#001d57' }}
            >
              <div className="flex items-center gap-3">
                <div className="min-w-0">
                  <h3 className="text-[15px] sm:text-base font-bold tracking-tight">Boss Exam — 25 questions, 72% to pass, timed</h3>
                  <p className="mt-0.5 text-xs text-white/70">The real exam, simulated</p>
                </div>
                <ArrowRight size={18} className="ml-auto shrink-0 text-white/80" />
              </div>
            </Link>
          </div>
        </li>
      </ol>

      {cur >= worldItems.length && (
        <div className="max-w-2xl mx-auto px-4 sm:px-6 pb-24">
          <div className="text-center bg-white border border-emerald-200 rounded-2xl p-6">
            <Trophy size={32} className="text-amber-500 mx-auto mb-2" />
            <p className="text-slate-900 font-extrabold text-lg">{activeWorld} complete</p>
            <p className="text-slate-500 text-sm mt-1">Take the {activeWorld} practice test to confirm.</p>
          </div>
        </div>
      )}
    </div>
  )
}
