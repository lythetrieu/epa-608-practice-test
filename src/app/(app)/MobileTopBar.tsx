'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import type { Tier } from '@/types'
import AccountSheet from './AccountSheet'

type MobileTopBarProps = {
  email: string
  tier: Tier
}

// The 4 tab roots — no back button on these (the tab bar is the navigation).
const TAB_ROOTS = ['/dashboard', '/learn', '/test', '/progress']

// Page title by route prefix (first match wins — order matters).
const TITLES: Array<[string, string]> = [
  ['/dashboard',  'Home'],
  ['/learn',      'Study Path'],
  ['/test',       'Practice Test'],
  ['/progress',   'Progress'],
  ['/settings',   'Settings'],
  ['/tutor',      'AI Tutor'],
  ['/flashcards', 'Flashcards'],
  ['/history',    'History'],
  ['/podcast',    'Podcast'],
  ['/practice',   'Practice'],
  ['/admin',      'Admin'],
  ['/welcome',    'Welcome'],
]

function titleFor(pathname: string | null): string {
  if (!pathname) return 'EPA 608'
  const hit = TITLES.find(([prefix]) => pathname === prefix || pathname.startsWith(prefix + '/'))
  return hit ? hit[1] : 'EPA 608'
}

export default function MobileTopBar({ email, tier }: MobileTopBarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [sheetOpen, setSheetOpen] = useState(false)

  // Close the account sheet on route change + lock body scroll while open
  useEffect(() => { setSheetOpen(false) }, [pathname])
  useEffect(() => {
    document.body.style.overflow = sheetOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [sheetOpen])

  const username = email.split('@')[0]
  const isTabRoot = TAB_ROOTS.includes(pathname ?? '')

  return (
    <>
      <header
        className="md:hidden fixed top-0 inset-x-0 z-40 flex items-center gap-1 h-14 px-2 border-b border-white/10"
        style={{ background: '#001d57' }}
      >
        {/* Back — sub-routes only; tab roots navigate via the bottom tab bar */}
        {!isTabRoot && (
          <button
            onClick={() => router.back()}
            aria-label="Back"
            className="w-11 h-11 flex items-center justify-center text-white/80 hover:text-white rounded-lg shrink-0"
          >
            <ArrowLeft size={22} aria-hidden />
          </button>
        )}

        <h1 className={`flex-1 text-white font-semibold text-[17px] truncate ${isTabRoot ? 'pl-2' : ''}`}>
          {titleFor(pathname)}
        </h1>

        {/* Avatar → account sheet */}
        <button
          onClick={() => setSheetOpen(true)}
          aria-label="Account menu"
          aria-expanded={sheetOpen}
          className="w-11 h-11 flex items-center justify-center shrink-0"
        >
          <span className="w-8 h-8 rounded-full bg-white/20 text-white text-[13px] font-semibold flex items-center justify-center">
            {username.charAt(0).toUpperCase()}
          </span>
        </button>
      </header>

      <AccountSheet open={sheetOpen} onClose={() => setSheetOpen(false)} username={username} tier={tier} />
    </>
  )
}
