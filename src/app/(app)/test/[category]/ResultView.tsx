'use client'
import { useState, useEffect } from 'react'
import type { SessionResult, QuestionPublic } from '@/types'
import Link from 'next/link'
import { ReportButton } from './ReportButton'

// Track consecutive fails per category — show gentle Pro hint after 2
function useFailStreak(category: string, passed: boolean) {
  const [showHint, setShowHint] = useState(false)
  const [failCount, setFailCount] = useState(0)

  useEffect(() => {
    const streakKey = `epa608_fail_${category}`
    const dismissKey = `epa608_failhint_dismissed`
    const dismissedUntil = parseInt(localStorage.getItem(dismissKey) ?? '0', 10)
    const now = Date.now()

    const prev = parseInt(localStorage.getItem(streakKey) ?? '0', 10)

    if (passed) {
      localStorage.removeItem(streakKey)
      return
    }

    const next = prev + 1
    localStorage.setItem(streakKey, String(next))
    setFailCount(next)

    // Show hint after 2+ fails, not dismissed in last 24h
    if (next >= 2 && now > dismissedUntil) {
      setShowHint(true)
    }
  }, [category, passed])

  function dismiss() {
    setShowHint(false)
    localStorage.setItem(`epa608_failhint_dismissed`, String(Date.now() + 24 * 60 * 60 * 1000))
  }

  return { showHint, failCount, dismiss }
}

function ShareButtons({ percentage, category }: { percentage: number; category: string }) {
  const text = `I scored ${percentage}% on the EPA 608 ${category} Practice Test! Free HVAC certification prep:`
  const url = 'https://epa608practicetest.net'
  const encoded = encodeURIComponent(text)
  const encodedUrl = encodeURIComponent(url)
  const [copied, setCopied] = useState(false)

  function copyLink() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 mb-8">
      <p className="text-sm font-semibold text-gray-700 mb-3">Share your result</p>
      <div className="flex flex-wrap gap-2">
        <a href={`https://twitter.com/intent/tweet?text=${encoded}&url=${encodedUrl}`}
          target="_blank" rel="noopener"
          className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors min-h-[44px]">
          𝕏 Share on X
        </a>
        <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encoded}`}
          target="_blank" rel="noopener"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#1877f2] text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors min-h-[44px]">
          Facebook
        </a>
        <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`}
          target="_blank" rel="noopener"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#0a66c2] text-white text-sm font-medium rounded-lg hover:bg-blue-800 transition-colors min-h-[44px]">
          LinkedIn
        </a>
        <button onClick={copyLink}
          className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors min-h-[44px]">
          {copied ? '✓ Copied!' : '🔗 Copy link'}
        </button>
      </div>
    </div>
  )
}

function SharePopup({ percentage, category, onClose }: { percentage: number; category: string; onClose: () => void }) {
  const text = `I just scored ${percentage}% on the EPA 608 ${category} Practice Test! 🎉 Try it free:`
  const url = 'https://epa608practicetest.net'
  const encoded = encodeURIComponent(text)
  const encodedUrl = encodeURIComponent(url)

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="text-center mb-4">
          <div className="text-4xl mb-2">🎉</div>
          <h3 className="text-xl font-bold text-gray-900">Great score!</h3>
          <p className="text-gray-500 text-sm mt-1">Help other HVAC techs find this free resource</p>
        </div>
        <div className="space-y-2 mb-4">
          <a href={`https://twitter.com/intent/tweet?text=${encoded}&url=${encodedUrl}`}
            target="_blank" rel="noopener" onClick={onClose}
            className="flex items-center justify-center gap-2 w-full py-3 bg-black text-white font-semibold rounded-xl hover:bg-gray-800 transition-colors">
            Share on 𝕏 Twitter
          </a>
          <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encoded}`}
            target="_blank" rel="noopener" onClick={onClose}
            className="flex items-center justify-center gap-2 w-full py-3 bg-[#1877f2] text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors">
            Share on Facebook
          </a>
        </div>
        <button onClick={onClose} className="w-full text-sm text-gray-400 hover:text-gray-600 py-2">
          Maybe later
        </button>
      </div>
    </div>
  )
}

const SLUG_MAP: Record<string, string> = {
  'Core': 'core', 'Type I': 'type-1', 'Type II': 'type-2',
  'Type III': 'type-3', 'Universal': 'universal',
}

function ELI5Button({ questionText, correctAnswer, userAnswer }: {
  questionText: string
  correctAnswer: string
  userAnswer: string | null
}) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [explanation, setExplanation] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleClick() {
    if (state === 'done') return
    setState('loading')
    try {
      const res = await fetch('/api/ai/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionText,
          correctAnswer,
          userAnswer: userAnswer ?? 'No answer',
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErrorMsg(data.error ?? 'Failed to get explanation')
        setState('error')
        return
      }
      setExplanation(data.explanation)
      setState('done')
    } catch {
      setErrorMsg('Network error')
      setState('error')
    }
  }

  return (
    <div className="mt-2">
      {state !== 'done' && (
        <button
          onClick={handleClick}
          disabled={state === 'loading'}
          className="inline-flex items-center gap-1.5 text-xs px-4 py-2.5 min-h-[44px] rounded-lg bg-purple-100 text-purple-700 hover:bg-purple-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {state === 'loading' ? (
            <>
              <span className="w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
              Explaining...
            </>
          ) : (
            '\u{1F914} ELI5'
          )}
        </button>
      )}
      {state === 'done' && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-sm text-purple-900 leading-relaxed">
          <span className="font-semibold text-purple-700 text-xs uppercase tracking-wide block mb-1">AI Explanation</span>
          {explanation}
        </div>
      )}
      {state === 'error' && (
        <p className="text-xs text-red-500 mt-1">{errorMsg}</p>
      )}
    </div>
  )
}

export function ResultView({ result, category, questions, onRetake }: {
  result: SessionResult
  category: string
  questions: QuestionPublic[]
  onRetake: () => void
}) {
  const { score, total, percentage, passed, results, sectionScores } = result
  const slug = SLUG_MAP[category] ?? category.toLowerCase()
  const [showPopup, setShowPopup] = useState(false)
  const { showHint, failCount, dismiss } = useFailStreak(category, passed)

  useEffect(() => {
    if (percentage >= 70) {
      const timer = setTimeout(() => setShowPopup(true), 2500)
      return () => clearTimeout(timer)
    }
  }, [percentage])

  const questionTextMap = new Map(questions.map(q => [q.id, q.question]))

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-10 px-3 sm:px-4">
      {showPopup && <SharePopup percentage={percentage} category={category} onClose={() => setShowPopup(false)} />}
      <div className="max-w-2xl mx-auto">

        {/* Score card */}
        <div className={`rounded-2xl p-5 sm:p-8 text-center mb-4 sm:mb-8 ${passed ? 'bg-green-600' : 'bg-red-500'} text-white`}>
          <div className="text-5xl sm:text-6xl font-bold mb-2">{percentage}%</div>
          <div className="text-xl sm:text-2xl font-semibold mb-1">{passed ? '🎉 Passed!' : '❌ Not Passed'}</div>
          <div className="text-white/80">
            {score} / {total} correct
            {sectionScores ? ' — 70% per section (Type I: 84%)' : ' — passing score is 70%'}
          </div>
          {!passed && <p className="mt-3 text-white/70 text-sm">Keep practicing! Review the explanations below.</p>}
        </div>


        {/* Universal per-section breakdown */}
        {sectionScores && (
          <div className="mb-8 rounded-xl border border-gray-200 bg-white overflow-hidden">
            <h2 className="text-lg font-bold text-gray-900 px-5 py-4 border-b border-gray-100">Section Breakdown</h2>
            <div className="divide-y divide-gray-100">
              {sectionScores.map(s => (
                <div key={s.category} className="flex items-center justify-between px-5 py-3 gap-2 flex-wrap sm:flex-nowrap">
                  <div className="flex items-center gap-2">
                    <span className={`text-lg ${s.passed ? 'text-green-600' : 'text-red-500'}`}>
                      {s.passed ? '✓' : '✗'}
                    </span>
                    <span className="font-medium text-gray-900">{s.category}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500">{s.score}/{s.total}</span>
                    <span className={`text-sm font-semibold px-2 py-0.5 rounded-full ${s.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {s.percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
            {!passed && sectionScores.some(s => !s.passed) && (
              <div className="px-5 py-3 bg-red-50 text-sm text-red-700 border-t border-red-100">
                Focus on: {sectionScores.filter(s => !s.passed).map(s => s.category).join(', ')}
              </div>
            )}
          </div>
        )}

        {/* Share buttons */}
        <ShareButtons percentage={percentage} category={category} />

        {/* Action buttons */}
        <div className="flex gap-3 mb-1">
          <button
            onClick={onRetake}
            className="flex-1 text-center px-5 py-3 bg-blue-800 text-white rounded-xl font-semibold hover:bg-blue-900">
            Retake Test
          </button>
          <Link href="/dashboard"
            className="flex-1 text-center px-5 py-3 border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50">
            Dashboard
          </Link>
        </div>

        {/* Inline fail hint — no popup, beside action area */}
        {showHint ? (
          <div className="flex items-center gap-2 mb-8 px-1 py-2">
            <span className="text-amber-500 text-sm shrink-0">⚠</span>
            <p className="text-xs text-gray-500 flex-1">
              Failed {failCount}× on {category} — still not sure what&apos;s blocking you?{' '}
              <Link href="https://epa608practicetest.net/checkout.html"
                className="text-blue-700 font-medium hover:underline">
                Blind Spot Drill targets your exact weak subtopics
              </Link>
            </p>
            <button onClick={dismiss} className="text-gray-300 hover:text-gray-500 text-base leading-none shrink-0" aria-label="Dismiss">×</button>
          </div>
        ) : (
          <div className="mb-8" />
        )}

        {/* Question review */}
        <h2 className="text-lg font-bold text-gray-900 mb-4">Review Answers</h2>
        <div className="space-y-4">
          {results.map((r, i) => (
            <div key={r.questionId}
              className={`rounded-xl border-2 p-5 ${r.correct ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
              <div className="flex items-start gap-3">
                <span className={`text-lg mt-0.5 ${r.correct ? 'text-green-600' : 'text-red-500'}`}>
                  {r.correct ? '✓' : '✗'}
                </span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-gray-900">Q{i + 1}</p>
                    <ReportButton questionId={r.questionId} />
                  </div>
                  {!r.correct && (
                    <>
                      <p className="text-sm text-red-600 mb-1">Your answer: <span className="font-medium">{r.userAnswer ?? 'No answer'}</span></p>
                      <p className="text-sm text-green-700 mb-2">Correct: <span className="font-medium">{r.correctAnswer}</span></p>
                    </>
                  )}
                  {r.explanation && (
                    <p className="text-sm text-gray-600 bg-white/60 rounded-lg p-3 mt-2 max-h-[30vh] overflow-y-auto">{r.explanation}</p>
                  )}
                  {!r.correct && (
                    <ELI5Button
                      questionText={questionTextMap.get(r.questionId) ?? `Question ${i + 1}`}
                      correctAnswer={r.correctAnswer}
                      userAnswer={r.userAnswer}
                    />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
