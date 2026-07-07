'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Map, ClipboardList, BarChart3 } from 'lucide-react'
import { prefetchLocalFirst } from '@/lib/local-first'

// The 4 primary mobile tabs. A tab is active on its root route and any sub-route
// (e.g. /progress/weak-spots → Progress, /test/core → Practice).
const TABS = [
  { href: '/dashboard', label: 'Home',     icon: Home },
  { href: '/learn',     label: 'Study Path', icon: Map },
  { href: '/test',      label: 'Practice', icon: ClipboardList },
  { href: '/progress',  label: 'Progress', icon: BarChart3 },
]

export default function BottomTabBar({ userId }: { userId: string }) {
  const pathname = usePathname()
  // Optimistic highlight: move the active state the instant a tab is tapped,
  // instead of waiting for the server round-trip to update the pathname.
  const [pending, setPending] = useState<string | null>(null)

  // Reconcile once navigation actually lands (or is abandoned).
  useEffect(() => { setPending(null) }, [pathname])

  // Idle-prefetch the other tabs' local-first caches so switching is instant.
  // Mobile AND desktop share these pages (this component is merely hidden ≥md),
  // so no viewport gate. Keys MUST match the ones each page component uses.
  useEffect(() => {
    const warm = () => {
      void prefetchLocalFirst(`dashboard:${userId}`, '/api/app/dashboard')
      void prefetchLocalFirst(`progress:${userId}`, '/api/app/progress')
      void prefetchLocalFirst(`study-progress:${userId}`, '/api/app/study-progress')
    }
    if (typeof requestIdleCallback === 'function') {
      const id = requestIdleCallback(warm, { timeout: 3000 })
      return () => cancelIdleCallback(id)
    }
    const id = setTimeout(warm, 1500)
    return () => clearTimeout(id)
  }, [userId])

  // Hide during an actual quiz (/test/<category> is full-screen dvh).
  // The /test index (Practice picker) keeps the tab bar.
  if (pathname?.startsWith('/test/')) return null

  const activeHref =
    pending ??
    TABS.find(({ href }) => pathname === href || (pathname?.startsWith(href + '/') ?? false))?.href

  return (
    <nav
      aria-label="Primary"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 pb-[env(safe-area-inset-bottom)]"
    >
      <div className="flex h-16">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = href === activeHref
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setPending(href)}
              aria-current={active ? 'page' : undefined}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors ${
                active ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Icon size={23} aria-hidden />
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
