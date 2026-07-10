import { getCurrentUser } from '@/lib/supabase/auth'
import { PracticeRows } from './PracticeRows'

// Practice index — the mobile "Practice" tab lands here. Pick a category,
// then the category page offers Practice (untimed) or Exam (timed) mode.
// Server component with ZERO DB awaits: getCurrentUser() verifies the JWT
// locally (getClaims) and its id only feeds the client-side weakest-tag
// cache read inside PracticeRows.
export default async function PracticeIndexPage() {
  const user = await getCurrentUser()

  return (
    <div className="min-h-full bg-gray-50 p-4 md:p-8">
      <div className="max-w-lg mx-auto">
        <p className="font-mono text-[10px] font-semibold text-gray-400 uppercase tracking-[0.12em] mb-1.5">
          Real exam format · A–D
        </p>
        <h1 className="font-serif text-2xl sm:text-3xl font-black text-gray-900 mb-1">Practice Test</h1>
        <p className="text-gray-600 mb-6">Pick a section, then choose Practice or Exam mode.</p>

        <PracticeRows userId={user?.id ?? null} />

        {/* Exam-rules footer card (mockup PRACTICE frame) */}
        <div className="mt-4 flex items-start gap-2.5 bg-white border border-gray-200 rounded-xl px-4 py-3.5">
          <span className="text-base shrink-0" aria-hidden="true">⏱</span>
          <p className="text-[13px] text-gray-500 leading-relaxed">
            <b className="text-gray-900">Exam mode</b> = 25 questions ·{' '}
            <span className="font-mono tabular-nums">30:00</span> timer ·{' '}
            <span className="font-mono tabular-nums">72s</span>/question pace. Same rules as test day.
          </p>
        </div>
      </div>
    </div>
  )
}
