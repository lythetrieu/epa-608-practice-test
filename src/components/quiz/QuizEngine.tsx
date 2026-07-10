'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { ArrowRight, Check } from 'lucide-react'
import { canonicalMulti, MULTI_SEP } from '@/lib/multi'
import { ELI5Button } from './ELI5Button'
import { ReportButton } from './ReportButton'
import type { AnswerRecord, QuizEngineProps, QuizOutcome, QuizQuestion } from './types'

// Set (single) or toggle (multi-select) an option for a question.
function applyPick(prev: Record<string, string>, q: { id: string; question_type?: string }, opt: string): Record<string, string> {
  if (q.question_type !== 'multi_select') return { ...prev, [q.id]: opt }
  const set = new Set(prev[q.id] ? prev[q.id].split(MULTI_SEP) : [])
  if (set.has(opt)) set.delete(opt); else set.add(opt)
  return { ...prev, [q.id]: canonicalMulti([...set]) }
}

// Scannable explanation: split into bullets, bold key numbers/units, flag rules.
function PatternExplanation({ text }: { text: string }) {
  const sentences = text
    .split(/\.\s+/)
    .map(s => s.trim().replace(/\.$/, ''))
    .filter(s => s.length > 10)

  if (sentences.length <= 1) {
    return <p className="text-sm text-gray-700">{text}</p>
  }

  return (
    <ul className="space-y-1.5">
      {sentences.slice(0, 4).map((s, i) => {
        const hasNumber = /\d/.test(s)
        const isRule = /(must|never|always|cannot|required|illegal|only|not allowed)/i.test(s)
        const formatted = s.replace(
          /(\b\d[\d,.]*\s*(%|psig|degrees?|°F|lbs?|psi|microns?|years?|days?)\b)/gi,
          '**$1**'
        )
        return (
          <li key={i} className={`text-xs leading-relaxed pl-3 border-l-2 py-0.5 ${
            isRule ? 'border-red-400 text-red-800 font-medium'
            : hasNumber ? 'border-blue-400 text-blue-800'
            : 'border-gray-300 text-gray-700'
          }`}>
            {formatted.split('**').map((part, j) =>
              j % 2 === 1 ? <strong key={j} className="font-bold">{part}</strong> : <span key={j}>{part}</span>
            )}.
          </li>
        )
      })}
    </ul>
  )
}

/**
 * Unified quiz engine for ALL quiz surfaces:
 *  - Practice ('practice')      : untimed count-up clock, per-question reveal +
 *                                 explanation + ELI5 — answers lock once revealed.
 *  - Timed Simulation ('exam')  : countdown + auto-submit at 0, deferred feedback.
 *  - Weak Spots ('drill')       : identical behavior to 'exam'.
 *  - Study Path ('study')       : untimed, deferred feedback, Study Path chrome
 *                                 (brand navy card, dot progress, Back/Next footer).
 *
 * The engine owns ONLY the quiz loop (question display, answer state, timer,
 * keyboard shortcuts, progress). Callers fetch questions, submit answers on
 * `onComplete`, and render their own result screens.
 */
export function QuizEngine({
  questions,
  mode,
  timeLimitSecs = null,
  onComplete,
  onQuestionAnswered,
  title,
  header,
  showQuestionCategory = false,
}: QuizEngineProps) {
  const timed = mode === 'exam' || mode === 'drill'
  const showExplanations = mode === 'practice'
  const isStudy = mode === 'study'

  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [timeLeft, setTimeLeft] = useState(timeLimitSecs ?? 1800)
  const [elapsed, setElapsed] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  // Practice only: which question indices have been revealed (answer locked).
  const [revealed, setRevealed] = useState<Set<number>>(new Set())

  const startedAtRef = useRef(Date.now())
  // First-view timestamp per question id — enriches per-question tracking (timeMs).
  const firstViewedRef = useRef<Record<string, number>>({})
  // Per-question ACTIVE viewing ms, accumulated across revisits. Only the
  // question currently on screen accrues time; the open segment is flushed
  // whenever the user leaves it or answers it. Refs + Date.now() only — no
  // per-second state updates.
  const timeSpentRef = useRef<Record<string, number>>({})
  // Snapshot of accumulated active time at each question's LAST answer pick —
  // this is the timeMs shipped in the outcome (post-answer review, e.g. reading
  // a practice explanation, doesn't count toward answering time).
  const answeredTimeRef = useRef<Record<string, number>>({})
  // The question currently accruing time and when its open segment started.
  const activeViewRef = useRef<{ id: string; since: number } | null>(null)

  // Close the open viewing segment: bank its elapsed ms and restart the clock.
  const flushActiveView = useCallback(() => {
    const av = activeViewRef.current
    if (!av) return
    const now = Date.now()
    timeSpentRef.current[av.id] = (timeSpentRef.current[av.id] ?? 0) + (now - av.since)
    av.since = now
  }, [])

  // On question change: stamp first view (first view wins) and switch the
  // active-time accrual to the newly visible question.
  useEffect(() => {
    const cur = questions[currentIdx]
    if (!cur) return
    if (firstViewedRef.current[cur.id] == null) firstViewedRef.current[cur.id] = Date.now()
    if (activeViewRef.current?.id !== cur.id) {
      flushActiveView()
      activeViewRef.current = { id: cur.id, since: Date.now() }
    }
  }, [currentIdx, questions, flushActiveView])

  const buildOutcome = useCallback((): QuizOutcome => {
    const records: AnswerRecord[] = questions.map(qq => {
      const answer = answers[qq.id] ?? null
      const record: AnswerRecord = { questionId: qq.id, answer }
      // Correctness is only client-knowable in open-book (practice) mode.
      if (showExplanations && qq.answer_text !== undefined) record.correct = answer === qq.answer_text
      const viewed = firstViewedRef.current[qq.id]
      if (viewed != null) record.firstViewedAt = viewed
      const timeMs = answeredTimeRef.current[qq.id]
      if (timeMs != null) record.timeMs = timeMs
      return record
    })
    return {
      answers: records,
      answersMap: answers,
      score: records.filter(r => r.correct).length,
      total: questions.length,
      elapsedSecs: Math.round((Date.now() - startedAtRef.current) / 1000),
    }
  }, [questions, answers, showExplanations])

  const handleSubmit = useCallback(async () => {
    if (submitting) return
    setSubmitting(true)
    try {
      await onComplete(buildOutcome())
    } finally {
      setSubmitting(false)
    }
  }, [submitting, onComplete, buildOutcome])

  // Latest-submit ref so the countdown's auto-submit sends the CURRENT answers
  // (the interval closure would otherwise capture a stale snapshot).
  const submitRef = useRef(handleSubmit)
  useEffect(() => { submitRef.current = handleSubmit }, [handleSubmit])

  // Countdown timer — TIMED ONLY. Auto-submits at 0.
  useEffect(() => {
    if (!timed) return
    const t = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(t); submitRef.current(); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [timed])

  // Count-up elapsed — PRACTICE ONLY (no auto-submit).
  useEffect(() => {
    if (mode !== 'practice') return
    const t = setInterval(() => setElapsed(prev => prev + 1), 1000)
    return () => clearInterval(t)
  }, [mode])

  // ── Live pace check — TIMED ONLY (untimed learners get no pressure chip) ──
  // "Behind pace" once the user has fallen a FULL question behind the budget
  // (timeLimitSecs / questions.length per question) — the <1-question slack
  // stops the chip flickering while a question is being read. Recomputed on
  // answer/navigation plus a coarse 15s tick, never per second; setState with
  // an unchanged boolean is a no-op render for React.
  const [behindPace, setBehindPace] = useState(false)
  const answeredCount = Object.keys(answers).length
  const recomputePace = useCallback(() => {
    if (!timed || questions.length === 0) return
    const budgetMsPerQ = ((timeLimitSecs ?? 1800) * 1000) / questions.length
    const expectedAnswered = (Date.now() - startedAtRef.current) / budgetMsPerQ
    setBehindPace(expectedAnswered - answeredCount >= 1)
  }, [timed, questions.length, timeLimitSecs, answeredCount])

  useEffect(() => { recomputePace() }, [recomputePace, currentIdx])
  const paceRef = useRef(recomputePace)
  useEffect(() => { paceRef.current = recomputePace }, [recomputePace])
  useEffect(() => {
    if (!timed) return
    const t = setInterval(() => paceRef.current(), 15_000)
    return () => clearInterval(t)
  }, [timed])

  const q = questions[currentIdx]
  const isRevealed = revealed.has(currentIdx)
  const isMulti = q?.question_type === 'multi_select'

  // Shared pick: set/toggle the option, then notify the optional per-answer hook.
  const pickOption = useCallback((question: QuizQuestion, opt: string) => {
    // Bank the current viewing segment, then snapshot the question's TOTAL
    // active time as its answer time. Re-picking later (a revisit) simply
    // overwrites the snapshot with the larger accumulated total — so timeMs
    // always reflects first view → FINAL answer lock, active viewing only.
    if (activeViewRef.current?.id === question.id) flushActiveView()
    answeredTimeRef.current[question.id] = Math.round(timeSpentRef.current[question.id] ?? 0)

    const next = applyPick(answers, question, opt)
    setAnswers(next)
    if (onQuestionAnswered) {
      const record: AnswerRecord = { questionId: question.id, answer: next[question.id] ?? null }
      const viewed = firstViewedRef.current[question.id]
      if (viewed != null) record.firstViewedAt = viewed
      const timeMs = answeredTimeRef.current[question.id]
      if (timeMs != null) record.timeMs = timeMs
      onQuestionAnswered(record)
    }
  }, [answers, onQuestionAnswered, flushActiveView])

  // Practice: lock the current question's answer and reveal correct/explanation.
  // Multi-select reveals on an explicit "Check answer"; single reveals on pick.
  const revealCurrent = useCallback(() => {
    if (!showExplanations || isRevealed || !answers[q?.id]) return
    setRevealed(prev => new Set(prev).add(currentIdx))
  }, [showExplanations, isRevealed, answers, q, currentIdx])

  // Keyboard shortcuts — practice/exam/drill only (Study Path never had them).
  useEffect(() => {
    if (isStudy) return
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return
      const cur = questions[currentIdx]
      if (e.key === 'Enter' || e.key === 'ArrowRight') {
        e.preventDefault()
        // Practice: Enter reveals first, then advances.
        if (showExplanations && answers[cur?.id] && !revealed.has(currentIdx)) {
          setRevealed(prev => new Set(prev).add(currentIdx))
          return
        }
        if (answers[cur?.id] && currentIdx < questions.length - 1) {
          setCurrentIdx(i => i + 1)
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        if (currentIdx > 0) setCurrentIdx(i => i - 1)
      } else if (['1', '2', '3', '4', '5'].includes(e.key)) {
        // In practice, can't change a locked answer.
        if (showExplanations && revealed.has(currentIdx)) return
        const idx = parseInt(e.key) - 1
        if (cur?.options[idx]) {
          pickOption(cur, cur.options[idx])
        }
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isStudy, currentIdx, questions, answers, showExplanations, revealed, pickOption])

  const mainRef = useRef<HTMLElement>(null)

  function scrollToTop() {
    mainRef.current?.scrollTo({ top: 0, behavior: 'instant' })
    let el: HTMLElement | null = mainRef.current?.parentElement ?? null
    while (el) {
      if (el.scrollTop > 0) el.scrollTop = 0
      el = el.parentElement
    }
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  // Scroll to top on question change — test chrome only (Study Path never did).
  useEffect(() => {
    if (isStudy) return
    scrollToTop()
  }, [currentIdx, isStudy])

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  if (!q) return null

  // ═══════════════════════════════════════════════════════════════════════════
  // STUDY CHROME — Study Path mastery check (brand navy card, deferred feedback)
  // ═══════════════════════════════════════════════════════════════════════════
  if (isStudy) {
    const A = '#003087'
    const total = questions.length
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,.04),0_10px_30px_-14px_rgba(15,23,42,.18)]">
        <header className="border-b border-slate-100 px-5 py-4 sm:px-7">
          <div className="flex items-center justify-between gap-3">
            {header}
            <p className="min-w-0 flex-1 truncate text-center text-sm font-semibold text-slate-900">{title}</p>
            <span className="shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold tabular-nums" style={{ background: '#eef4fb', color: '#003087' }}>{currentIdx + 1} / {total}</span>
          </div>
          <div className="mt-3">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full transition-all" style={{ width: `${((currentIdx + 1) / total) * 100}%`, background: A }} />
            </div>
            <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
              {questions.map((qq, i) => (
                <span key={i} className={`rounded-full ${i === currentIdx ? 'h-2.5 w-2.5 ring-4' : 'h-2 w-2'}`} style={{ background: (i === currentIdx || answers[qq.id]) ? A : '#e2e8f0', ['--tw-ring-color' as unknown as string]: '#eef4fb' }} />
              ))}
            </div>
          </div>
        </header>

        <div className="px-5 py-6 sm:px-7 sm:py-8">
          <div className="flex items-center gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Question {currentIdx + 1}</p>
            {q.question_type === 'multi_select' && <span className="rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide" style={{ background: '#eef4fb', color: '#003087' }}>Select all that apply</span>}
            {q.question_type === 'true_false' && <span className="text-[11px] font-semibold text-slate-400">· True or False</span>}
          </div>
          <h2 className="mt-2 text-lg font-bold leading-snug text-slate-900 sm:text-xl">{q.question}</h2>

          {(() => {
            const multi = q.question_type === 'multi_select'
            const tf = q.question_type === 'true_false'
            const current = answers[q.id] ? answers[q.id].split(MULTI_SEP) : []
            if (tf) {
              return (
                <div className="mt-7 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {q.options.map((opt, i) => {
                    const sel = answers[q.id] === opt
                    return (
                      <button key={i} onClick={() => pickOption(q, opt)} className="flex min-h-[80px] items-center justify-center gap-3 rounded-2xl border-2 px-5 py-5 transition" style={sel ? { borderColor: A, background: 'rgba(238,244,251,.6)' } : { borderColor: '#e2e8f0' }}>
                        <span className="text-lg font-bold" style={sel ? { color: '#0f172a' } : { color: '#64748b' }}>{opt}</span>
                      </button>
                    )
                  })}
                </div>
              )
            }
            const letters = ['A', 'B', 'C', 'D', 'E']
            return (
              <div className="mt-6 space-y-3">
                {q.options.map((opt, i) => {
                  const sel = multi ? current.includes(opt) : answers[q.id] === opt
                  return (
                    <button key={i} onClick={() => pickOption(q, opt)} className="w-full text-left flex min-h-[56px] items-center gap-4 rounded-xl border-2 px-4 py-3.5 transition hover:border-blue-200" style={sel ? { borderColor: A, background: 'rgba(238,244,251,.6)' } : { borderColor: '#e2e8f0', background: '#fff' }}>
                      {multi ? (
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md border-2" style={sel ? { borderColor: A, background: A, color: '#fff' } : { borderColor: '#e2e8f0', color: 'transparent' }}><Check size={16} strokeWidth={2.5} /></span>
                      ) : (
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border-2 text-sm font-bold" style={sel ? { borderColor: A, background: A, color: '#fff' } : { borderColor: '#e2e8f0', color: '#64748b' }}>{letters[i]}</span>
                      )}
                      <span className={`text-[15px] ${sel ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'}`}>{opt}</span>
                    </button>
                  )
                })}
              </div>
            )
          })()}
        </div>

        <footer className="flex items-center gap-3 border-t border-slate-100 bg-slate-50/60 px-5 py-4 sm:px-7">
          {currentIdx > 0 ? <button onClick={() => setCurrentIdx(currentIdx - 1)} className="text-sm font-medium text-slate-500 hover:text-slate-900">Back</button> : <span />}
          <div className="flex-1" />
          <button disabled={!answers[q.id] || submitting} onClick={() => { if (currentIdx < total - 1) setCurrentIdx(currentIdx + 1); else handleSubmit() }}
            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white shadow disabled:opacity-40 disabled:cursor-not-allowed transition" style={{ background: answers[q.id] ? '#F97316' : '#94a3b8' }}>
            {submitting ? 'Scoring…' : currentIdx === total - 1 ? 'Submit answers' : 'Next question'} <ArrowRight size={16} />
          </button>
        </footer>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST CHROME — Practice / Timed Simulation / Weak Spots drill
  // ═══════════════════════════════════════════════════════════════════════════
  const correctAnswer = q?.answer_text
  const isCorrect = showExplanations && isRevealed && answers[q.id] === correctAnswer

  return (
    <div className="h-[calc(100dvh-3.5rem)] md:h-dvh bg-gray-50 flex flex-col overflow-hidden">
      {/* ═══ COMPACT HEADER: Category + Question Counter + Timer/Clock ═══ */}
      <header className="bg-white border-b border-line px-3 sm:px-6 py-2.5 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {header}
            <span className="text-sm font-semibold text-steel uppercase tracking-wider shrink-0">{title}</span>
            <span className="text-base font-bold font-mono text-primary-900">
              {currentIdx + 1}<span className="text-steel font-normal">/{questions.length}</span>
            </span>
          </div>

          <div className="text-sm text-steel hidden sm:block">
            {showExplanations
              ? `${revealed.size}/${questions.length} answered`
              : `${answeredCount}/${questions.length} answered`}
          </div>

          {/* Right: pace chip + countdown (timed) or elapsed clock (practice) */}
          {timed ? (
            <div className="flex items-center gap-2 shrink-0">
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${behindPace ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'}`}
                aria-live="polite"
              >
                {behindPace ? "Too slow — won't finish" : 'On pace'}
              </span>
              <div className={`text-base font-mono font-bold tabular-nums ${timeLeft < 300 ? 'text-red-600' : 'text-primary-900'}`}>
                {formatTime(timeLeft)}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-medium hidden sm:inline">Practice</span>
              <span className="text-base font-mono font-bold tabular-nums text-primary-900">{formatTime(elapsed)}</span>
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-gray-100 rounded-full mt-2 -mb-0.5">
          <div
            className="h-full bg-blue-800 rounded-full transition-all duration-300"
            style={{ width: `${((showExplanations ? revealed.size : answeredCount) / questions.length) * 100}%` }}
          />
        </div>
      </header>

      {/* ═══ SECTION INDICATOR (Universal only) ═══ */}
      {showQuestionCategory && q.category && (
        <div className="bg-gray-50 border-b border-line px-4 py-1.5 shrink-0">
          <p className="text-xs text-gray-500 text-center font-medium">
            Section: <span className="text-gray-800 font-bold">{q.category}</span>
          </p>
        </div>
      )}

      {/* ═══ QUESTION ═══ */}
      <main ref={mainRef} className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="w-full max-w-2xl mx-auto">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="text-lg sm:text-xl font-semibold text-gray-900 leading-relaxed break-words">{q.question}</p>
            <ReportButton questionId={q.id} />
          </div>
          {isMulti && (
            <p className="text-xs font-bold text-blue-800 mb-3">Select all that apply</p>
          )}

          <div className="space-y-2.5 sm:space-y-3 mt-3">
            {q.options.map((opt, i) => {
              const letter = ['A', 'B', 'C', 'D', 'E'][i]
              const selected = isMulti ? (answers[q.id]?.split(MULTI_SEP).includes(opt) ?? false) : answers[q.id] === opt
              const isCorrectOption = showExplanations && isRevealed && opt === correctAnswer
              const isWrongPick = showExplanations && isRevealed && selected && opt !== correctAnswer

              // Styling: practice reveal overrides selection colors.
              let btnClass = selected
                ? 'border-blue-800 bg-blue-50 text-blue-900'
                : 'border-line bg-white hover:border-blue-300 hover:bg-blue-50/50 text-gray-800'
              if (showExplanations && isRevealed) {
                if (isCorrectOption) btnClass = 'border-green-500 bg-green-50 text-green-900'
                else if (isWrongPick) btnClass = 'border-red-500 bg-red-50 text-red-900'
                else btnClass = 'border-gray-200 bg-gray-50 text-gray-400'
              }

              return (
                <button
                  key={i}
                  disabled={showExplanations && isRevealed}
                  onClick={() => {
                    pickOption(q, opt)
                    ;(document.activeElement as HTMLElement)?.blur()
                    if (showExplanations && !isMulti) {
                      // Single-select practice reveals immediately on pick.
                      setRevealed(prev => new Set(prev).add(currentIdx))
                    } else if (!showExplanations && !isMulti) {
                      scrollToTop()
                    }
                  }}
                  className={`w-full text-left px-5 py-4 min-h-[56px] rounded-xl border-2 transition-all flex gap-3 items-start text-base ${btnClass} ${showExplanations && isRevealed ? 'cursor-default' : ''}`}
                >
                  {isMulti && !(showExplanations && isRevealed) ? (
                    <span className={`shrink-0 mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center text-xs font-bold ${selected ? 'border-blue-800 bg-blue-800 text-white' : 'border-gray-300 text-transparent'}`}>✓</span>
                  ) : (
                    <span className={`font-bold text-base mt-0.5 shrink-0 ${
                      isCorrectOption ? 'text-green-600'
                      : isWrongPick ? 'text-red-500'
                      : selected ? 'text-blue-800' : 'text-gray-500'
                    }`}>{letter}.</span>
                  )}
                  <span>{opt}</span>
                  {isCorrectOption && <span className="ml-auto text-green-600 font-bold shrink-0">✓</span>}
                  {isWrongPick && <span className="ml-auto text-red-500 font-bold shrink-0">✗</span>}
                </button>
              )
            })}
          </div>

          {/* ═══ PRACTICE: inline reveal + explanation + ELI5 ═══ */}
          {showExplanations && isRevealed && (
            <div className={`mt-4 sm:mt-6 rounded-xl border-2 p-4 sm:p-5 ${isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-lg ${isCorrect ? 'text-green-600' : 'text-red-500'}`}>{isCorrect ? '✓' : '✗'}</span>
                <span className={`font-semibold ${isCorrect ? 'text-green-800' : 'text-red-800'}`}>{isCorrect ? 'Correct!' : 'Incorrect'}</span>
              </div>
              {!isCorrect && correctAnswer && (
                <p className="text-sm text-red-700 mb-2">
                  Correct answer: <span className="font-semibold">{correctAnswer.split(MULTI_SEP).join(', ')}</span>
                </p>
              )}
              {q.explanation && <PatternExplanation text={q.explanation} />}
              {!isCorrect && correctAnswer && <ELI5Button questionText={q.question} correctAnswer={correctAnswer} />}
            </div>
          )}
        </div>
      </main>

      {/* ═══ FOOTER: nav buttons + progress ═══ */}
      <footer className="bg-white border-t border-line px-3 sm:px-6 py-2.5 shrink-0" style={{ paddingBottom: 'max(10px, env(safe-area-inset-bottom))' }}>
        <div className="flex justify-between items-center gap-3 max-w-2xl mx-auto">
          <button
            onClick={() => setCurrentIdx(i => Math.max(0, i - 1))}
            disabled={currentIdx === 0}
            className="px-4 py-2.5 min-h-[48px] min-w-[72px] border border-gray-300 rounded-xl text-gray-700 disabled:opacity-30 hover:bg-gray-50 text-base font-medium"
          >
            ← Prev
          </button>

          <div className="flex-1 text-center min-w-0">
            <p className="text-sm font-bold text-gray-800">
              {showExplanations ? `${revealed.size}/${questions.length} answered` : `${answeredCount}/${questions.length} answered`}
            </p>
            <div className="h-1.5 bg-gray-200 rounded-full mt-1 mx-auto max-w-[200px]">
              <div className="h-full bg-blue-800 rounded-full transition-all" style={{ width: `${((showExplanations ? revealed.size : answeredCount) / questions.length) * 100}%` }} />
            </div>
          </div>

          {/* Primary action = the screen's ONE orange (only one of these renders) */}
          {showExplanations && isMulti && !isRevealed ? (
            <button
              onClick={revealCurrent}
              disabled={!answers[q?.id]}
              className="px-4 py-2.5 min-h-[48px] min-w-[72px] bg-orange-500 text-white rounded-xl hover:bg-orange-600 disabled:opacity-40 text-base font-medium"
            >
              Check
            </button>
          ) : currentIdx < questions.length - 1 ? (
            <button
              onClick={() => setCurrentIdx(i => i + 1)}
              disabled={showExplanations && !isRevealed}
              className="px-4 py-2.5 min-h-[48px] min-w-[72px] bg-orange-500 text-white rounded-xl hover:bg-orange-600 disabled:opacity-40 text-base font-medium"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting || (showExplanations && !isRevealed)}
              className="px-4 py-2.5 min-h-[48px] min-w-[72px] bg-orange-500 text-white rounded-xl hover:bg-orange-600 font-bold disabled:opacity-50 text-base"
            >
              {submitting ? '...' : 'Submit'}
            </button>
          )}
        </div>
      </footer>
    </div>
  )
}
