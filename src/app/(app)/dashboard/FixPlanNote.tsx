'use client'

// Needs-work "fix plan" note — a lightweight bottom sheet (mobile) / centered
// card (desktop) opened from the 💡 FIX PLAN chip on a flagged section tile.
// The note is fully deterministic: it's built from the numbers already on the
// tile (readiness %, Study Path levels, practiced count) — NO api call.

import { useEffect } from 'react'
import Link from 'next/link'
import { X, ArrowRight } from 'lucide-react'

export type FixPlanData = {
  category: string
  readinessPct: number
  mastered: number
  total: number
  /** undefined = practiced count unavailable (RPC failed) — omit the line */
  practiced?: number
}

export function FixPlanNote({
  plan,
  onClose,
}: {
  plan: FixPlanData
  onClose: () => void
}) {
  const { category, readinessPct, mastered, total, practiced } = plan
  const levelsLeft = Math.max(0, total - mastered)

  // Escape closes (focus trap intentionally skipped — sheet is dismissible
  // via backdrop, X, and Escape).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const askTutor = () => {
    const prompt = `My ${category} readiness is ${readinessPct}% but I need 72% to pass. I've mastered ${mastered}/${total} Study Path levels. What should I focus on to fix this fastest?`
    window.dispatchEvent(new CustomEvent('epa608:open-tutor', { detail: { prompt } }))
    onClose()
  }

  return (
    <>
      {/* Backdrop — tap to dismiss */}
      <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose} aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${category} — fix plan`}
        className="fixed z-50 bg-white border border-line shadow-card
          inset-x-0 bottom-0 rounded-t-2xl
          sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[22rem] sm:rounded-xl"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h2 className="font-serif text-lg font-black text-gray-900 leading-tight">
              {category} — fix plan
            </h2>
            <button
              onClick={onClose}
              className="shrink-0 -mt-1 -mr-1 p-2.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
              aria-label="Close fix plan"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>

          {/* Deterministic note — numbers mono ink */}
          <p className="text-sm text-steel leading-relaxed mb-1.5">
            You&apos;re at{' '}
            <span className="font-mono font-bold text-primary-900">{readinessPct}%</span> —{' '}
            <span className="font-mono font-bold text-primary-900">72%</span> needed. Finish{' '}
            <span className="font-mono font-bold text-primary-900">{levelsLeft}</span> more{' '}
            {levelsLeft === 1 ? 'level' : 'levels'}
            {practiced !== undefined && (
              <>
                {' '}(
                <span className="font-mono font-bold text-primary-900">{practiced}</span>{' '}
                questions practiced so far)
              </>
            )}
            .
          </p>
          <ol className="text-sm text-steel leading-relaxed list-decimal pl-4 mb-4 space-y-0.5">
            <li>Study {category} levels in the Study Path.</li>
            <li>Review your missed questions in Progress → Mistakes.</li>
            <li>
              Retake a <span className="font-mono font-bold text-primary-900">25</span>-question
              practice test.
            </li>
          </ol>

          <button
            onClick={askTutor}
            className="w-full min-h-[44px] px-4 py-2.5 rounded-[7px] font-bold text-sm text-white transition-opacity hover:opacity-90"
            style={{ background: '#F97316' }}
          >
            Ask AI Tutor <ArrowRight size={15} className="inline align-[-2px]" aria-hidden="true" />
          </button>
          <div className="flex gap-2 mt-2">
            <Link
              href={`/learn?section=${encodeURIComponent(category)}`}
              onClick={onClose}
              className="flex-1 min-h-[44px] inline-flex items-center justify-center px-3 py-2.5 rounded-[7px] border border-line text-sm font-semibold text-primary-900 hover:bg-blue-50 transition-colors"
            >
              Study now
            </Link>
            <Link
              href="/progress"
              onClick={onClose}
              className="flex-1 min-h-[44px] inline-flex items-center justify-center px-3 py-2.5 rounded-[7px] border border-line text-sm font-semibold text-primary-900 hover:bg-blue-50 transition-colors"
            >
              Review mistakes
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
