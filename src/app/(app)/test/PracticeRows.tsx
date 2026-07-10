'use client'

// Practice-list rows + the "YOUR WEAKEST — DRILL THIS" floating tag (mockup
// PRACTICE frame). The weakest section comes from the DASHBOARD's local-first
// snapshot — readCache(`dashboard:${userId}`) — so this island costs zero
// network and zero DB. The cache read happens in useEffect (localStorage) to
// keep hydration clean: the first paint is plain rows, the tag decorates the
// weakest row right after mount. No cache / no weakest / not signed in →
// plain rows. Row hrefs are unchanged.

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { readCache } from '@/lib/local-first'
import type { DashboardData } from '@/lib/dashboard-data'

// Emoji chips share ONE soft slate/navy-tint square (approved skin — fewer hues).
const CATEGORIES = [
  { href: '/test/core', label: 'Core', desc: 'Fundamentals — required for every cert', emoji: '📋' },
  { href: '/test/type-1', label: 'Type I', desc: 'Small appliances', emoji: '❄️' },
  { href: '/test/type-2', label: 'Type II', desc: 'High-pressure systems', emoji: '🔧' },
  { href: '/test/type-3', label: 'Type III', desc: 'Low-pressure chillers', emoji: '🏭' },
  { href: '/test/universal', label: 'Universal', desc: 'All four sections combined', emoji: '⚡' },
]

export function PracticeRows({ userId }: { userId: string | null }) {
  const [weakest, setWeakest] = useState<{ category: string; avgPct: number } | null>(null)

  useEffect(() => {
    if (!userId) return
    const data = readCache<DashboardData>(`dashboard:${userId}`)
    const w = data?.readiness?.weakest
    // Same gate as the Home tile's "weakest" pill: only flag it while it
    // isn't ready yet.
    if (w && !w.ready) setWeakest({ category: w.category, avgPct: w.avgPct })
  }, [userId])

  return (
    <div className="space-y-2.5">
      {CATEGORIES.map(({ href, label, desc, emoji }) => {
        const isWeakest = weakest?.category === label
        return (
          <Link
            key={href}
            href={href}
            className={`relative flex items-center gap-3 bg-white rounded-xl px-4 py-3 min-h-[60px] transition-all hover:shadow-md ${
              isWeakest
                ? 'border-[1.5px] border-orange-500 hover:border-orange-600'
                : 'border border-gray-200 hover:border-blue-300'
            }`}
          >
            {/* Floating tag half over the card's top edge (mockup feat-tag) */}
            {isWeakest && (
              <span className="absolute -top-2.5 left-3 z-10 bg-orange-500 text-white font-mono text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded">
                Your weakest — drill this
              </span>
            )}
            <span
              className="w-10 h-10 rounded-[10px] bg-blue-50 border border-gray-200 flex items-center justify-center text-[19px] shrink-0"
              aria-hidden="true"
            >
              {emoji}
            </span>
            <span className="flex-1 min-w-0">
              <span className="block font-extrabold text-gray-900 leading-tight">{label}</span>
              <span className="block text-[13px] text-gray-500 leading-snug">
                {desc}
                {isWeakest && weakest && (
                  <>
                    {' '}· avg <b className="font-mono text-primary-900 tabular-nums">{weakest.avgPct}%</b>
                  </>
                )}
              </span>
            </span>
            <ChevronRight size={18} className="text-gray-400 shrink-0" aria-hidden />
          </Link>
        )
      })}
    </div>
  )
}
