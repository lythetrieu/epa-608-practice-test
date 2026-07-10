'use client'
import { useState, useEffect } from 'react'
import type { SessionResult, QuestionPublic } from '@/types'
import Link from 'next/link'
import { ReportButton } from '@/components/quiz/ReportButton'
import { MULTI_SEP } from '@/lib/multi'
import type { QuizOutcome } from '@/components/quiz/types'
import { computePacing, formatSecs } from '@/components/quiz/pacing'

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

    if (next >= 2 && now > dismissedUntil) setShowHint(true)
  }, [category, passed])

  function dismiss() {
    setShowHint(false)
    localStorage.setItem(`epa608_failhint_dismissed`, String(Date.now() + 24 * 60 * 60 * 1000))
  }

  return { showHint, failCount, dismiss }
}

export function ResultView({ result, category, questions, onRetake, outcome = null, budgetPerQMs = 72_000 }: {
  result: SessionResult
  category: string
  questions: QuestionPublic[]
  onRetake: () => void
  /** Client-side quiz outcome — the only source of per-question timing. */
  outcome?: QuizOutcome | null
  /** Exam pace budget per question in ms (per-test timeLimitSecs / questionCount). */
  budgetPerQMs?: number
}) {
  const { score, total, percentage, passed, results, sectionScores } = result
  const { showHint, failCount, dismiss } = useFailStreak(category, passed)

  const wrongResults = results.filter(r => !r.correct)
  const questionTextMap = new Map(questions.map(q => [q.id, q.question]))

  // ── Pacing (client-side outcome, works on both submit flows) ──
  const pacing = outcome ? computePacing(outcome.answers, budgetPerQMs, total) : null
  const correctMap = new Map(results.map(r => [r.questionId, r.correct]))
  const slowest = outcome
    ? outcome.answers
        .filter(a => a.timeMs != null)
        .sort((a, b) => (b.timeMs ?? 0) - (a.timeMs ?? 0))
        .slice(0, 3)
    : []

  // Share text — one small link only
  const shareText = encodeURIComponent(`I scored ${percentage}% on the EPA 608 ${category} Practice Test! Free prep:`)
  const shareUrl = encodeURIComponent('https://epa608practicetest.net')

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-10 px-3 sm:px-4">
      <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">

        {/* ── Score card ── */}
        <div className={`rounded-2xl p-5 sm:p-8 text-center ${passed ? 'bg-green-600' : 'bg-red-500'} text-white`}>
          <div className="text-5xl sm:text-6xl font-bold font-mono mb-1">{percentage}%</div>
          <div className="text-xl font-semibold mb-1">{passed ? 'Passed' : 'Not Passed'}</div>
          <div className="text-white/75 text-sm">
            {score}/{total} correct · Pass mark: 72% per section, same as the real exam
          </div>
          {/* Share — single discreet link */}
          <a
            href={`https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`}
            target="_blank" rel="noopener"
            className="inline-block mt-3 text-white/60 hover:text-white text-xs underline underline-offset-2"
          >
            Share on X
          </a>
        </div>

        {/* ── Universal section breakdown ── */}
        {sectionScores && (
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="divide-y divide-gray-100">
              {sectionScores.map(s => (
                <div key={s.category} className="flex items-center justify-between px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className={`text-base ${s.passed ? 'text-green-500' : 'text-red-400'}`}>
                      {s.passed ? '✓' : '✗'}
                    </span>
                    <span className="text-sm font-medium text-gray-800">{s.category}</span>
                  </div>
                  <span className="text-sm font-bold font-mono text-primary-900">
                    {s.percentage}% <span className="font-normal text-gray-400 text-xs">({s.score}/{s.total})</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Pacing ── */}
        {pacing && (
          <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Pacing</h2>
            <div className="flex items-baseline justify-between gap-3 mb-1">
              <span className="text-sm text-gray-600">Your average</span>
              <span className="text-sm font-bold font-mono text-primary-900 tabular-nums">{formatSecs(pacing.avgMs)}/question</span>
            </div>
            <div className="flex items-baseline justify-between gap-3 mb-2">
              <span className="text-sm text-gray-600">Exam pace</span>
              <span className="text-sm text-gray-500 font-mono tabular-nums">{Math.round(pacing.budgetMs / 1000)}s/question</span>
            </div>
            <p className={`text-xs font-medium ${pacing.spareMs >= 0 ? 'text-green-600' : 'text-amber-600'}`}>
              {pacing.verdict}
            </p>
            {slowest.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Slowest questions</p>
                <div className="space-y-1.5">
                  {slowest.map(a => {
                    const wasCorrect = correctMap.get(a.questionId)
                    return (
                      <div key={a.questionId} className="flex items-center gap-2 text-xs">
                        <span className={`shrink-0 ${wasCorrect ? 'text-green-500' : 'text-red-400'}`} aria-label={wasCorrect ? 'Correct' : 'Wrong'}>
                          {wasCorrect ? '✓' : '✗'}
                        </span>
                        <span className="text-gray-600 truncate flex-1 min-w-0">
                          {questionTextMap.get(a.questionId) ?? 'Question'}
                        </span>
                        <span className="font-semibold font-mono text-primary-900 tabular-nums shrink-0">{formatSecs(a.timeMs ?? 0)}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Next step CTA ── */}
        {(() => {
          const NEXT_MAP: Record<string, string> = {
            'Core': '/test/type-1', 'Type I': '/test/type-2',
            'Type II': '/test/type-3', 'Type III': '/test/universal',
          }
          const nextHref = NEXT_MAP[category]
          const nextLabel = NEXT_MAP[category]?.replace('/test/', '').replace('-', ' ').replace(/^\w/, c => c.toUpperCase())
          // Next-step CTA = the result screen's ONE orange (only one renders)
          if (passed && nextHref) {
            return (
              <Link href={nextHref}
                className="block text-center py-3 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition-colors">
                Next: {nextLabel} →
              </Link>
            )
          }
          if (!passed) {
            return (
              <Link href="/learn"
                className="block text-center py-3 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition-colors">
                Study {category} in Study Path before retaking →
              </Link>
            )
          }
          return null
        })()}

        {/* ── Actions ── */}
        <div className="flex gap-3">
          <button
            onClick={onRetake}
            className="flex-1 py-3 bg-blue-800 text-white rounded-xl font-semibold hover:bg-blue-900 transition-colors">
            Retake Test
          </button>
          <Link href="/dashboard"
            className="flex-1 text-center py-3 border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors">
            Dashboard
          </Link>
        </div>

        {/* ── Fail streak hint ── */}
        {showHint && (
          <div className="flex items-center gap-2 px-1">
            <span className="text-amber-500 text-sm shrink-0">⚠</span>
            <p className="text-xs text-gray-500 flex-1">
              Failed {failCount}× on {category} —{' '}
              <Link href={`/checkout.html`}
                className="text-blue-700 font-medium hover:underline">
                Blind Spot Drill targets your exact weak spots
              </Link>
            </p>
            <button onClick={dismiss} className="text-gray-300 hover:text-gray-500 text-base leading-none shrink-0" aria-label="Dismiss">×</button>
          </div>
        )}

        {/* ── Wrong answers only ── */}
        {wrongResults.length === 0 ? (
          <div className="text-center py-6 text-green-600 font-semibold">
            Perfect — all {total} correct!
          </div>
        ) : (
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              {wrongResults.length} to review
            </h2>
            <div className="space-y-3">
              {wrongResults.map((r, i) => {
                const qText = questionTextMap.get(r.questionId) ?? `Question ${i + 1}`
                const qNum = results.findIndex(x => x.questionId === r.questionId) + 1
                return (
                  <div key={r.questionId} className="rounded-xl border-2 border-red-200 bg-red-50 p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-sm font-medium text-gray-900 leading-snug flex-1">Q{qNum}. {qText}</p>
                      <ReportButton questionId={r.questionId} />
                    </div>
                    <p className="text-xs text-red-600 mb-0.5">Your answer: <span className="font-semibold">{(r.userAnswer ?? 'No answer').split(MULTI_SEP).join(', ')}</span></p>
                    <p className="text-xs text-green-700 mb-2">Correct: <span className="font-semibold">{(r.correctAnswer ?? '').split(MULTI_SEP).join(', ')}</span></p>
                    {r.explanation && (
                      <p className="text-xs text-gray-600 bg-white/70 rounded-lg p-2.5 leading-relaxed">{r.explanation}</p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
