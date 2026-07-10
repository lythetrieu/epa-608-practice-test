import { Timer } from 'lucide-react'
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
        <p className="font-mono text-[10px] font-semibold text-steel uppercase tracking-[0.12em] mb-1.5">
          Real exam format · A–D
        </p>
        <h1 className="font-serif text-2xl sm:text-3xl font-black text-gray-900 mb-0.5">Practice Test</h1>
        <p className="text-gray-600 mb-4">Pick a section, then choose Practice or Exam mode.</p>

        <PracticeRows userId={user?.id ?? null} />

        {/* Exam-rules footer card (mockup PRACTICE frame) — the timer icon is
            the screen's standing orange accent (never a second orange button) */}
        <div className="mt-3 flex items-start gap-2.5 bg-white border border-line rounded-xl shadow-card px-4 py-2.5">
          <Timer size={18} className="text-orange-500 shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-[13px] text-steel leading-snug">
            <b className="text-gray-900">Exam mode</b> = 25 questions ·{' '}
            <span className="font-mono tabular-nums text-primary-900">30:00</span> timer ·{' '}
            <span className="font-mono tabular-nums text-primary-900">72s</span>/question pace. Same rules as test day.
          </p>
        </div>
      </div>
    </div>
  )
}
