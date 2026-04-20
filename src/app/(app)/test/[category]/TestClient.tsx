'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import type { QuestionPublic, SessionResult } from '@/types'
import { ResultView } from './ResultView'
import { ReportButton } from './ReportButton'

type Phase = 'loading' | 'active' | 'submitted' | 'error'

export function TestClient({ category, mode = 'random' }: { category: string; mode?: 'random' | 'blind-spot' }) {
  const [phase, setPhase] = useState<Phase>('loading')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [questions, setQuestions] = useState<QuestionPublic[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [currentIdx, setCurrentIdx] = useState(0)
  const [timeLeft, setTimeLeft] = useState(1800)
  const [result, setResult] = useState<SessionResult | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [retakeKey, setRetakeKey] = useState(0)

  function handleRetake() {
    window.scrollTo({ top: 0, behavior: 'instant' })
    setResult(null)
    setPhase('loading')
    setSessionId(null)
    setQuestions([])
    setAnswers({})
    setCurrentIdx(0)
    setTimeLeft(1800)
    setErrorMsg('')
    setSubmitting(false)
    setRetakeKey(k => k + 1)
  }

  // Load questions
  useEffect(() => {
    fetch('/api/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: mode === 'blind-spot' ? 'Universal' : category,
        count: category === 'Universal' ? 100 : 25,
        mode,
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
        setTimeLeft(data.timeLimitSecs)
        setPhase('active')
      })
      .catch(() => { setErrorMsg('Failed to load questions.'); setPhase('error') })
  }, [category, mode, retakeKey])

  // Timer
  useEffect(() => {
    if (phase !== 'active') return
    const t = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(t); handleSubmit(); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [phase])

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

  // Keyboard shortcuts
  useEffect(() => {
    if (phase !== 'active') return
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return
      const q = questions[currentIdx]
      if (e.key === 'Enter' || e.key === 'ArrowRight') {
        e.preventDefault()
        if (answers[q?.id] && currentIdx < questions.length - 1) {
          setCurrentIdx(i => i + 1)
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        if (currentIdx > 0) setCurrentIdx(i => i - 1)
      } else if (['1','2','3','4'].includes(e.key)) {
        const idx = parseInt(e.key) - 1
        if (q?.options[idx]) {
          setAnswers(prev => ({ ...prev, [q.id]: q.options[idx] }))
        }
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [phase, currentIdx, questions, answers])

  const mainRef = useRef<HTMLElement>(null)

  // Reset ALL scroll containers to top on question change.
  // The layout's outer <main> (overflow-auto) is the real scroll culprit on mobile —
  // scrolling mainRef alone isn't enough.
  function scrollToTop() {
    mainRef.current?.scrollTo({ top: 0, behavior: 'instant' })
    // Walk up DOM and reset any ancestor that has scrolled
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

  const formatTime = (s: number) => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`
  const q = questions[currentIdx]
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
        <p className="text-red-700 font-semibold text-lg mb-2">Could not start test</p>
        <p className="text-red-600 mb-6">{errorMsg}</p>
        <a href="/dashboard" className="px-6 py-2 bg-blue-800 text-white rounded-lg">Back to Dashboard</a>
      </div>
    </div>
  )

  if (result) return <ResultView result={result} category={category} questions={questions} onRetake={handleRetake} />

  return (
    <div className="h-[calc(100dvh-3.5rem)] md:h-dvh bg-gray-50 flex flex-col overflow-hidden">
      {/* ═══ COMPACT HEADER: Category + Question Counter + Timer ═══ */}
      <header className="bg-white border-b px-3 sm:px-6 py-2.5 shrink-0">
        <div className="flex items-center justify-between gap-2">
          {/* Left: category + question number */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-semibold text-gray-600 uppercase tracking-wider shrink-0">{category}</span>
            <span className="text-base font-bold text-gray-900">
              {currentIdx + 1}<span className="text-gray-500 font-normal">/{questions.length}</span>
            </span>
          </div>

          {/* Center: answered count */}
          <div className="text-sm text-gray-600 hidden sm:block">
            {answeredCount}/{questions.length} answered
          </div>

          {/* Right: timer */}
          <div className={`text-base font-mono font-bold tabular-nums shrink-0 ${timeLeft < 300 ? 'text-red-600' : 'text-gray-700'}`}>
            {formatTime(timeLeft)}
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-gray-100 rounded-full mt-2 -mb-0.5">
          <div
            className="h-full bg-blue-800 rounded-full transition-all duration-300"
            style={{ width: `${(answeredCount / questions.length) * 100}%` }}
          />
        </div>
      </header>

      {/* ═══ SECTION INDICATOR (Universal only — single line) ═══ */}
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
          <div className="flex items-start justify-between gap-2 mb-4 sm:mb-6">
            <p className="text-lg sm:text-xl font-semibold text-gray-900 leading-relaxed break-words">{q.question}</p>
            <ReportButton questionId={q.id} />
          </div>

          <div className="space-y-2.5 sm:space-y-3">
            {q.options.map((opt, i) => {
              const letter = ['A', 'B', 'C', 'D'][i]
              const selected = answers[q.id] === opt
              return (
                <button
                  key={i}
                  onClick={() => {
                    setAnswers(prev => ({ ...prev, [q.id]: opt }))
                    // Blur immediately so mobile browser doesn't scroll to focused button
                    ;(document.activeElement as HTMLElement)?.blur()
                    scrollToTop()
                  }}
                  className={`w-full text-left px-5 py-4 min-h-[56px] rounded-xl border-2 transition-all flex gap-3 items-start text-base
                    ${selected
                      ? 'border-blue-800 bg-blue-50 text-blue-900'
                      : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/50 text-gray-800'
                    }`}
                >
                  <span className={`font-bold text-base mt-0.5 shrink-0 ${selected ? 'text-blue-800' : 'text-gray-500'}`}>{letter}.</span>
                  <span>{opt}</span>
                </button>
              )
            })}
          </div>
        </div>
      </main>

      {/* ═══ FOOTER: Compact — just nav buttons + progress ═══ */}
      <footer className="bg-white border-t px-3 sm:px-6 py-2.5 shrink-0" style={{ paddingBottom: 'max(10px, env(safe-area-inset-bottom))' }}>
        <div className="flex justify-between items-center gap-3 max-w-2xl mx-auto">
          <button
            onClick={() => setCurrentIdx(i => Math.max(0, i - 1))}
            disabled={currentIdx === 0}
            className="px-4 py-2.5 min-h-[48px] min-w-[72px] border border-gray-300 rounded-xl text-gray-700 disabled:opacity-30 hover:bg-gray-50 text-base font-medium"
          >
            ← Prev
          </button>

          {/* Center: progress info */}
          <div className="flex-1 text-center min-w-0">
            <p className="text-sm font-bold text-gray-800">{answeredCount}/{questions.length} answered</p>
            {/* Mini progress bar */}
            <div className="h-1.5 bg-gray-200 rounded-full mt-1 mx-auto max-w-[200px]">
              <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${(answeredCount / questions.length) * 100}%` }} />
            </div>
          </div>

          {currentIdx < questions.length - 1 ? (
            <button
              onClick={() => setCurrentIdx(i => i + 1)}
              className="px-4 py-2.5 min-h-[48px] min-w-[72px] bg-blue-800 text-white rounded-xl hover:bg-blue-900 text-base font-medium"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
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

