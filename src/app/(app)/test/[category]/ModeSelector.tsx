'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { BookOpen, Clock, AlertTriangle } from 'lucide-react'

function getCorePassStatus(): boolean {
  try {
    const data = JSON.parse(localStorage.getItem('epa608CorePass') || 'null')
    return data?.passed === true
  } catch { return false }
}

export default function ModeSelector({ slug, category }: { slug: string; category: string }) {
  const [showGate, setShowGate] = useState(false)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    // Only gate non-Core categories
    if (slug !== 'core') {
      const passed = getCorePassStatus()
      if (!passed) setShowGate(true)
    }
    setChecked(true)
  }, [slug])

  if (!checked) return null

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">{category}</h1>
        <p className="text-gray-600 text-center mb-8">How do you want to study?</p>

        {/* Core-first soft gate */}
        {showGate && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-800 text-sm mb-1">Core First — Recommended</p>
                <p className="text-xs text-amber-700 leading-relaxed mb-3">
                  On the real EPA 608 exam, you must pass Core to earn any certification.
                  Core covers the fundamentals that {category} builds on.
                </p>
                <div className="flex gap-2">
                  <Link href="/test/core?mode=practice"
                    className="px-4 py-2 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700 min-h-[40px] inline-flex items-center">
                    Practice Core First
                  </Link>
                  <button onClick={() => setShowGate(false)}
                    className="px-4 py-2 bg-white border border-amber-300 text-amber-700 rounded-lg text-xs font-medium hover:bg-amber-50 min-h-[40px]">
                    I know Core — Continue
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {/* Practice Mode */}
          <Link
            href={`/test/${slug}?mode=practice`}
            className="block w-full rounded-xl border-2 border-green-200 bg-white p-5 hover:border-green-400 hover:shadow-md transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-green-50 flex items-center justify-center shrink-0 group-hover:bg-green-100">
                <BookOpen size={28} className="text-green-600" />
              </div>
              <div>
                <p className="font-bold text-lg text-gray-900">Practice</p>
                <p className="text-sm text-gray-600">No timer. See answers immediately after each question. Best for learning.</p>
              </div>
            </div>
          </Link>

          {/* Timed Test */}
          <Link
            href={`/test/${slug}?mode=test`}
            className="block w-full rounded-xl border-2 border-blue-200 bg-white p-5 hover:border-blue-400 hover:shadow-md transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 group-hover:bg-blue-100">
                <Clock size={28} className="text-blue-600" />
              </div>
              <div>
                <p className="font-bold text-lg text-gray-900">Timed Test</p>
                <p className="text-sm text-gray-600">
                  {category === 'Universal'
                    ? '100 questions (25 per section), ~2 hours. Must pass each section: 70% (Type I: 84%).'
                    : `25 questions, 30 minutes. ${category === 'Type I' ? 'Pass: 84% (open-book rule).' : 'Pass: 70%.'}`
                  } Simulates the real exam.
                </p>
              </div>
            </div>
          </Link>
        </div>

        <div className="mt-6 text-center">
          <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
