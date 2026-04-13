'use client'

import Link from 'next/link'
import { BookOpen, Clock } from 'lucide-react'

export default function ModeSelector({ slug, category }: { slug: string; category: string }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">{category}</h1>
        <p className="text-gray-600 text-center mb-8">How do you want to study?</p>

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
