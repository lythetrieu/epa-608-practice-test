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
}

export default function FlashcardClient({ tier }: { tier: Tier }) {
  const [phase, setPhase] = useState<Phase>('select')
  const [cards, setCards] = useState<FlashcardQuestion[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
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
        setFlipped(false)
        setCorrect(0)
        setWrong(0)
        setPhase('active')
      })
      .catch(() => {
        setErrorMsg('Failed to load questions.')
        setPhase('error')
      })
  }, [])

  // ── Swipe handlers ──────────────────────────────────────────────────────

  const handleSwipeComplete = useCallback(
    (direction: 'left' | 'right') => {
      setFlyOff(direction)
      if (direction === 'right') setCorrect(prev => prev + 1)
      else setWrong(prev => prev + 1)

      setTimeout(() => {
        setFlyOff(null)
        setDragDelta(0)
        setFlipped(false)
        if (currentIdx >= cards.length - 1) {
          setPhase('done')
        } else {
          setCurrentIdx(prev => prev + 1)
        }
      }, 300)
    },
    [currentIdx, cards.length],
  )

  // Touch handlers
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    dragStartX.current = e.touches[0].clientX
    setIsDragging(true)
  }, [])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return
    setDragDelta(e.touches[0].clientX - dragStartX.current)
  }, [isDragging])

  const onTouchEnd = useCallback(() => {
    setIsDragging(false)
    if (dragDelta > 100) {
      handleSwipeComplete('right')
    } else if (dragDelta < -100) {
      handleSwipeComplete('left')
    } else {
      setDragDelta(0)
    }
  }, [dragDelta, handleSwipeComplete])

  // Mouse handlers (desktop drag)
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragStartX.current = e.clientX
    setIsDragging(true)
    e.preventDefault()
  }, [])

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return
      setDragDelta(e.clientX - dragStartX.current)
    },
    [isDragging],
  )

  const onMouseUp = useCallback(() => {
    if (!isDragging) return
    setIsDragging(false)
    if (dragDelta > 100) {
      handleSwipeComplete('right')
    } else if (dragDelta < -100) {
      handleSwipeComplete('left')
    } else {
      setDragDelta(0)
    }
  }, [isDragging, dragDelta, handleSwipeComplete])

  // Release mouse if leaves window
  useEffect(() => {
    const handleUp = () => {
      if (isDragging) {
        setIsDragging(false)
        if (dragDelta > 100) {
          handleSwipeComplete('right')
        } else if (dragDelta < -100) {
          handleSwipeComplete('left')
        } else {
          setDragDelta(0)
        }
      }
    }
    window.addEventListener('mouseup', handleUp)
    return () => window.removeEventListener('mouseup', handleUp)
  }, [isDragging, dragDelta, handleSwipeComplete])

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
      if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault()
        setFlipped(prev => !prev)
      } else if (e.key === 'ArrowRight' && flipped) {
        e.preventDefault()
        handleSwipeComplete('right')
      } else if (e.key === 'ArrowLeft' && flipped) {
        e.preventDefault()
        handleSwipeComplete('left')
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [phase, flipped, handleSwipeComplete])

  // ── Render: Category selector ───────────────────────────────────────────

  if (phase === 'select') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="text-4xl mb-3">🃏</div>
            <h1 className="text-2xl font-bold text-gray-900">Flashcards</h1>
            <p className="text-gray-500 mt-1">Swipe right if you knew it, left if you didn&apos;t</p>
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
              <span className="text-green-200 font-semibold">{correct} knew</span>
              {' / '}
              <span className="text-red-200 font-semibold">{wrong} missed</span>
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
  const _total = correct + wrong

  // Visual feedback intensities
  const swipeOpacity = Math.min(Math.abs(dragDelta) / 150, 1)
  const isSwipingRight = dragDelta > 30
  const isSwipingLeft = dragDelta < -30

  // Fly-off transform
  let cardTransform = `translateX(${dragDelta}px) rotate(${dragDelta * 0.08}deg)`
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
          <span className="text-green-600 font-semibold">{correct} &#10003;</span>
          <span className="text-gray-300">|</span>
          <span className="text-red-500 font-semibold">{wrong} &#10007;</span>
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
          <div className="absolute w-full max-w-sm mx-auto" style={{ maxWidth: '22rem' }}>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 h-96 transform scale-[0.92] translate-y-4 opacity-40" />
          </div>
        )}
        {currentIdx + 1 < cards.length && (
          <div className="absolute w-full max-w-sm mx-auto" style={{ maxWidth: '22rem' }}>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 h-96 transform scale-[0.96] translate-y-2 opacity-60" />
          </div>
        )}

        {/* Active card */}
        <div
          ref={cardRef}
          className="relative w-full max-w-sm cursor-grab active:cursor-grabbing"
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
          {/* Swipe indicator overlays */}
          {isSwipingRight && (
            <div
              className="absolute inset-0 rounded-2xl border-4 border-green-400 bg-green-50 z-10 flex items-center justify-center pointer-events-none"
              style={{ opacity: swipeOpacity * 0.7 }}
            >
              <span className="text-green-600 font-bold text-3xl rotate-[-15deg] border-4 border-green-500 rounded-lg px-4 py-1">
                KNEW IT
              </span>
            </div>
          )}
          {isSwipingLeft && (
            <div
              className="absolute inset-0 rounded-2xl border-4 border-red-400 bg-red-50 z-10 flex items-center justify-center pointer-events-none"
              style={{ opacity: swipeOpacity * 0.7 }}
            >
              <span className="text-red-600 font-bold text-3xl rotate-[15deg] border-4 border-red-500 rounded-lg px-4 py-1">
                MISSED
              </span>
            </div>
          )}

          {/* Card face */}
          <div
            className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden"
            onClick={() => {
              if (!isDragging && Math.abs(dragDelta) < 10) setFlipped(prev => !prev)
            }}
          >
            {!flipped ? (
              /* ─── Front ─── */
              <div className="p-6 sm:p-8 min-h-[24rem] flex flex-col">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                    {card.category}
                  </span>
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                    {card.difficulty}
                  </span>
                </div>

                <div className="flex-1 flex items-center">
                  <p className="text-lg sm:text-xl font-semibold text-gray-900 leading-relaxed">
                    {card.question}
                  </p>
                </div>

                <div className="text-center mt-6">
                  <span className="text-sm text-gray-400 animate-pulse">Tap to reveal answer</span>
                </div>
              </div>
            ) : (
              /* ─── Back ─── */
              <div className="p-6 sm:p-8 min-h-[24rem] flex flex-col">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">
                    Answer
                  </span>
                </div>

                <p className="text-sm text-gray-500 mb-3 leading-relaxed">{card.question}</p>

                <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
                  <p className="text-green-900 font-semibold text-lg">{card.answer_text}</p>
                </div>

                {card.explanation && (
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                      Explanation
                    </p>
                    <p className="text-sm text-gray-700 leading-relaxed">{card.explanation}</p>
                  </div>
                )}

                <div className="text-center mt-4">
                  <span className="text-sm text-gray-400">Swipe right = knew it / left = missed</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom action buttons (mobile-friendly) */}
      <div className="shrink-0 bg-white border-t px-4 py-3 flex items-center justify-center gap-6">
        <button
          onClick={() => handleSwipeComplete('left')}
          className="w-14 h-14 rounded-full bg-red-50 border-2 border-red-200 text-red-500 flex items-center justify-center hover:bg-red-100 active:scale-95 transition-all"
          aria-label="Didn't know"
        >
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <button
          onClick={() => setFlipped(prev => !prev)}
          className="w-12 h-12 rounded-full bg-gray-50 border-2 border-gray-200 text-gray-500 flex items-center justify-center hover:bg-gray-100 active:scale-95 transition-all text-sm font-semibold"
          aria-label="Flip card"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>

        <button
          onClick={() => handleSwipeComplete('right')}
          className="w-14 h-14 rounded-full bg-green-50 border-2 border-green-200 text-green-500 flex items-center justify-center hover:bg-green-100 active:scale-95 transition-all"
          aria-label="Knew it"
        >
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </button>
      </div>

      {/* Keyboard hint (desktop only) */}
      <div className="hidden md:block text-center pb-2 bg-white">
        <span className="text-xs text-gray-300">
          Space = flip &middot; ← = missed &middot; → = knew it
        </span>
      </div>
    </div>
  )
}
