'use client'

import Link from 'next/link'
import { Settings, LogOut, Zap } from 'lucide-react'
import { getTierLabel } from '@/lib/tier'
import type { Tier } from '@/types'

type AccountSheetProps = {
  open: boolean
  onClose: () => void
  username: string
  tier: Tier
}

// Mobile account bottom sheet — opened from the avatar in the top bar.
// Always mounted so the slide-up transition can play; hidden via translate-y.
export default function AccountSheet({ open, onClose, username, tier }: AccountSheetProps) {
  const isPro = tier !== 'free'

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
        <div className="flex items-center gap-3 pb-4 border-b border-gray-100 dark:border-gray-800 mb-1">
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
            style={{ color: '#e85d04' }}
          >
            <Zap size={20} className="shrink-0" aria-hidden />
            Upgrade to Pro · $14.99
          </Link>
        )}

        <form action="/auth/signout" method="post">
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
