'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { getOfflineQuestions, isOffline as checkOffline } from '@/lib/offline'
import { Bot } from 'lucide-react'

function ELI5Button({ questionText, correctAnswer }: { questionText: string; correctAnswer: string }) {
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
      })
      const data = await res.json()
      if (!res.ok) { setState('error'); return }
      setExplanation(data.explanation)
      setState('done')
    } catch { setState('error') }
  }

  if (state === 'done') {
    return (
      <div className="mt-3 bg-purple-50 border border-purple-200 rounded-xl p-4">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Bot size={14} className="text-purple-600" />
          <span className="font-semibold text-purple-700 text-xs uppercase tracking-wide">Simple Explanation</span>
        </div>
        <p className="text-sm text-purple-900 leading-relaxed">{explanation}</p>
      </div>
    )
  }

  return (
    <button onClick={handleClick} disabled={state === 'loading'}
      className="mt-3 inline-flex items-center gap-2 text-sm px-4 py-2.5 min-h-[44px] rounded-xl bg-purple-100 text-purple-700 hover:bg-purple-200 disabled:opacity-50 font-medium">
      {state === 'loading' ? (
        <><span className="w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" /> Explaining...</>
      ) : (
        <><Bot size={16} /> Explain Simply</>
      )}
    </button>
  )
}

type PracticeQuestion = {
  id: string
  category: string
  question: string
  options: string[]
  answer_text: string
  explanation: string
  difficulty: string
}

type Phase = 'loading' | 'active' | 'done' | 'error'

const SLUG_MAP: Record<string, string> = {
  'Core': 'core', 'Type I': 'type-1', 'Type II': 'type-2',
  'Type III': 'type-3', 'Universal': 'universal',
}

export function PracticeClient({ category }: { category: string }) {
  const [phase, setPhase] = useState<Phase>('loading')
  const [questions, setQuestions] = useState<PracticeQuestion[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [locked, setLocked] = useState(false)
  const [correctCount, setCorrectCount] = useState(0)
  const [answeredCount, setAnsweredCount] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')
  const [offlineMode, setOfflineMode] = useState(false)

  // Load questions — try network first, fall back to offline cache
  useEffect(() => {
    const count = category === 'Universal' ? 100 : 25

    // If offline, go straight to cached data
    if (checkOffline()) {
      const cached = getOfflineQuestions(category, count)
      if (cached && cached.length > 0) {
        setQuestions(cached)
        setOfflineMode(true)
        setPhase('active')
      } else {
        setErrorMsg('You are offline and no cached questions are available. Go online and sync questions from the dashboard first.')
        setPhase('error')
      }
      return
    }

    fetch('/api/practice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, count }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          setErrorMsg(data.upgradeRequired ? 'Upgrade to access this category.' : data.error)
          setPhase('error')
          return
        }
        setQuestions(data.questions)
        setPhase('active')
      })
      .catch(() => {
        // Network failed — try offline cache
        const cached = getOfflineQuestions(category, count)
        if (cached && cached.length > 0) {
          setQuestions(cached)
          setOfflineMode(true)
          setPhase('active')
        } else {
          setErrorMsg('Failed to load questions and no offline data available.')
          setPhase('error')
        }
      })
  }, [category])

  const q = questions[currentIdx]
  const isCorrect = selectedAnswer === q?.answer_text

  const handleSelect = useCallback((option: string) => {
    if (locked) return
    setSelectedAnswer(option)
    setLocked(true)
    setAnsweredCount(prev => prev + 1)
    if (option === q?.answer_text) {
      setCorrectCount(prev => prev + 1)
    }
  }, [locked, q])

  const handleNext = useCallback(() => {
    if (currentIdx >= questions.length - 1) {
      setPhase('done')
      return
    }
    setCurrentIdx(prev => prev + 1)
    setSelectedAnswer(null)
    setLocked(false)
  }, [currentIdx, questions.length])

  // Keyboard shortcuts
  useEffect(() => {
    if (phase !== 'active') return
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return

      if (['1','2','3','4'].includes(e.key) && !locked) {
        const idx = parseInt(e.key) - 1
        if (q?.options[idx]) {
          handleSelect(q.options[idx])
        }
      } else if ((e.key === 'Enter' || e.key === 'ArrowRight') && locked) {
        e.preventDefault()
        handleNext()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [phase, locked, q, handleSelect, handleNext])

  const slug = SLUG_MAP[category] ?? category.toLowerCase()

  // Loading
  if (phase === 'loading') return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-800 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Loading {category} practice questions...</p>
      </div>
    </div>
  )

  // Error
  if (phase === 'error') return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="bg-red-50 border border-red-200 rounded-xl p-8 max-w-md text-center">
        <p className="text-red-700 font-semibold text-lg mb-2">Could not start practice</p>
        <p className="text-red-600 mb-6">{errorMsg}</p>
        <a href="/dashboard" className="px-6 py-2 bg-blue-800 text-white rounded-lg">Back to Dashboard</a>
      </div>
    </div>
  )

  // Done / Summary
  if (phase === 'done') {
    const percentage = Math.round((correctCount / answeredCount) * 100)
    const passed = percentage >= 70
    return (
      <div className="min-h-screen bg-gray-50 py-10 px-4">
        <div className="max-w-lg mx-auto">
          <div className={`rounded-2xl p-8 text-center mb-8 ${passed ? 'bg-green-600' : 'bg-red-500'} text-white`}>
            <p className="text-xs uppercase tracking-wide text-white/70 mb-2">Practice Complete</p>
            <div className="text-6xl font-bold mb-2">{percentage}%</div>
            <div className="text-2xl font-semibold mb-1">{passed ? 'Great job!' : 'Keep practicing!'}</div>
            <div className="text-white/80">{correctCount} / {answeredCount} correct</div>
          </div>

          <div className="flex gap-3 mb-6">
            <button
              onClick={() => window.location.href = `/practice/${slug}`}
              className="flex-1 text-center px-5 py-3 bg-blue-800 text-white rounded-xl font-semibold hover:bg-blue-900"
            >
              Practice Again
            </button>
            <Link href={`/test/${slug}`}
              className="flex-1 text-center px-5 py-3 border-2 border-blue-800 text-blue-800 rounded-xl font-semibold hover:bg-blue-50"
            >
              Take Timed Test
            </Link>
          </div>
          <Link href="/dashboard"
            className="block text-center text-sm text-gray-500 hover:text-gray-700"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  // Active practice
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b px-4 sm:px-6 py-3 flex items-center justify-between">
        <div>
          <span className="text-xs sm:text-sm text-gray-500">Practice — {category}</span>
          <div className="text-xs sm:text-sm font-semibold text-gray-800 mt-0.5">
            Question {currentIdx + 1} / {questions.length}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-600">
            {correctCount}/{answeredCount} correct
          </span>
          {offlineMode && (
            <span className="text-xs bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full font-medium">
              Offline
            </span>
          )}
          <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-medium">
            No timer
          </span>
        </div>
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
          <p className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6 leading-relaxed">
            {q.question}
          </p>

          <div className="space-y-2 sm:space-y-3">
            {q.options.map((opt, i) => {
              const letter = ['A', 'B', 'C', 'D'][i]
              const isSelected = selectedAnswer === opt
              const isCorrectOption = opt === q.answer_text

              let btnClass = 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/50 text-gray-800'

              if (locked) {
                if (isCorrectOption) {
                  btnClass = 'border-green-500 bg-green-50 text-green-900'
                } else if (isSelected && !isCorrectOption) {
                  btnClass = 'border-red-500 bg-red-50 text-red-900'
                } else {
                  btnClass = 'border-gray-200 bg-gray-50 text-gray-400'
                }
              } else if (isSelected) {
                btnClass = 'border-blue-800 bg-blue-50 text-blue-900'
              }

              return (
                <button
                  key={i}
                  onClick={() => handleSelect(opt)}
                  disabled={locked}
                  className={`w-full text-left px-5 py-4 min-h-[56px] rounded-xl border-2 transition-all flex gap-3 items-start text-base ${btnClass} ${locked ? 'cursor-default' : 'cursor-pointer'}`}
                >
                  <span className={`font-bold text-sm mt-0.5 shrink-0 ${
                    locked && isCorrectOption ? 'text-green-600' :
                    locked && isSelected && !isCorrectOption ? 'text-red-500' :
                    locked ? 'text-gray-300' :
                    'text-gray-400'
                  }`}>
                    {letter}.
                  </span>
                  <span>{opt}</span>
                  {locked && isCorrectOption && (
                    <span className="ml-auto text-green-600 font-bold shrink-0">✓</span>
                  )}
                  {locked && isSelected && !isCorrectOption && (
                    <span className="ml-auto text-red-500 font-bold shrink-0">✗</span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Explanation card */}
          {locked && (
            <div className={`mt-4 sm:mt-6 rounded-xl border-2 p-4 sm:p-5 ${
              isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-lg ${isCorrect ? 'text-green-600' : 'text-red-500'}`}>
                  {isCorrect ? '✓' : '✗'}
                </span>
                <span className={`font-semibold ${isCorrect ? 'text-green-800' : 'text-red-800'}`}>
                  {isCorrect ? 'Correct!' : 'Incorrect'}
                </span>
              </div>
              {!isCorrect && (
                <p className="text-sm text-red-700 mb-2">
                  The correct answer is: <span className="font-semibold">{q.answer_text}</span>
                </p>
              )}
              {q.explanation && (
                <p className="text-sm text-gray-700 leading-relaxed">{q.explanation}</p>
              )}
              {!isCorrect && <ELI5Button questionText={q.question} correctAnswer={q.answer_text} />}
            </div>
          )}
        </div>
      </main>

      {/* Footer — compact */}
      <footer className="bg-white border-t px-3 sm:px-6 py-2.5 shrink-0" style={{ paddingBottom: 'max(10px, env(safe-area-inset-bottom))' }}>
        <div className="flex justify-between items-center gap-3 max-w-2xl mx-auto">
          <span className="text-sm font-bold text-gray-700 min-w-[60px]">
            {currentIdx + 1}/{questions.length}
          </span>

          {/* Mini progress bar */}
          <div className="flex-1 h-1.5 bg-gray-200 rounded-full max-w-[200px]">
            <div className="h-full bg-blue-800 rounded-full transition-all" style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }} />
          </div>

          {locked ? (
            <button
              onClick={handleNext}
              className="px-5 py-2.5 min-h-[48px] bg-blue-800 text-white rounded-xl hover:bg-blue-900 font-semibold text-base"
            >
              {currentIdx < questions.length - 1 ? 'Next →' : 'Results'}
            </button>
          ) : (
            <span className="text-sm text-gray-500 min-w-[72px] text-right">Select answer</span>
          )}
        </div>
      </footer>
    </div>
  )
}
