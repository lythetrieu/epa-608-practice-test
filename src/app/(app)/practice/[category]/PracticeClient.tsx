'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { getOfflineQuestions, isOffline as checkOffline } from '@/lib/offline'
import { Bot, BookOpen, Target, ArrowRight } from 'lucide-react'

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
  subtopic_id: string | null
  question: string
  options: string[]
  answer_text: string
  explanation: string
  difficulty: string
}

type WrongAnswer = {
  id: string
  question: string
  userAnswer: string
  correctAnswer: string
  explanation: string
  subtopicPrefix: string
}

type Phase = 'loading' | 'active' | 'done' | 'error'

const SLUG_MAP: Record<string, string> = {
  'Core': 'core', 'Type I': 'type-1', 'Type II': 'type-2',
  'Type III': 'type-3', 'Universal': 'universal',
}

// localStorage helpers for weak topic tracking
function getWeakTopics(): string[] {
  try {
    return JSON.parse(localStorage.getItem('epa608WeakTopics') || '[]')
  } catch { return [] }
}

function saveWeakTopics(topics: string[]) {
  localStorage.setItem('epa608WeakTopics', JSON.stringify(topics))
}

export function PracticeClient({ category }: { category: string }) {
  const [phase, setPhase] = useState<Phase>('loading')
  const [questions, setQuestions] = useState<PracticeQuestion[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [locked, setLocked] = useState(false)
  const [correctCount, setCorrectCount] = useState(0)
  const [answeredCount, setAnsweredCount] = useState(0)
  const [wrongAnswers, setWrongAnswers] = useState<WrongAnswer[]>([])
  const [errorMsg, setErrorMsg] = useState('')
  const [offlineMode, setOfflineMode] = useState(false)
  const [showReview, setShowReview] = useState(false)

  // Load questions with weak topic weighting
  useEffect(() => {
    const count = category === 'Universal' ? 100 : 25

    if (checkOffline()) {
      const cached = getOfflineQuestions(category, count)
      if (cached && cached.length > 0) {
        setQuestions(cached)
        setOfflineMode(true)
        setPhase('active')
      } else {
        setErrorMsg('You are offline and no cached questions are available.')
        setPhase('error')
      }
      return
    }

    const weakTopics = getWeakTopics()

    fetch('/api/practice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, count, weakTopics: weakTopics.length > 0 ? weakTopics : undefined }),
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
        const cached = getOfflineQuestions(category, count)
        if (cached && cached.length > 0) {
          setQuestions(cached)
          setOfflineMode(true)
          setPhase('active')
        } else {
          setErrorMsg('Failed to load questions.')
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
    } else {
      // Track wrong answer
      setWrongAnswers(prev => [...prev, {
        id: q.id,
        question: q.question,
        userAnswer: option,
        correctAnswer: q.answer_text,
        explanation: q.explanation,
        subtopicPrefix: (q.subtopic_id || 'general').replace(/-\d+(\.\d+)?$/, ''),
      }])
    }
  }, [locked, q])

  const handleNext = useCallback(() => {
    if (currentIdx >= questions.length - 1) {
      // Save weak topics from wrong answers for next session
      const weakPrefixes = [...new Set(wrongAnswers.map(w => w.subtopicPrefix))]
      if (weakPrefixes.length > 0) saveWeakTopics(weakPrefixes)

      // Save to user_progress (fire and forget)
      questions.forEach(qu => {
        const wasCorrect = !wrongAnswers.find(w => w.id === qu.id)
        fetch('/api/practice/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ questionId: qu.id, correct: wasCorrect }),
        }).catch(() => {})
      })

      setPhase('done')
      return
    }
    setCurrentIdx(prev => prev + 1)
    setSelectedAnswer(null)
    setLocked(false)
  }, [currentIdx, questions, wrongAnswers])

  // Keyboard shortcuts
  useEffect(() => {
    if (phase !== 'active') return
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return
      if (['1','2','3','4'].includes(e.key) && !locked) {
        const idx = parseInt(e.key) - 1
        if (q?.options[idx]) handleSelect(q.options[idx])
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
        <p className="text-gray-600">Loading {category} practice...</p>
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

  // Done / Summary + Review
  if (phase === 'done') {
    const percentage = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0
    const passed = percentage >= 70

    // Compute weak areas from wrong answers
    const weakMap: Record<string, { count: number; total: number }> = {}
    questions.forEach(qu => {
      const prefix = (qu.subtopic_id || 'general').replace(/-\d+(\.\d+)?$/, '')
      if (!weakMap[prefix]) weakMap[prefix] = { count: 0, total: 0 }
      weakMap[prefix].total++
    })
    wrongAnswers.forEach(w => {
      if (weakMap[w.subtopicPrefix]) weakMap[w.subtopicPrefix].count++
    })
    const weakAreas = Object.entries(weakMap)
      .filter(([, v]) => v.count > 0)
      .map(([prefix, v]) => ({
        prefix,
        label: prefix.replace('core-', '').replace('t1-', '').replace('t2-', '').replace('t3-', '').replace(/-/g, ' '),
        errors: v.count,
        total: v.total,
        errorRate: Math.round((v.count / v.total) * 100),
      }))
      .sort((a, b) => b.errorRate - a.errorRate)

    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-lg mx-auto">
          {/* Score card */}
          <div className={`rounded-2xl p-8 text-center mb-6 ${passed ? 'bg-green-600' : 'bg-red-500'} text-white`}>
            <p className="text-xs uppercase tracking-wide text-white/70 mb-2">Practice Complete</p>
            <div className="text-6xl font-bold mb-2">{percentage}%</div>
            <div className="text-xl font-semibold mb-1">{passed ? 'Great job!' : 'Keep practicing!'}</div>
            <div className="text-white/80">{correctCount} / {answeredCount} correct</div>
          </div>

          {/* Weak areas breakdown */}
          {weakAreas.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <Target size={16} className="text-red-500" />
                <span className="text-sm font-bold text-gray-800">Weak Areas</span>
              </div>
              <div className="space-y-2">
                {weakAreas.slice(0, 5).map(w => (
                  <div key={w.prefix} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 capitalize">{w.label}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      w.errorRate >= 50 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                    }`}>
                      {w.errors}/{w.total} wrong ({w.errorRate}%)
                    </span>
                  </div>
                ))}
              </div>
              {/* Study suggestion */}
              {weakAreas[0] && (
                <Link href="/learn" className="mt-3 flex items-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-800 rounded-xl text-sm font-medium hover:bg-blue-100">
                  <BookOpen size={16} />
                  Study weakest topic: <span className="capitalize font-bold">{weakAreas[0].label}</span>
                  <ArrowRight size={14} className="ml-auto" />
                </Link>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 mb-4">
            <button
              onClick={() => window.location.href = `/test/${slug}?mode=practice`}
              className="flex-1 text-center px-5 py-3 min-h-[48px] bg-blue-800 text-white rounded-xl font-semibold hover:bg-blue-900"
            >
              Practice Again
            </button>
            <Link href={`/test/${slug}?mode=test`}
              className="flex-1 text-center px-5 py-3 min-h-[48px] border-2 border-blue-800 text-blue-800 rounded-xl font-semibold hover:bg-blue-50 flex items-center justify-center"
            >
              Timed Test
            </Link>
          </div>

          {/* Review wrong answers */}
          {wrongAnswers.length > 0 && (
            <div className="mb-4">
              <button
                onClick={() => setShowReview(!showReview)}
                className="w-full text-left px-4 py-3 bg-white rounded-xl border border-gray-200 flex items-center justify-between hover:bg-gray-50"
              >
                <span className="text-sm font-bold text-gray-800">
                  Review {wrongAnswers.length} Wrong Answer{wrongAnswers.length > 1 ? 's' : ''}
                </span>
                <span className="text-gray-400 text-lg">{showReview ? '−' : '+'}</span>
              </button>

              {showReview && (
                <div className="mt-2 space-y-3">
                  {wrongAnswers.map((w, i) => (
                    <div key={w.id} className="bg-white rounded-xl border border-red-200 p-4">
                      <p className="text-sm font-semibold text-gray-900 mb-2">Q{i + 1}: {w.question}</p>
                      <p className="text-sm text-red-600 mb-1">
                        Your answer: <span className="font-medium">{w.userAnswer}</span>
                      </p>
                      <p className="text-sm text-green-700 mb-2">
                        Correct: <span className="font-medium">{w.correctAnswer}</span>
                      </p>
                      {w.explanation && (
                        <p className="text-xs text-gray-600 bg-gray-50 rounded-lg p-3">{w.explanation}</p>
                      )}
                      <ELI5Button questionText={w.question} correctAnswer={w.correctAnswer} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <Link href="/dashboard" className="block text-center text-sm text-gray-500 hover:text-gray-700">
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
            <span className="text-xs bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full font-medium">Offline</span>
          )}
          <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-medium">No timer</span>
        </div>
      </header>

      {/* Progress bar */}
      <div className="h-1 bg-gray-200">
        <div className="h-full bg-blue-800 transition-all duration-300" style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }} />
      </div>

      {/* Question */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="w-full max-w-2xl mx-auto">
          <p className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6 leading-relaxed">{q.question}</p>

          <div className="space-y-2 sm:space-y-3">
            {q.options.map((opt, i) => {
              const letter = ['A', 'B', 'C', 'D'][i]
              const isSelected = selectedAnswer === opt
              const isCorrectOption = opt === q.answer_text

              let btnClass = 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/50 text-gray-800'
              if (locked) {
                if (isCorrectOption) btnClass = 'border-green-500 bg-green-50 text-green-900'
                else if (isSelected && !isCorrectOption) btnClass = 'border-red-500 bg-red-50 text-red-900'
                else btnClass = 'border-gray-200 bg-gray-50 text-gray-400'
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
                    locked ? 'text-gray-300' : 'text-gray-400'
                  }`}>{letter}.</span>
                  <span>{opt}</span>
                  {locked && isCorrectOption && <span className="ml-auto text-green-600 font-bold shrink-0">✓</span>}
                  {locked && isSelected && !isCorrectOption && <span className="ml-auto text-red-500 font-bold shrink-0">✗</span>}
                </button>
              )
            })}
          </div>

          {/* Explanation card */}
          {locked && (
            <div className={`mt-4 sm:mt-6 rounded-xl border-2 p-4 sm:p-5 ${isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-lg ${isCorrect ? 'text-green-600' : 'text-red-500'}`}>{isCorrect ? '✓' : '✗'}</span>
                <span className={`font-semibold ${isCorrect ? 'text-green-800' : 'text-red-800'}`}>{isCorrect ? 'Correct!' : 'Incorrect'}</span>
              </div>
              {!isCorrect && (
                <p className="text-sm text-red-700 mb-2">
                  Correct answer: <span className="font-semibold">{q.answer_text}</span>
                </p>
              )}
              {q.explanation && <p className="text-sm text-gray-700 leading-relaxed">{q.explanation}</p>}
              {!isCorrect && <ELI5Button questionText={q.question} correctAnswer={q.answer_text} />}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t px-3 sm:px-6 py-2.5 shrink-0" style={{ paddingBottom: 'max(10px, env(safe-area-inset-bottom))' }}>
        <div className="flex justify-between items-center gap-3 max-w-2xl mx-auto">
          <span className="text-sm font-bold text-gray-700 min-w-[60px]">{currentIdx + 1}/{questions.length}</span>
          <div className="flex-1 h-1.5 bg-gray-200 rounded-full max-w-[200px]">
            <div className="h-full bg-blue-800 rounded-full transition-all" style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }} />
          </div>
          {locked ? (
            <button onClick={handleNext}
              className="px-5 py-2.5 min-h-[48px] bg-blue-800 text-white rounded-xl hover:bg-blue-900 font-semibold text-base">
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
