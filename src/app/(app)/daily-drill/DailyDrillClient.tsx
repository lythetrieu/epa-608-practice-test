'use client'

import { useState, useEffect, useCallback } from 'react'
import type { QuestionPublic } from '@/types'

type DrillResult = {
  score: number
  total: number
  percentage: number
  results: {
    questionId: string
    correct: boolean
    correctAnswer: string
    userAnswer: string | null
  }[]
}

type Phase = 'loading' | 'active' | 'completed-today' | 'results' | 'error'

const DRILL_STORAGE_KEY = 'epa608-daily-drill'

function getTodayKey() {
  return new Date().toISOString().split('T')[0]
}

function getSavedDrill(): { date: string; score: number; total: number } | null {
  try {
    const saved = localStorage.getItem(DRILL_STORAGE_KEY)
    if (saved) return JSON.parse(saved)
  } catch {}
  return null
}

export default function DailyDrillClient() {
  const [phase, setPhase] = useState<Phase>('loading')
  const [questions, setQuestions] = useState<QuestionPublic[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [currentIdx, setCurrentIdx] = useState(0)
  const [result, setResult] = useState<DrillResult | null>(null)
  const [savedScore, setSavedScore] = useState<{ score: number; total: number } | null>(null)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    // Check if drill already completed today
    const saved = getSavedDrill()
    if (saved && saved.date === getTodayKey()) {
      setSavedScore({ score: saved.score, total: saved.total })
      setPhase('completed-today')
      return
    }

    // Load drill questions
    fetch('/api/daily-drill')
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          setError(data.error)
          setPhase('error')
          return
        }
        setQuestions(data.questions)
        setPhase('active')
      })
      .catch(() => {
        setError('Failed to load daily drill.')
        setPhase('error')
      })
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    if (phase !== 'active') return
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return
      const q = questions[currentIdx]
      if (!q) return
      if (e.key === 'Enter' || e.key === 'ArrowRight') {
        e.preventDefault()
        if (answers[q.id] && currentIdx < questions.length - 1) {
          setCurrentIdx(i => i + 1)
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        if (currentIdx > 0) setCurrentIdx(i => i - 1)
      } else if (['1', '2', '3', '4'].includes(e.key)) {
        const idx = parseInt(e.key) - 1
        if (q.options[idx]) {
          setAnswers(prev => ({ ...prev, [q.id]: q.options[idx] }))
        }
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [phase, currentIdx, questions, answers])

  const handleSubmit = useCallback(async () => {
    if (submitting || phase !== 'active') return
    setSubmitting(true)

    try {
      const res = await fetch('/api/daily-drill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to submit drill.')
        setPhase('error')
        return
      }

      setResult(data)
      setPhase('results')

      // Save completion to localStorage
      try {
        localStorage.setItem(DRILL_STORAGE_KEY, JSON.stringify({
          date: getTodayKey(),
          score: data.score,
          total: data.total,
        }))
      } catch {}
    } catch {
      setError('Failed to submit drill.')
      setPhase('error')
    } finally {
      setSubmitting(false)
    }
  }, [answers, submitting, phase])

  const q = questions[currentIdx]

  // Loading
  if (phase === 'loading') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-800 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading today&apos;s drill...</p>
        </div>
      </div>
    )
  }

  // Error
  if (phase === 'error') {
    return (
      <div className="max-w-lg mx-auto p-8 text-center">
        <div className="bg-red-50 border border-red-200 rounded-xl p-8">
          <p className="text-red-700 font-semibold text-lg mb-2">Could not load drill</p>
          <p className="text-red-600 mb-6">{error}</p>
          <a href="/dashboard" className="px-6 py-2 bg-blue-800 text-white rounded-lg">
            Back to Dashboard
          </a>
        </div>
      </div>
    )
  }

  // Already completed today
  if (phase === 'completed-today' && savedScore) {
    const pct = Math.round((savedScore.score / savedScore.total) * 100)
    return (
      <div className="max-w-lg mx-auto p-4 sm:p-8">
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Drill Completed!</h1>
          <p className="text-gray-500 mb-6">You scored {savedScore.score}/{savedScore.total} ({pct}%) today.</p>
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <p className="text-blue-800 font-medium">Come back tomorrow for your next drill.</p>
            <p className="text-blue-600 text-sm mt-1">Each day targets your weakest areas for maximum improvement.</p>
          </div>
          <a href="/dashboard" className="px-6 py-2.5 bg-blue-800 text-white rounded-lg font-semibold hover:bg-blue-900 transition-colors inline-block">
            Back to Dashboard
          </a>
        </div>
      </div>
    )
  }

  // Results after completing drill
  if (phase === 'results' && result) {
    const pct = Math.round(result.percentage)
    return (
      <div className="max-w-2xl mx-auto p-4 sm:p-8">
        <div className="bg-white rounded-xl border border-gray-200 p-6 sm:p-8 text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Daily Drill Complete</h1>
          <div className={`text-5xl font-bold mb-2 ${pct >= 70 ? 'text-green-600' : 'text-red-600'}`}>
            {pct}%
          </div>
          <p className="text-gray-500">
            {result.score}/{result.total} correct
          </p>
          <div className="bg-blue-50 rounded-lg p-4 mt-6">
            <p className="text-blue-800 font-medium">Come back tomorrow for your next drill.</p>
          </div>
        </div>

        {/* Question review */}
        <div className="space-y-3">
          {result.results.map((r, _i) => {
            const question = questions.find(q => q.id === r.questionId)
            return (
              <div
                key={r.questionId}
                className={`bg-white rounded-xl border p-4 ${
                  r.correct ? 'border-green-200' : 'border-red-200'
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className={`text-sm font-bold mt-0.5 ${r.correct ? 'text-green-600' : 'text-red-600'}`}>
                    {r.correct ? 'Correct' : 'Wrong'}
                  </span>
                </div>
                <p className="text-sm text-gray-800 font-medium mt-1">{question?.question}</p>
                {!r.correct && (
                  <div className="mt-2 text-sm">
                    <p className="text-red-600">Your answer: {r.userAnswer || 'Skipped'}</p>
                    <p className="text-green-600">Correct answer: {r.correctAnswer}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="mt-6 text-center">
          <a href="/dashboard" className="px-6 py-2.5 bg-blue-800 text-white rounded-lg font-semibold hover:bg-blue-900 transition-colors inline-block">
            Back to Dashboard
          </a>
        </div>
      </div>
    )
  }

  // Active drill
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b px-4 sm:px-6 py-3 flex items-center justify-between">
        <div>
          <span className="text-xs sm:text-sm text-gray-500">Daily Weak-Spot Drill</span>
          <div className="text-xs sm:text-sm font-semibold text-gray-800 mt-0.5">
            Question {currentIdx + 1} / {questions.length}
          </div>
        </div>
        <span className="text-xs text-gray-400 bg-amber-50 text-amber-700 px-2 py-1 rounded-full font-medium">
          10 Questions
        </span>
      </header>

      {/* Progress bar */}
      <div className="h-1 bg-gray-200">
        <div
          className="h-full bg-blue-800 transition-all duration-300"
          style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* Question */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="w-full max-w-2xl mx-auto">
          <p className="text-base sm:text-lg font-semibold text-gray-900 leading-relaxed mb-4 sm:mb-6">
            {q?.question}
          </p>

          <div className="space-y-2 sm:space-y-3">
            {q?.options.map((opt, i) => {
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
                  <span className={`font-bold text-sm mt-0.5 shrink-0 ${selected ? 'text-blue-800' : 'text-gray-400'}`}>
                    {letter}.
                  </span>
                  <span>{opt}</span>
                </button>
              )
            })}
          </div>
        </div>
      </main>

      {/* Navigation */}
      <footer className="bg-white border-t px-3 sm:px-6 py-3 sm:py-4">
        {/* Question pills */}
        <div className="overflow-x-auto pb-2 mb-2">
          <div className="flex gap-1.5 justify-center min-w-min">
            {questions.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIdx(i)}
                className={`w-7 h-7 rounded text-xs font-medium shrink-0 ${
                  i === currentIdx ? 'bg-blue-800 text-white'
                  : answers[questions[i]?.id] ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-500'
                }`}
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
            Prev
          </button>

          <span className="text-xs text-gray-400">
            {Object.keys(answers).length}/{questions.length} answered
          </span>

          {currentIdx < questions.length - 1 ? (
            <button
              onClick={() => setCurrentIdx(i => i + 1)}
              className="px-3 sm:px-5 py-2.5 bg-blue-800 text-white rounded-lg hover:bg-blue-900 text-sm sm:text-base"
            >
              Next
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
