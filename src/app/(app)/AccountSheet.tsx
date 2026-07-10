'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Settings, LogOut, Zap } from 'lucide-react'
import { clearLocalFirstCache, readCache } from '@/lib/local-first'
import { getTierLabel } from '@/lib/tier'
import { RankInsignia } from '@/components/gamification/BadgeIcons'
// Type-only import — erased at compile time, pulls no server code.
import type { Achievements } from '@/lib/achievements-server'
import type { Tier } from '@/types'

type AccountSheetProps = {
  open: boolean
  onClose: () => void
  username: string
  tier: Tier
  userId: string
}

// Mobile account bottom sheet — opened from the avatar in the top bar.
// Always mounted so the slide-up transition can play; hidden via translate-y.
export default function AccountSheet({ open, onClose, username, tier, userId }: AccountSheetProps) {
  const isPro = tier !== 'free'

  // Rank line reads the dashboard's local-first snapshot (no extra fetch).
  // Re-read on each open so it tracks the latest cached payload; missing
  // cache or a pre-achievements snapshot → the row simply doesn't render.
  const [achievements, setAchievements] = useState<Achievements | null>(null)
  useEffect(() => {
    if (!open) return
    const snap = readCache<{ achievements?: Achievements | null }>(`dashboard:${userId}`)
    setAchievements(snap?.achievements ?? null)
  }, [open, userId])

  return (
    <>
      {/* Scrim */}
      <div
        aria-hidden
        onClick={onClose}
        className={`md:hidden fixed inset-0 z-50 bg-black/45 transition-opacity duration-200 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-label="Account"
        aria-hidden={!open}
        className={`md:hidden fixed inset-x-0 bottom-0 z-50 bg-white dark:bg-gray-900 rounded-t-2xl px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] transform transition-transform duration-200 ease-out ${
          open ? 'translate-y-0' : 'translate-y-full pointer-events-none'
        }`}
      >
        <div className="w-10 h-1 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto my-3" aria-hidden />

        {/* User row */}
        <div className="flex items-center gap-3 pb-4 border-b border-line dark:border-gray-800 mb-1">
          <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-semibold shrink-0" style={{ background: '#001d57' }}>
            {username.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{username}</p>
            <span className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-full ${
              isPro ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
            }`}>
              {getTierLabel(tier)}
            </span>
          </div>
        </div>

        {/* Rank + XP — from the cached dashboard snapshot; hidden when absent */}
        {achievements && (
          <Link
            href="/progress"
            onClick={onClose}
            className="flex items-center gap-3 px-1 py-3 min-h-[44px] text-sm font-semibold text-gray-800 dark:text-gray-200 rounded-xl"
          >
            <span className="w-5 shrink-0 flex justify-center" aria-hidden>
              <RankInsignia rank={achievements.rank.id} size={20} />
            </span>
            {achievements.rank.label}
            <span className="ml-auto font-mono text-xs font-bold text-primary-900 dark:text-white tabular-nums">
              {achievements.xp.toLocaleString()} XP
            </span>
          </Link>
        )}

        <Link
          href="/settings"
          onClick={onClose}
          className="flex items-center gap-3 px-1 py-3 min-h-[44px] text-sm font-semibold text-gray-800 dark:text-gray-200 rounded-xl"
        >
          <Settings size={20} className="text-gray-500 shrink-0" aria-hidden />
          Settings
        </Link>

        {!isPro && (
          <Link
            href="/checkout.html"
            onClick={onClose}
            className="flex items-center gap-3 px-3 py-3 min-h-[44px] text-sm font-semibold rounded-xl bg-orange-50"
            style={{ color: '#F97316' }}
          >
            <Zap size={20} className="shrink-0" aria-hidden />
            Upgrade to Pro · $14.99
          </Link>
        )}

        {/* Wipe local-first snapshots before the sign-out POST navigates away —
            the next account on this device must never see this user's data. */}
        <form action="/auth/signout" method="post" onSubmit={() => clearLocalFirstCache()}>
          <button
            type="submit"
            className="w-full flex items-center gap-3 px-1 py-3 min-h-[44px] text-sm font-semibold text-red-600 text-left rounded-xl"
          >
            <LogOut size={20} className="shrink-0" aria-hidden />
            Sign Out
          </button>
        </form>
      </div>
    </>
  )
}
