'use client'
import { useState } from 'react'
import type { SessionResult, QuestionPublic } from '@/types'
import Link from 'next/link'
import { ReportButton } from './ReportButton'

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
          className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-purple-100 text-purple-700 hover:bg-purple-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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

export function ResultView({ result, category, questions }: {
  result: SessionResult
  category: string
  questions: QuestionPublic[]
}) {
  const { score, total, percentage, passed, results, sectionScores } = result
  const slug = SLUG_MAP[category] ?? category.toLowerCase()

  const questionTextMap = new Map(questions.map(q => [q.id, q.question]))

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Score card */}
        <div className={`rounded-2xl p-8 text-center mb-8 ${passed ? 'bg-green-600' : 'bg-red-500'} text-white`}>
          <div className="text-6xl font-bold mb-2">{percentage}%</div>
          <div className="text-2xl font-semibold mb-1">{passed ? '🎉 Passed!' : '❌ Not Passed'}</div>
          <div className="text-white/80">
            {score} / {total} correct
            {sectionScores ? ' — must pass each section at 72%' : ' — passing score is 70%'}
          </div>
          {!passed && <p className="mt-3 text-white/70 text-sm">Keep practicing! Review the explanations below.</p>}
        </div>

        {/* Universal per-section breakdown */}
        {sectionScores && (
          <div className="mb-8 rounded-xl border border-gray-200 bg-white overflow-hidden">
            <h2 className="text-lg font-bold text-gray-900 px-5 py-4 border-b border-gray-100">Section Breakdown</h2>
            <div className="divide-y divide-gray-100">
              {sectionScores.map(s => (
                <div key={s.category} className="flex items-center justify-between px-5 py-3">
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

        {/* Action buttons */}
        <div className="flex gap-3 mb-8">
          <button
            onClick={() => window.location.href = `/test/${slug}`}
            className="flex-1 text-center px-5 py-3 bg-blue-800 text-white rounded-xl font-semibold hover:bg-blue-900">
            Retake Test
          </button>
          <Link href="/dashboard"
            className="flex-1 text-center px-5 py-3 border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50">
            Dashboard
          </Link>
        </div>

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
                    <p className="text-sm text-gray-600 bg-white/60 rounded-lg p-3 mt-2">{r.explanation}</p>
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
