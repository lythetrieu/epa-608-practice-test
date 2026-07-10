'use client'

import Link from 'next/link'
import { BookOpen, Clock, Lock } from 'lucide-react'

export default function ModeSelector({ slug, category, isPro }: { slug: string; category: string; isPro: boolean }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">{category}</h1>
        <p className="text-gray-600 text-center mb-8">How do you want to study?</p>

        <div className="space-y-3">
          {/* Practice Mode — always free */}
          <Link
            href={`/test/${slug}?mode=practice`}
            className="block w-full rounded-xl border-2 border-line bg-white shadow-card p-5 hover:border-blue-300 hover:shadow-md transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 group-hover:bg-blue-100">
                <BookOpen size={28} className="text-blue-800" />
              </div>
              <div>
                <p className="font-bold text-lg text-gray-900">Practice</p>
                <p className="text-sm text-steel">No timer. See answers immediately after each question. Best for learning.</p>
              </div>
            </div>
          </Link>

          {/* Timed Simulation — Pro only */}
          {isPro ? (
            <Link
              href={`/test/${slug}?mode=test`}
              className="block w-full rounded-xl border-2 border-line bg-white shadow-card p-5 hover:border-blue-300 hover:shadow-md transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 group-hover:bg-blue-100">
                  <Clock size={28} className="text-blue-800" />
                </div>
                <div>
                  <p className="font-bold text-lg text-gray-900">Timed Simulation</p>
                  <p className="text-sm text-steel">
                    {category === 'Universal'
                      ? '100 questions, ~2 hours. No hints. Results at the end. Mirrors the real exam.'
                      : `25 questions, 30 minutes. No hints. Results at the end. ${category === 'Type I' ? 'Pass: 84%.' : 'Pass: 70%.'}`
                    }
                  </p>
                </div>
              </div>
            </Link>
          ) : (
            <div className="relative block w-full rounded-xl border-2 border-line bg-white shadow-card p-5 opacity-75">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                  <Clock size={28} className="text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-bold text-lg text-gray-500">Timed Simulation</p>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">
                      <Lock size={10} /> Pro
                    </span>
                  </div>
                  <p className="text-sm text-gray-400">
                    {category === 'Universal'
                      ? '100 questions, ~2 hours. No hints. Results at the end. Mirrors the real exam.'
                      : `25 questions, 30 minutes. No hints. Results at the end.`
                    }
                  </p>
                </div>
              </div>
              <Link
                href={`/checkout.html`}
                className="mt-4 flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-blue-800 text-white rounded-[7px] text-sm font-semibold hover:bg-blue-900 transition-colors"
              >
                Unlock Timed Simulation — $14.99 lifetime
              </Link>
            </div>
          )}
        </div>

        <div className="mt-6 text-center">
          <Link href="/learn" className="text-sm text-steel hover:text-gray-700">
            ← Back to Study Path
          </Link>
        </div>
      </div>
    </div>
  )
}
