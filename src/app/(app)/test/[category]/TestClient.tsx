'use client'
import { useState, useEffect, useCallback } from 'react'
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
  }, [category])

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

  // Keyboard shortcuts: Enter/→ = next, ← = prev, 1-4 = select answer
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

  const formatTime = (s: number) => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`
  const q = questions[currentIdx]

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

  if (result) return <ResultView result={result} category={category} questions={questions} />

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b px-4 sm:px-6 py-3 flex items-center justify-between">
        <div>
          <span className="text-xs sm:text-sm text-gray-500">EPA 608 — {category}</span>
          <div className="text-xs sm:text-sm font-semibold text-gray-800 mt-0.5">
            Question {currentIdx + 1} / {questions.length}
          </div>
        </div>
        <div className={`text-base sm:text-lg font-mono font-bold ${timeLeft < 300 ? 'text-red-600' : 'text-gray-700'}`}>
          {formatTime(timeLeft)}
        </div>
      </header>

      {/* Progress bar */}
      <div className="h-1 bg-gray-200">
        <div
          className="h-full bg-blue-800 transition-all duration-300"
          style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* Question — scrollable area, top-aligned to prevent layout jump */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="w-full max-w-2xl mx-auto">
          <div className="flex items-start justify-between gap-2 mb-4 sm:mb-6">
            <p className="text-base sm:text-lg font-semibold text-gray-900 leading-relaxed">{q.question}</p>
            <ReportButton questionId={q.id} />
          </div>

          <div className="space-y-2 sm:space-y-3">
            {q.options.map((opt, i) => {
              const letter = ['A', 'B', 'C', 'D'][i]
              const selected = answers[q.id] === opt
              return (
                <button
                  key={i}
                  onClick={() => setAnswers(prev => ({ ...prev, [q.id]: opt }))}
                  className={`w-full text-left px-3 sm:px-5 py-3 sm:py-4 rounded-xl border-2 transition-all flex gap-2 sm:gap-3 items-start text-sm sm:text-base
                    ${selected
                      ? 'border-blue-800 bg-blue-50 text-blue-900'
                      : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/50 text-gray-800'
                    }`}
                >
                  <span className={`font-bold text-sm mt-0.5 shrink-0 ${selected ? 'text-blue-800' : 'text-gray-400'}`}>{letter}.</span>
                  <span>{opt}</span>
                </button>
              )
            })}
          </div>
        </div>
      </main>

      {/* Navigation — fixed bottom */}
      <footer className="bg-white border-t px-3 sm:px-6 py-3 sm:py-4">
        {/* Question numbers — scrollable on mobile, hidden on very small screens */}
        <div className="overflow-x-auto pb-2 mb-2 hidden sm:block">
          <div className="flex gap-1.5 justify-center min-w-min">
            {questions.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIdx(i)}
                className={`w-7 h-7 rounded text-xs font-medium shrink-0 ${
                  i === currentIdx ? 'bg-blue-800 text-white' :
                  answers[questions[i].id] ? 'bg-green-100 text-green-700' :
                  'bg-gray-100 text-gray-500'}`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>

        {/* Nav buttons */}
        <div className="flex justify-between items-center gap-2">
          <button
            onClick={() => setCurrentIdx(i => Math.max(0, i - 1))}
            disabled={currentIdx === 0}
            className="px-3 sm:px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 disabled:opacity-30 hover:bg-gray-50 text-sm sm:text-base"
          >
            ← Prev
          </button>

          {/* Mobile: show question counter */}
          <span className="text-xs text-gray-400 sm:hidden">
            {Object.keys(answers).length}/{questions.length} answered
          </span>

          {currentIdx < questions.length - 1 ? (
            <button
              onClick={() => setCurrentIdx(i => i + 1)}
              className="px-3 sm:px-5 py-2.5 bg-blue-800 text-white rounded-lg hover:bg-blue-900 text-sm sm:text-base"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-3 sm:px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
            >
              {submitting ? 'Submitting...' : 'Submit'}
            </button>
          )}
        </div>
      </footer>
    </div>
  )
}
