'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import type { QuestionPublic, SessionResult } from '@/types'
import { ResultView } from './ResultView'
import { ReportButton } from './ReportButton'
import { ELI5Button } from './ELI5Button'
import { canonicalMulti, MULTI_SEP } from '@/lib/multi'

type Phase = 'loading' | 'active' | 'submitted' | 'error'

// Open-book question: practice mode response includes answer_text + explanation.
// Timed mode never sends these (they stay undefined), so the same type is safe
// for both — reveal logic is guarded by `showExplanations`.
type EngineQuestion = QuestionPublic & {
  question_type?: string
  answer_text?: string
  explanation?: string
}

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
 * Unified quiz engine for BOTH Timed Simulation and Practice.
 * Differs ONLY by:
 *  - `timed`            → countdown + auto-submit at 0 (else no countdown)
 *  - `showExplanations` → inline reveal + explanation + ELI5 after each answer
 *
 * BOTH modes create a server session and submit to /api/sessions/[id]/submit,
 * so both are scored server-side and appear in Test History.
 *
 * `mode` selects the question source ('blind-spot' for the weak-spots page).
 * Practice forces mode='practice' (open-book); timed uses mode (random/blind-spot).
 */
export function TestClient({
  category,
  mode = 'random',
  timed = true,
  showExplanations = false,
}: {
  category: string
  mode?: 'random' | 'blind-spot'
  timed?: boolean
  showExplanations?: boolean
}) {
  const [phase, setPhase] = useState<Phase>('loading')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [questions, setQuestions] = useState<EngineQuestion[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [currentIdx, setCurrentIdx] = useState(0)
  const [timeLeft, setTimeLeft] = useState(1800)
  const [elapsed, setElapsed] = useState(0)
  const [result, setResult] = useState<SessionResult | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [submitting, setSubmitting] = useState(false)
  // Practice only: which question indices have been revealed (answer locked).
  const [revealed, setRevealed] = useState<Set<number>>(new Set())
  const [retakeKey] = useState(0)

  function handleRetake() {
    const hardReload = (window as any).__hardReload
    if (hardReload) hardReload()
    else window.location.reload()
  }

  // Load questions. Practice → mode='practice' (open-book); else pass through mode.
  useEffect(() => {
    const requestMode = showExplanations ? 'practice' : mode
    fetch('/api/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: mode === 'blind-spot' ? 'Universal' : category,
        count: category === 'Universal' ? 100 : 25,
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
        if (typeof data.timeLimitSecs === 'number') setTimeLeft(data.timeLimitSecs)
        setPhase('active')
      })
      .catch(() => { setErrorMsg('Failed to load questions.'); setPhase('error') })
  }, [category, mode, showExplanations, retakeKey])

  // Countdown timer — TIMED ONLY. Auto-submits at 0.
  useEffect(() => {
    if (phase !== 'active' || !timed) return
    const t = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(t); handleSubmit(); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, timed])

  // Count-up elapsed — PRACTICE ONLY (no auto-submit).
  useEffect(() => {
    if (phase !== 'active' || timed) return
    const t = setInterval(() => setElapsed(prev => prev + 1), 1000)
    return () => clearInterval(t)
  }, [phase, timed])

  const handleSubmit = useCallback(async () => {
    if (!sessionId || phase === 'submitted' || submitting) return
    setSubmitting(true)
    try {
      const r = await fetch(`/api/sessions/${sessionId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      })
      const data = await r.json()
      if (r.ok) setResult(data)
      else { setErrorMsg(data.error); setPhase('error') }
    } catch {
      setErrorMsg('Submit failed.'); setPhase('error')
    } finally {
      setSubmitting(false)
    }
  }, [sessionId, answers, phase, submitting])

  const q = questions[currentIdx]
  const isRevealed = revealed.has(currentIdx)
  const isMulti = (q as { question_type?: string })?.question_type === 'multi_select'

  // Practice: lock the current question's answer and reveal correct/explanation.
  // Multi-select reveals on an explicit "Check answer"; single reveals on pick.
  const revealCurrent = useCallback(() => {
    if (!showExplanations || isRevealed || !answers[q?.id]) return
    setRevealed(prev => new Set(prev).add(currentIdx))
  }, [showExplanations, isRevealed, answers, q, currentIdx])

  // Keyboard shortcuts
  useEffect(() => {
    if (phase !== 'active') return
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
          setAnswers(prev => applyPick(prev, cur, cur.options[idx]))
        }
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [phase, currentIdx, questions, answers, showExplanations, revealed])

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

  useEffect(() => {
    scrollToTop()
  }, [currentIdx])

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  const answeredCount = Object.keys(answers).length
  const isUniversal = category === 'Universal'

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

  if (result) return <ResultView result={result} category={category} questions={questions} onRetake={handleRetake} />

  const correctAnswer = q?.answer_text
  const isCorrect = showExplanations && isRevealed && answers[q.id] === correctAnswer

  return (
    <div className="h-[calc(100dvh-3.5rem)] md:h-dvh bg-gray-50 flex flex-col overflow-hidden">
      {/* ═══ COMPACT HEADER: Category + Question Counter + Timer/Clock ═══ */}
      <header className="bg-white border-b px-3 sm:px-6 py-2.5 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-semibold text-gray-600 uppercase tracking-wider shrink-0">{category}</span>
            <span className="text-base font-bold text-gray-900">
              {currentIdx + 1}<span className="text-gray-500 font-normal">/{questions.length}</span>
            </span>
          </div>

          <div className="text-sm text-gray-600 hidden sm:block">
            {showExplanations
              ? `${revealed.size}/${questions.length} answered`
              : `${answeredCount}/${questions.length} answered`}
          </div>

          {/* Right: countdown (timed) or elapsed clock (practice) */}
          {timed ? (
            <div className={`text-base font-mono font-bold tabular-nums shrink-0 ${timeLeft < 300 ? 'text-red-600' : 'text-gray-700'}`}>
              {formatTime(timeLeft)}
            </div>
          ) : (
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-medium hidden sm:inline">Practice</span>
              <span className="text-base font-mono font-bold tabular-nums text-gray-400">{formatTime(elapsed)}</span>
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
      {isUniversal && q.category && (
        <div className="bg-gray-50 border-b px-4 py-1.5 shrink-0">
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
            <p className="text-xs font-bold text-purple-600 mb-3">Select all that apply</p>
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
                : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/50 text-gray-800'
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
                    setAnswers(prev => applyPick(prev, q, opt))
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
      <footer className="bg-white border-t px-3 sm:px-6 py-2.5 shrink-0" style={{ paddingBottom: 'max(10px, env(safe-area-inset-bottom))' }}>
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
              <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${((showExplanations ? revealed.size : answeredCount) / questions.length) * 100}%` }} />
            </div>
          </div>

          {/* Practice multi-select needs an explicit "Check" before reveal */}
          {showExplanations && isMulti && !isRevealed ? (
            <button
              onClick={revealCurrent}
              disabled={!answers[q?.id]}
              className="px-4 py-2.5 min-h-[48px] min-w-[72px] bg-blue-800 text-white rounded-xl hover:bg-blue-900 disabled:opacity-40 text-base font-medium"
            >
              Check
            </button>
          ) : currentIdx < questions.length - 1 ? (
            <button
              onClick={() => setCurrentIdx(i => i + 1)}
              disabled={showExplanations && !isRevealed}
              className="px-4 py-2.5 min-h-[48px] min-w-[72px] bg-blue-800 text-white rounded-xl hover:bg-blue-900 disabled:opacity-40 text-base font-medium"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting || (showExplanations && !isRevealed)}
              className="px-4 py-2.5 min-h-[48px] min-w-[72px] bg-green-600 text-white rounded-xl hover:bg-green-700 font-bold disabled:opacity-50 text-base"
            >
              {submitting ? '...' : 'Submit'}
            </button>
          )}
        </div>
      </footer>
    </div>
  )
}
