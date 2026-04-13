'use client'

import { useState, useEffect, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { getTierLabel } from '@/lib/tier'
import type { Tier } from '@/types'
import {
  Home, BookOpen, Settings, Shield, Users, BarChart3, LogOut,
} from 'lucide-react'

type AppSidebarProps = {
  email: string
  tier: Tier
  isTeamAdmin: boolean
  isAdmin: boolean
}

export default function AppSidebar({ email, tier, isTeamAdmin, isAdmin }: AppSidebarProps) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => { setOpen(false) }, [pathname])
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  const tierColors: Record<Tier, string> = {
    free: 'bg-gray-100 text-gray-600',
    starter: 'bg-blue-100 text-blue-700',
    ultimate: 'bg-amber-100 text-amber-700',
  }

  const isFree = tier === 'free'

  const sidebarContent = (
    <>
      {/* Header */}
      <div className="p-5 border-b border-gray-100 dark:border-gray-800">
        <Link href="/dashboard" className="font-bold text-blue-800 dark:text-blue-400 text-lg hover:text-blue-900 dark:hover:text-blue-300">
          EPA 608
        </Link>
        <p className="text-sm text-gray-500 mt-0.5 truncate">{email}</p>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-2 inline-block ${tierColors[tier]}`}>
          {getTierLabel(tier)}
        </span>
      </div>

      {/* Navigation — minimal */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <NavLink href="/dashboard" label="Dashboard" icon={<Home size={20} />} pathname={pathname} />
        <NavLink href="/learn" label="Learn" icon={<BookOpen size={20} />} pathname={pathname} />

        {/* Admin — only if applicable */}
        {(isTeamAdmin || isAdmin) && (
          <>
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-3 pt-5 pb-1.5">Admin</p>
            {isTeamAdmin && <NavLink href="/admin/team" label="Team" icon={<Users size={20} />} pathname={pathname} />}
            {isAdmin && <NavLink href="/admin/users" label="Users" icon={<Shield size={20} />} pathname={pathname} />}
            {isAdmin && <NavLink href="/admin/analytics" label="Analytics" icon={<BarChart3 size={20} />} pathname={pathname} />}
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-100 dark:border-gray-800 space-y-1">
        {isFree && (
          <Link
            href="/pricing"
            className="block w-full text-center px-4 py-3 min-h-[48px] bg-blue-800 text-white rounded-xl text-sm font-bold hover:bg-blue-900 transition-colors mb-2"
          >
            Upgrade — $19.99
          </Link>
        )}
        <NavLink href="/settings" label="Settings" icon={<Settings size={20} />} pathname={pathname} />
        <form action="/auth/signout" method="post">
          <button type="submit" className="w-full text-left text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-2.5">
            <LogOut size={20} />
            Sign Out
          </button>
        </form>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between h-14 px-4">
        <div className="flex items-center">
          <button onClick={() => setOpen(true)} className="p-2.5 -ml-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white" aria-label="Open menu">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <Link href="/dashboard" className="ml-3 font-bold text-blue-800 dark:text-blue-400">EPA 608</Link>
        </div>
      </div>

      {/* Mobile overlay */}
      {open && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/40" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-56 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 flex flex-col shrink-0
        transform transition-transform duration-200 ease-in-out
        md:static md:translate-x-0
        ${open ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="md:hidden absolute top-3 right-3">
          <button onClick={() => setOpen(false)} className="p-1.5 text-gray-400 hover:text-gray-600" aria-label="Close menu">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {sidebarContent}
      </aside>
    </>
  )
}

function NavLink({ href, label, icon, pathname }: {
  href: string; label: string; icon: ReactNode; pathname: string | null
}) {
  const isActive = pathname === href || (pathname?.startsWith(href + '/') ?? false)

  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
        isActive
          ? 'bg-blue-50 dark:bg-blue-950 text-blue-800 dark:text-blue-300'
          : 'text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-950 hover:text-blue-800 dark:hover:text-blue-300'
      }`}
    >
      <span aria-hidden>{icon}</span>
      <span>{label}</span>
    </Link>
  )
}
