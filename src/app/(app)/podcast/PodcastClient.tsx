'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'

type Question = {
  id: string
  category: string
  question: string
  options: string[]
  answer_text: string
  explanation: string
  difficulty: string
}

type PodcastPhase = 'idle' | 'loading' | 'playing' | 'paused' | 'done' | 'error'
type PauseDelay = 3 | 5 | 10
type PlaybackSpeed = 0.8 | 1 | 1.2

const CATEGORIES = [
  { value: 'Core', label: 'Core', slug: 'core' },
  { value: 'Type I', label: 'Type I', slug: 'type-1' },
  { value: 'Type II', label: 'Type II', slug: 'type-2' },
  { value: 'Type III', label: 'Type III', slug: 'type-3' },
] as const

export default function PodcastClient({ tier }: { tier: 'free' | 'starter' | 'ultimate' }) {
  const [phase, setPhase] = useState<PodcastPhase>('idle')
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [category, setCategory] = useState<string>('Core')
  const [speed, setSpeed] = useState<PlaybackSpeed>(1)
  const [pauseDelay, setPauseDelay] = useState<PauseDelay>(5)
  const [errorMsg, setErrorMsg] = useState('')
  const [statusText, setStatusText] = useState('')
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [selectedVoice, setSelectedVoice] = useState<string>('')

  const abortRef = useRef(false)
  const playingRef = useRef(false)
  const resumeResolverRef = useRef<(() => void) | null>(null)

  const isFree = tier === 'free'

  // Accessible categories for current tier
  const _accessibleCategories = CATEGORIES.filter(c => {
    if (c.value === 'Core') return true
    return !isFree
  })

  // Load available voices
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return

    const loadVoices = () => {
      const allVoices = window.speechSynthesis.getVoices()
      if (allVoices.length === 0) return // Not loaded yet, wait for event

      // Filter English voices
      const enVoices = allVoices.filter(v => v.lang.startsWith('en'))
      if (enVoices.length === 0) {
        // Fallback: show all voices if no English found
        setVoices(allVoices.slice(0, 5))
        if (!selectedVoice && allVoices.length > 0) setSelectedVoice(allVoices[0].name)
        return
      }

      // Prefer high-quality voices
      const PREFERRED = ['Samantha', 'Daniel', 'Karen', 'Aria', 'Google US']
      const preferred = PREFERRED
        .map(name => enVoices.find(v => v.name.includes(name)))
        .filter(Boolean) as SpeechSynthesisVoice[]

      const finalVoices = preferred.length > 0 ? preferred : enVoices.slice(0, 5)
      setVoices(finalVoices)
      if (!selectedVoice && finalVoices.length > 0) {
        setSelectedVoice(finalVoices[0].name)
      }
    }

    // Try loading immediately
    loadVoices()
    // Also listen for async voice loading (Chrome loads voices async)
    window.speechSynthesis.onvoiceschanged = loadVoices

    return () => {
      if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Cleanup speech on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel()
      abortRef.current = true
    }
  }, [])

  const speak = useCallback((text: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (abortRef.current) { reject(new Error('aborted')); return }
      if (!window.speechSynthesis) { resolve(); return }

      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = speed
      utterance.lang = 'en-US'
      const voice = voices.find(v => v.name === selectedVoice)
      if (voice) utterance.voice = voice
      utterance.onend = () => { clearInterval(keepAlive); resolve() }
      utterance.onerror = (e) => {
        clearInterval(keepAlive)
        if (e.error === 'canceled' || e.error === 'interrupted') {
          reject(new Error('canceled'))
        } else {
          resolve() // Skip on other errors
        }
      }
      window.speechSynthesis.speak(utterance)

      // Chrome bug: speechSynthesis stops after ~15s. Pause/resume keeps it alive.
      const keepAlive = setInterval(() => {
        if (!window.speechSynthesis.speaking) { clearInterval(keepAlive); return }
        window.speechSynthesis.pause()
        window.speechSynthesis.resume()
      }, 10000)
    })
  }, [speed, voices, selectedVoice])

  const wait = useCallback((seconds: number): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (abortRef.current) { reject(new Error('aborted')); return }
      const timeout = setTimeout(resolve, seconds * 1000)
      // Store a way to cancel during pause
      const checkInterval = setInterval(() => {
        if (abortRef.current) {
          clearTimeout(timeout)
          clearInterval(checkInterval)
          reject(new Error('aborted'))
        }
      }, 200)
      // Clean up interval when resolved
      const origResolve = resolve
      resolve = () => { clearInterval(checkInterval); origResolve() }
    })
  }, [])

  const fetchQuestions = useCallback(async () => {
    setPhase('loading')
    setErrorMsg('')
    try {
      const res = await fetch('/api/practice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, count: 25 }),
      })
      const data = await res.json()
      if (data.error) {
        setErrorMsg(data.upgradeRequired ? 'Upgrade to access this category.' : data.error)
        setPhase('error')
        return null
      }
      return data.questions as Question[]
    } catch {
      setErrorMsg('Failed to load questions.')
      setPhase('error')
      return null
    }
  }, [category])

  const playSequence = useCallback(async (qs: Question[], startIdx: number) => {
    abortRef.current = false
    playingRef.current = true

    for (let i = startIdx; i < qs.length; i++) {
      if (abortRef.current) break

      // Check if paused
      while (!playingRef.current && !abortRef.current) {
        await new Promise<void>(r => { resumeResolverRef.current = r })
      }
      if (abortRef.current) break

      const q = qs[i]
      setCurrentIdx(i)

      // Read question number and question
      setStatusText('Reading question...')
      try {
        await speak(`Question ${i + 1} of ${qs.length}. ${q.question}`)
      } catch { break }

      if (abortRef.current) break

      // Read options
      const letters = ['A', 'B', 'C', 'D']
      for (let j = 0; j < q.options.length; j++) {
        if (abortRef.current) break
        // Check if paused
        while (!playingRef.current && !abortRef.current) {
          await new Promise<void>(r => { resumeResolverRef.current = r })
        }
        if (abortRef.current) break
        try {
          await speak(`${letters[j]}. ${q.options[j]}`)
        } catch { break }
      }
      if (abortRef.current) break

      // Pause before answer
      setStatusText(`Thinking time... ${pauseDelay}s`)
      try {
        await wait(pauseDelay)
      } catch { break }

      if (abortRef.current) break

      // Check if paused
      while (!playingRef.current && !abortRef.current) {
        await new Promise<void>(r => { resumeResolverRef.current = r })
      }
      if (abortRef.current) break

      // Read answer
      setStatusText('Revealing answer...')
      try {
        await speak(`The correct answer is: ${q.answer_text}`)
      } catch { break }

      if (abortRef.current) break

      // Read explanation if available
      if (q.explanation) {
        try {
          await speak(q.explanation)
        } catch { break }
      }

      if (abortRef.current) break

      // Pause before next question
      if (i < qs.length - 1) {
        setStatusText('Next question in 3s...')
        try {
          await wait(3)
        } catch { break }
      }
    }

    // Only show completion if we actually finished all questions (not paused/stopped)
    if (!abortRef.current && playingRef.current) {
      setPhase('done')
      setStatusText('')
    }
  }, [speak, wait, pauseDelay])

  const handleStart = useCallback(async () => {
    const qs = await fetchQuestions()
    if (!qs) return
    setQuestions(qs)
    setCurrentIdx(0)
    setPhase('playing')
    playSequence(qs, 0)
  }, [fetchQuestions, playSequence])

  const handlePause = useCallback(() => {
    playingRef.current = false
    window.speechSynthesis.cancel()
    setPhase('paused')
    setStatusText('Paused')
  }, [])

  const handleResume = useCallback(() => {
    playingRef.current = true
    setPhase('playing')
    if (resumeResolverRef.current) {
      resumeResolverRef.current()
      resumeResolverRef.current = null
    }
  }, [])

  const handleStop = useCallback(() => {
    abortRef.current = true
    playingRef.current = false
    window.speechSynthesis.cancel()
    setPhase('idle')
    setStatusText('')
    setQuestions([])
    setCurrentIdx(0)
  }, [])

  const handleSkip = useCallback(() => {
    if (currentIdx >= questions.length - 1) {
      handleStop()
      setPhase('done')
      return
    }
    window.speechSynthesis.cancel()
    abortRef.current = true
    // Brief delay then restart from next question
    setTimeout(() => {
      abortRef.current = false
      playingRef.current = true
      setPhase('playing')
      const nextIdx = currentIdx + 1
      setCurrentIdx(nextIdx)
      playSequence(questions, nextIdx)
    }, 100)
  }, [currentIdx, questions, playSequence, handleStop])

  const handlePrevious = useCallback(() => {
    if (currentIdx <= 0) return
    window.speechSynthesis.cancel()
    abortRef.current = true
    setTimeout(() => {
      abortRef.current = false
      playingRef.current = true
      setPhase('playing')
      const prevIdx = currentIdx - 1
      setCurrentIdx(prevIdx)
      playSequence(questions, prevIdx)
    }, 100)
  }, [currentIdx, questions, playSequence])

  const q = questions[currentIdx]
  const isActive = phase === 'playing' || phase === 'paused'

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <header className="px-4 sm:px-6 py-4 border-b border-gray-800 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white">Podcast Mode</h1>
          <p className="text-xs text-gray-400 mt-0.5">Hands-free study - listen and learn</p>
        </div>
        <Link
          href="/dashboard"
          className="text-sm text-gray-400 hover:text-white transition-colors"
        >
          Back
        </Link>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8">
        {/* Idle state - settings */}
        {phase === 'idle' && (
          <div className="w-full max-w-md space-y-6">
            <div className="text-center mb-8">
              <div className="text-5xl mb-4">🎧</div>
              <h2 className="text-2xl font-bold text-white mb-2">Podcast Study Mode</h2>
              <p className="text-gray-400 text-sm">
                Questions read aloud with answers. Perfect for driving or commuting.
              </p>
            </div>

            {/* Category selector */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map(cat => {
                  const locked = cat.value !== 'Core' && isFree
                  return (
                    <button
                      key={cat.value}
                      onClick={() => !locked && setCategory(cat.value)}
                      disabled={locked}
                      className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                        locked
                          ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                          : category === cat.value
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      {cat.label}
                      {locked && <span className="ml-1 text-xs">🔒</span>}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Pause delay */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Thinking time (before answer)
              </label>
              <div className="flex gap-2">
                {([3, 5, 10] as PauseDelay[]).map(d => (
                  <button
                    key={d}
                    onClick={() => setPauseDelay(d)}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      pauseDelay === d
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {d}s
                  </button>
                ))}
              </div>
            </div>

            {/* Voice */}
            {voices.length > 1 && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Voice</label>
                <select
                  value={selectedVoice}
                  onChange={e => setSelectedVoice(e.target.value)}
                  className="w-full bg-gray-800 text-gray-200 rounded-lg px-3 py-2 text-sm border border-gray-700"
                >
                  {voices.map(v => (
                    <option key={v.name} value={v.name}>
                      {v.name} {v.lang}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Speed */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Playback speed
              </label>
              <div className="flex gap-2">
                {([0.8, 1, 1.2] as PlaybackSpeed[]).map(s => (
                  <button
                    key={s}
                    onClick={() => setSpeed(s)}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      speed === s
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>

            {/* Start button */}
            <button
              onClick={handleStart}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white text-lg font-bold rounded-xl transition-colors mt-4"
            >
              Start Listening
            </button>
          </div>
        )}

        {/* Loading */}
        {phase === 'loading' && (
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-400">Loading {category} questions...</p>
          </div>
        )}

        {/* Error */}
        {phase === 'error' && (
          <div className="text-center max-w-md">
            <div className="bg-red-900/30 border border-red-800 rounded-xl p-8">
              <p className="text-red-400 font-semibold text-lg mb-2">Could not load questions</p>
              <p className="text-red-300 text-sm mb-6">{errorMsg}</p>
              <button
                onClick={() => setPhase('idle')}
                className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Go Back
              </button>
            </div>
          </div>
        )}

        {/* Playing / Paused */}
        {isActive && q && (
          <div className="w-full max-w-2xl space-y-6">
            {/* Progress */}
            <div className="flex items-center justify-between text-sm text-gray-400">
              <span>{category}</span>
              <span>Question {currentIdx + 1} of {questions.length}</span>
            </div>

            {/* Progress bar */}
            <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-300 rounded-full"
                style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
              />
            </div>

            {/* Question display */}
            <div className="bg-gray-800 rounded-2xl p-6 sm:p-8">
              <p className="text-xl sm:text-2xl font-semibold leading-relaxed text-white">
                {q.question}
              </p>
              <div className="mt-6 space-y-3">
                {q.options.map((opt, i) => (
                  <div key={i} className="flex gap-3 text-gray-300 text-base sm:text-lg">
                    <span className="text-gray-500 font-bold shrink-0">
                      {['A', 'B', 'C', 'D'][i]}.
                    </span>
                    <span>{opt}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Status text */}
            {statusText && (
              <p className="text-center text-sm text-blue-400 animate-pulse">{statusText}</p>
            )}

            {/* Controls */}
            <div className="flex items-center justify-center gap-4">
              {/* Previous */}
              <button
                onClick={handlePrevious}
                disabled={currentIdx <= 0}
                className="p-3 rounded-full bg-gray-800 text-white hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                aria-label="Previous question"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              {/* Play / Pause */}
              {phase === 'playing' ? (
                <button
                  onClick={handlePause}
                  className="p-5 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/30"
                  aria-label="Pause"
                >
                  <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="4" width="4" height="16" rx="1" />
                    <rect x="14" y="4" width="4" height="16" rx="1" />
                  </svg>
                </button>
              ) : (
                <button
                  onClick={handleResume}
                  className="p-5 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/30"
                  aria-label="Resume"
                >
                  <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </button>
              )}

              {/* Skip / Next */}
              <button
                onClick={handleSkip}
                className="p-3 rounded-full bg-gray-800 text-white hover:bg-gray-700 transition-colors"
                aria-label="Next question"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Stop button */}
            <div className="text-center">
              <button
                onClick={handleStop}
                className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
              >
                Stop & Return to Settings
              </button>
            </div>

            {/* Speed adjustment while playing */}
            <div className="flex items-center justify-center gap-2">
              <span className="text-xs text-gray-500">Speed:</span>
              {([0.8, 1, 1.2] as PlaybackSpeed[]).map(s => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                    speed === s
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Done */}
        {phase === 'done' && (
          <div className="text-center max-w-md space-y-6">
            <div className="text-5xl mb-2">🎉</div>
            <h2 className="text-2xl font-bold text-white">Session Complete!</h2>
            <p className="text-gray-400">
              You listened to all {questions.length} {category} questions.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleStart}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
              >
                Listen Again
              </button>
              <button
                onClick={() => { setPhase('idle'); setQuestions([]); setCurrentIdx(0) }}
                className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold rounded-xl transition-colors"
              >
                Change Settings
              </button>
              <Link
                href="/dashboard"
                className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
