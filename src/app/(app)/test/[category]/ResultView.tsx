'use client'
import type { SessionResult } from '@/types'
import Link from 'next/link'

export function ResultView({ result, category }: { result: SessionResult; category: string }) {
  const { score, total, percentage, passed, results } = result

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Score card */}
        <div className={`rounded-2xl p-8 text-center mb-8 ${passed ? 'bg-green-600' : 'bg-red-500'} text-white`}>
          <div className="text-6xl font-bold mb-2">{percentage}%</div>
          <div className="text-2xl font-semibold mb-1">{passed ? '🎉 Passed!' : '❌ Not Passed'}</div>
          <div className="text-white/80">{score} / {total} correct — passing score is 70%</div>
          {!passed && <p className="mt-3 text-white/70 text-sm">Keep practicing! Review the explanations below.</p>}
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 mb-8">
          <Link href={`/test/${category.toLowerCase().replace(' ', '-')}`}
            className="flex-1 text-center px-5 py-3 bg-blue-800 text-white rounded-xl font-semibold hover:bg-blue-900">
            Retake Test
          </Link>
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
                  <p className="font-medium text-gray-900 mb-2">Q{i + 1}</p>
                  {!r.correct && (
                    <>
                      <p className="text-sm text-red-600 mb-1">Your answer: <span className="font-medium">{r.userAnswer ?? 'No answer'}</span></p>
                      <p className="text-sm text-green-700 mb-2">Correct: <span className="font-medium">{r.correctAnswer}</span></p>
                    </>
                  )}
                  {r.explanation && (
                    <p className="text-sm text-gray-600 bg-white/60 rounded-lg p-3 mt-2">{r.explanation}</p>
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
