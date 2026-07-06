'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Map, ClipboardList, BarChart3 } from 'lucide-react'

// The 4 primary mobile tabs. A tab is active on its root route and any sub-route
// (e.g. /progress/weak-spots → Progress, /test/core → Practice).
const TABS = [
  { href: '/dashboard', label: 'Home',     icon: Home },
  { href: '/learn',     label: 'Learn',    icon: Map },
  { href: '/test',      label: 'Practice', icon: ClipboardList },
  { href: '/progress',  label: 'Progress', icon: BarChart3 },
]

export default function BottomTabBar() {
  const pathname = usePathname()

  // Hide during an actual quiz (/test/<category> is full-screen dvh).
  // The /test index (Practice picker) keeps the tab bar.
  if (pathname?.startsWith('/test/')) return null

  return (
    <nav
      aria-label="Primary"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 pb-[env(safe-area-inset-bottom)]"
    >
      <div className="flex h-16">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (pathname?.startsWith(href + '/') ?? false)
          return (
            <Link
              key={href}
              href={href}
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
