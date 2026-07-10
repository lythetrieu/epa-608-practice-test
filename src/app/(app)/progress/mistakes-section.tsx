'use client'

// "Mistakes" section for the Progress page: the exact questions the user is
// getting wrong. Two layers of answer to "where am I failing?":
//   1. Category chips  → which SECTION the mistakes cluster in
//   2. Question cards  → which EXACT QUESTIONS keep going wrong
// Everything here is presentational — aggregation lives in mistakes-server.ts.

import Link from 'next/link'
import { useState } from 'react'
import { getSubtopicLabel } from '@/lib/subtopics'

// ── Local copy of the /api/app/progress mistakes contract ────────────────────
// Typed here (not imported from the API route) so the UI compiles independently.
export type MistakeCategorySummary = {
  category: string
  wrongQuestions: number
  seenQuestions: number
}
export type MistakeQuestion = {
  question_id: string
  question: string
  category: string
  subtopic_id: string
  attempts: number
  wrongCount: number
  /** false = still missing it, true = fixed on the latest attempt */
  lastCorrect: boolean
  correctAnswer: string | null
  explanation: string | null
}
export type MistakesData = {
  byCategory: MistakeCategorySummary[]
  /** ≤12 entries, still-failing first. */
  questions: MistakeQuestion[]
}

/** One expandable question card — tap to reveal the answer + explanation. */
function MistakeCard({ q }: { q: MistakeQuestion }) {
  const [open, setOpen] = useState(false)
  const stillMissing = q.lastCorrect === false

  return (
    <div className="bg-white rounded-xl border border-line shadow-card px-4 py-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full text-left min-h-[44px]"
      >
        <span
          className={`inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded-full mb-1.5 ${
            stillMissing ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'
          }`}
        >
          {stillMissing ? 'still missing' : 'fixed last try'}
        </span>
        <p className="text-sm font-medium text-gray-800 line-clamp-2">{q.question}</p>
        <p className="text-xs text-steel mt-1">
          &#x2717; {q.wrongCount}/{q.attempts} attempts · {getSubtopicLabel(q.subtopic_id)} ·{' '}
          {q.category}
        </p>
      </button>

      {open && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          {q.correctAnswer && (
            <p className="text-sm font-medium text-green-700">Answer: {q.correctAnswer}</p>
          )}
          {q.explanation && <p className="text-sm text-gray-600 mt-1">{q.explanation}</p>}
        </div>
      )}

      <div className="flex gap-2 mt-2">
        <Link
          href={`/learn?section=${encodeURIComponent(q.category)}`}
          className="text-xs px-3 py-1.5 rounded-[7px] bg-blue-50 text-blue-700 font-medium hover:bg-blue-100"
        >
          Study This Topic
        </Link>
      </div>
    </div>
  )
}

export function MistakesSection({ mistakes }: { mistakes: MistakesData }) {
  const { byCategory, questions } = mistakes
  const allClean = byCategory.every((c) => c.wrongQuestions === 0)

  // Nothing wrong anywhere and no question cards — celebrate instead of chips.
  if (questions.length === 0 && allClean) {
    return (
      <section className="mb-6">
        <h2 className="font-mono text-[10px] font-semibold text-steel uppercase tracking-[0.12em] mb-3">
          Mistakes — exact questions you&apos;re missing
        </h2>
        <p className="text-xs text-steel">No wrong answers in your recent practice 🎉</p>
      </section>
    )
  }

  return (
    <section className="mb-6">
      <h2 className="font-mono text-[10px] font-semibold text-steel uppercase tracking-[0.12em] mb-3">
        Mistakes — exact questions you&apos;re missing
      </h2>

      {/* ── Which SECTION the mistakes cluster in ─────────────────────── */}
      {byCategory.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {byCategory.map((c) => {
            const hot = c.seenQuestions > 0 && c.wrongQuestions / c.seenQuestions >= 0.3
            return (
              <span
                key={c.category}
                className={`rounded-full text-[11px] font-medium px-2.5 py-1 ${
                  hot ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {c.category} · {c.wrongQuestions}/{c.seenQuestions} wrong
              </span>
            )
          })}
        </div>
      )}

      {/* ── Which EXACT QUESTIONS keep going wrong ────────────────────── */}
      {questions.length > 0 && (
        <div className="space-y-2">
          {questions.map((q) => (
            <MistakeCard key={q.question_id} q={q} />
          ))}
        </div>
      )}
    </section>
  )
}
