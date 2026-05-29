'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import type { Tier } from '@/types'

type FlashcardQuestion = {
  id: string
  category: string
  question: string
  options: string[]
  answer_text: string
  explanation: string
  difficulty: string
}

type Phase = 'select' | 'loading' | 'active' | 'done' | 'error'

const CATEGORIES = [
  { value: 'Core', label: 'Core', icon: '📝', slug: 'core' },
  { value: 'Type I', label: 'Type I', icon: '❄️', slug: 'type-1' },
  { value: 'Type II', label: 'Type II', icon: '🔧', slug: 'type-2' },
  { value: 'Type III', label: 'Type III', icon: '🏭', slug: 'type-3' },
  { value: 'Universal', label: 'Universal', icon: '🎯', slug: 'universal' },
]

const TIER_CATEGORIES: Record<Tier, string[]> = {
  free: ['Core'],
  starter: ['Core', 'Type I', 'Type II', 'Type III', 'Universal'],
  ultimate: ['Core', 'Type I', 'Type II', 'Type III', 'Universal'],
  pro: ['Core', 'Type I', 'Type II', 'Type III', 'Universal'],
}

const OPTION_LABELS = ['A', 'B', 'C', 'D']

export default function FlashcardClient({ tier }: { tier: Tier }) {
  const [phase, setPhase] = useState<Phase>('select')
  const [cards, setCards] = useState<FlashcardQuestion[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [correct, setCorrect] = useState(0)
  const [wrong, setWrong] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')

  // Swipe state
  const [dragDelta, setDragDelta] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [flyOff, setFlyOff] = useState<'left' | 'right' | null>(null)
  const dragStartX = useRef(0)
  const cardRef = useRef<HTMLDivElement>(null)

  const accessible = TIER_CATEGORIES[tier]

  // Whether an answer has been selected (card is in "revealed" state)
  const answered = selectedOption !== null

  const loadCards = useCallback((category: string) => {
    setPhase('loading')
    fetch('/api/practice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, count: 25 }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          setErrorMsg(data.upgradeRequired ? 'Upgrade to access this category.' : data.error)
          setPhase('error')
          return
        }
        setCards(data.questions)
        setCurrentIdx(0)
        setSelectedOption(null)
        setCorrect(0)
        setWrong(0)
        setPhase('active')
      })
      .catch(() => {
        setErrorMsg('Failed to load questions.')
        setPhase('error')
      })
  }, [])

  // Find the correct answer index
  const getCorrectIndex = useCallback(() => {
    if (!cards[currentIdx]) return -1
    const card = cards[currentIdx]
    return card.options.findIndex(opt => opt === card.answer_text)
  }, [cards, currentIdx])

  // Handle selecting an answer option
  const handleSelectOption = useCallback(
    (index: number) => {
      if (answered) return // Already answered
      setSelectedOption(index)
      const correctIdx = getCorrectIndex()
      if (index === correctIdx) {
        setCorrect(prev => prev + 1)
      } else {
        setWrong(prev => prev + 1)
      }
    },
    [answered, getCorrectIndex],
  )

  // ── Advance to next card ──────────────────────────────────────────────

  const advanceCard = useCallback(
    (direction: 'left' | 'right') => {
      setFlyOff(direction)

      setTimeout(() => {
        setFlyOff(null)
        setDragDelta(0)
        setSelectedOption(null)
        if (currentIdx >= cards.length - 1) {
          setPhase('done')
        } else {
          setCurrentIdx(prev => prev + 1)
        }
      }, 300)
    },
    [currentIdx, cards.length],
  )

  // ── Swipe handlers (only active after answering) ──────────────────────

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!answered) return
      dragStartX.current = e.touches[0].clientX
      setIsDragging(true)
    },
    [answered],
  )

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isDragging || !answered) return
      setDragDelta(e.touches[0].clientX - dragStartX.current)
    },
    [isDragging, answered],
  )

  const onTouchEnd = useCallback(() => {
    if (!isDragging || !answered) return
    setIsDragging(false)
    if (dragDelta > 100) {
      advanceCard('right')
    } else if (dragDelta < -100) {
      advanceCard('left')
    } else {
      setDragDelta(0)
    }
  }, [isDragging, answered, dragDelta, advanceCard])

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!answered) return
      dragStartX.current = e.clientX
      setIsDragging(true)
      e.preventDefault()
    },
    [answered],
  )

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging || !answered) return
      setDragDelta(e.clientX - dragStartX.current)
    },
    [isDragging, answered],
  )

  const onMouseUp = useCallback(() => {
    if (!isDragging || !answered) return
    setIsDragging(false)
    if (dragDelta > 100) {
      advanceCard('right')
    } else if (dragDelta < -100) {
      advanceCard('left')
    } else {
      setDragDelta(0)
    }
  }, [isDragging, answered, dragDelta, advanceCard])

  // Release mouse if leaves window
  useEffect(() => {
    const handleUp = () => {
      if (isDragging && answered) {
        setIsDragging(false)
        if (dragDelta > 100) {
          advanceCard('right')
        } else if (dragDelta < -100) {
          advanceCard('left')
        } else {
          setDragDelta(0)
        }
      }
    }
    window.addEventListener('mouseup', handleUp)
    return () => window.removeEventListener('mouseup', handleUp)
  }, [isDragging, answered, dragDelta, advanceCard])

  // Global mousemove for smooth desktop drag
  useEffect(() => {
    if (!isDragging) return
    const handleMove = (e: MouseEvent) => {
      setDragDelta(e.clientX - dragStartX.current)
    }
    window.addEventListener('mousemove', handleMove)
    return () => window.removeEventListener('mousemove', handleMove)
  }, [isDragging])

  // ── Keyboard shortcuts ──────────────────────────────────────────────────

  useEffect(() => {
    if (phase !== 'active') return
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return

      // 1-4 to select answer option
      if (!answered && ['1', '2', '3', '4'].includes(e.key)) {
        e.preventDefault()
        const card = cards[currentIdx]
        const idx = parseInt(e.key) - 1
        if (idx < card.options.length) {
          handleSelectOption(idx)
        }
        return
      }

      // After answering: arrow right or Enter to advance
      if (answered && (e.key === 'ArrowRight' || e.key === 'Enter')) {
        e.preventDefault()
        advanceCard('right')
        return
      }

      // After answering: arrow left to advance (mark for review)
      if (answered && e.key === 'ArrowLeft') {
        e.preventDefault()
        advanceCard('left')
        return
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [phase, answered, advanceCard, handleSelectOption, cards, currentIdx])

  // ── Render: Category selector ───────────────────────────────────────────

  if (phase === 'select') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="text-4xl mb-3">🃏</div>
            <h1 className="text-2xl font-bold text-gray-900">Flashcards</h1>
            <p className="text-gray-500 mt-1">Answer questions, then swipe to categorize</p>
          </div>

          <div className="space-y-3">
            {CATEGORIES.map(cat => {
              const locked = !accessible.includes(cat.value)
              return (
                <button
                  key={cat.value}
                  disabled={locked}
                  onClick={() => loadCards(cat.value)}
                  className={`w-full flex items-center gap-3 px-5 py-4 rounded-xl border-2 transition-all text-left ${
                    locked
                      ? 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed'
                      : 'border-gray-200 bg-white text-gray-800 hover:border-blue-400 hover:shadow-md active:scale-[0.98]'
                  }`}
                >
                  <span className="text-2xl">{cat.icon}</span>
                  <span className="font-semibold text-lg">{cat.label}</span>
                  {locked && <span className="ml-auto text-sm">🔒</span>}
                </button>
              )
            })}
          </div>

          <Link
            href="/dashboard"
            className="block text-center text-sm text-gray-400 hover:text-gray-600 mt-6"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  // ── Render: Loading ─────────────────────────────────────────────────────

  if (phase === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-800 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Shuffling cards...</p>
        </div>
      </div>
    )
  }

  // ── Render: Error ───────────────────────────────────────────────────────

  if (phase === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 max-w-md text-center">
          <p className="text-red-700 font-semibold text-lg mb-2">Could not load flashcards</p>
          <p className="text-red-600 mb-6">{errorMsg}</p>
          <button
            onClick={() => setPhase('select')}
            className="px-6 py-2 bg-blue-800 text-white rounded-lg hover:bg-blue-900"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  // ── Render: Done ────────────────────────────────────────────────────────

  if (phase === 'done') {
    const total = correct + wrong
    const percentage = total > 0 ? Math.round((correct / total) * 100) : 0
    const passed = percentage >= 70

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div
            className={`rounded-2xl p-8 text-center mb-6 ${
              passed ? 'bg-green-600' : 'bg-red-500'
            } text-white`}
          >
            <p className="text-xs uppercase tracking-wide text-white/70 mb-2">Flashcards Complete</p>
            <div className="text-6xl font-bold mb-2">{percentage}%</div>
            <div className="text-2xl font-semibold mb-1">
              {passed ? 'Great job!' : 'Keep studying!'}
            </div>
            <div className="text-white/80 text-lg mt-2">
              <span className="text-green-200 font-semibold">{correct} correct</span>
              {' / '}
              <span className="text-red-200 font-semibold">{wrong} wrong</span>
            </div>
          </div>

          <div className="flex gap-3 mb-4">
            <button
              onClick={() => setPhase('select')}
              className="flex-1 text-center px-5 py-3 bg-blue-800 text-white rounded-xl font-semibold hover:bg-blue-900 transition-colors"
            >
              Play Again
            </button>
          </div>

          <Link
            href="/dashboard"
            className="block text-center text-sm text-gray-400 hover:text-gray-600"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  // ── Render: Active card ─────────────────────────────────────────────────

  const card = cards[currentIdx]
  const correctIdx = getCorrectIndex()
  const wasCorrect = selectedOption === correctIdx

  // Visual feedback intensities
  const swipeOpacity = Math.min(Math.abs(dragDelta) / 150, 1)
  const isSwipingRight = dragDelta > 30
  const isSwipingLeft = dragDelta < -30

  // Fly-off transform
  let cardTransform = answered ? `translateX(${dragDelta}px) rotate(${dragDelta * 0.08}deg)` : 'none'
  let cardTransition = isDragging ? 'none' : 'transform 0.3s ease, opacity 0.3s ease'
  let cardOpacity = 1

  if (flyOff === 'right') {
    cardTransform = 'translateX(120vw) rotate(30deg)'
    cardTransition = 'transform 0.3s ease, opacity 0.3s ease'
    cardOpacity = 0
  } else if (flyOff === 'left') {
    cardTransform = 'translateX(-120vw) rotate(-30deg)'
    cardTransition = 'transform 0.3s ease, opacity 0.3s ease'
    cardOpacity = 0
  }

  return (
    <div
      className="min-h-screen bg-gray-50 flex flex-col select-none"
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
    >
      {/* Header */}
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPhase('select')}
            className="text-gray-400 hover:text-gray-700 p-1"
            aria-label="Back"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-sm font-semibold text-gray-800">
            Card {currentIdx + 1} of {cards.length}
          </span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-green-600 font-semibold">{correct} ✓</span>
          <span className="text-gray-300">|</span>
          <span className="text-red-500 font-semibold">{wrong} ✗</span>
        </div>
      </header>

      {/* Progress bar */}
      <div className="h-1 bg-gray-200 shrink-0">
        <div
          className="h-full bg-blue-800 transition-all duration-300"
          style={{ width: `${((currentIdx + (flyOff ? 1 : 0)) / cards.length) * 100}%` }}
        />
      </div>

      {/* Card area */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-hidden relative">
        {/* Stack effect: background cards */}
        {currentIdx + 2 < cards.length && (
          <div className="absolute w-full max-w-sm mx-auto" style={{ maxWidth: '100%' }}>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 h-64 sm:h-[28rem] transform scale-[0.92] translate-y-4 opacity-40" />
          </div>
        )}
        {currentIdx + 1 < cards.length && (
          <div className="absolute w-full max-w-sm mx-auto" style={{ maxWidth: '100%' }}>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 h-64 sm:h-[28rem] transform scale-[0.96] translate-y-2 opacity-60" />
          </div>
        )}

        {/* Active card */}
        <div
          ref={cardRef}
          className={`relative w-full max-w-sm ${answered ? 'cursor-grab active:cursor-grabbing' : ''}`}
          style={{
            transform: cardTransform,
            transition: cardTransition,
            opacity: cardOpacity,
            touchAction: 'pan-y',
          }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onMouseDown={onMouseDown}
        >
          {/* Swipe indicator overlays (only after answering) */}
          {answered && isSwipingRight && (
            <div
              className="absolute inset-0 rounded-2xl border-4 border-green-400 bg-green-50 z-10 flex items-center justify-center pointer-events-none"
              style={{ opacity: swipeOpacity * 0.7 }}
            >
              <span className="text-green-600 font-bold text-2xl sm:text-3xl rotate-[-15deg] border-4 border-green-500 rounded-lg px-4 py-1">
                GOT IT
              </span>
            </div>
          )}
          {answered && isSwipingLeft && (
            <div
              className="absolute inset-0 rounded-2xl border-4 border-orange-400 bg-orange-50 z-10 flex items-center justify-center pointer-events-none"
              style={{ opacity: swipeOpacity * 0.7 }}
            >
              <span className="text-orange-600 font-bold text-2xl sm:text-3xl rotate-[15deg] border-4 border-orange-500 rounded-lg px-4 py-1">
                REVIEW
              </span>
            </div>
          )}

          {/* Card face */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="p-4 sm:p-6 min-h-[14rem] sm:min-h-[24rem] flex flex-col">
              {/* Category + difficulty badges */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                  {card.category}
                </span>
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                  {card.difficulty}
                </span>
              </div>

              {/* Question */}
              <p className="text-base sm:text-lg font-semibold text-gray-900 leading-relaxed mb-4">
                {card.question}
              </p>

              {/* Answer options */}
              <div className="flex-1 flex flex-col gap-2">
                {card.options.map((option, idx) => {
                  let optionStyle = 'border-gray-200 bg-white text-gray-800 hover:border-blue-400 hover:bg-blue-50 cursor-pointer'

                  if (answered) {
                    if (idx === correctIdx) {
                      // Correct answer - always green
                      optionStyle = 'border-green-400 bg-green-50 text-green-900 ring-2 ring-green-400'
                    } else if (idx === selectedOption && idx !== correctIdx) {
                      // User picked wrong answer - red
                      optionStyle = 'border-red-400 bg-red-50 text-red-900 ring-2 ring-red-400'
                    } else {
                      // Other options - dimmed
                      optionStyle = 'border-gray-100 bg-gray-50 text-gray-400'
                    }
                  }

                  return (
                    <button
                      key={idx}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSelectOption(idx)
                      }}
                      disabled={answered}
                      className={`w-full flex items-center gap-3 px-4 sm:px-6 py-3.5 sm:py-4 min-h-[48px] rounded-xl border-2 transition-all text-left ${optionStyle}`}
                    >
                      <span
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                          answered && idx === correctIdx
                            ? 'bg-green-500 text-white'
                            : answered && idx === selectedOption && idx !== correctIdx
                              ? 'bg-red-500 text-white'
                              : answered
                                ? 'bg-gray-200 text-gray-400'
                                : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {answered && idx === correctIdx ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : answered && idx === selectedOption && idx !== correctIdx ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        ) : (
                          OPTION_LABELS[idx]
                        )}
                      </span>
                      <span className="text-sm leading-snug">{option}</span>
                    </button>
                  )
                })}
              </div>

              {/* Result + explanation (shown after answering) */}
              {answered && (
                <div className="mt-3 space-y-2">
                  {/* Correct/Wrong banner */}
                  <div
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold ${
                      wasCorrect
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {wasCorrect ? (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        Correct!
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Wrong - the answer is {OPTION_LABELS[correctIdx]}
                      </>
                    )}
                  </div>

                  {/* Explanation */}
                  {card.explanation && (
                    <p className="text-sm text-gray-600 leading-relaxed px-1">{card.explanation}</p>
                  )}
                </div>
              )}

              {/* Hint text */}
              {!answered && (
                <div className="text-center mt-3">
                  <span className="text-xs text-gray-400">Pick an answer (or press 1-4)</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom action area */}
      <div className="shrink-0 bg-white border-t px-4 py-3 flex items-center justify-center gap-4">
        {answered ? (
          <>
            <button
              onClick={() => advanceCard('left')}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-orange-50 border-2 border-orange-200 text-orange-600 font-semibold hover:bg-orange-100 active:scale-95 transition-all text-sm"
              aria-label="Need to review"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              Review
            </button>

            <button
              onClick={() => advanceCard('right')}
              className="flex items-center gap-2 px-8 py-3 rounded-xl bg-blue-800 text-white font-semibold hover:bg-blue-900 active:scale-95 transition-all text-sm"
              aria-label="Next card"
            >
              Next
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        ) : (
          <p className="text-sm text-gray-400">Select an answer above</p>
        )}
      </div>

      {/* Keyboard hint (desktop only) */}
      <div className="hidden md:block text-center pb-2 bg-white">
        <span className="text-xs text-gray-300">
          {answered
            ? '→ or Enter = next · ← = review later · or swipe'
            : '1-4 = select answer'}
        </span>
      </div>
    </div>
  )
}
