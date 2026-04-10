'use client'

import { useState, useEffect, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { getTierLabel } from '@/lib/tier'
import { useLocale } from '@/lib/i18n-context'
import LanguageToggle from '@/components/LanguageToggle'
import ThemeToggle from '@/components/ThemeToggle'
import type { Tier } from '@/types'
import {
  Home, FileText, Snowflake, Wrench, Factory, Target,
  Layers, Headphones, Bot, BarChart3, Award, Settings,
  Shield, Users, Lock, Search,
} from 'lucide-react'

type AppSidebarProps = {
  email: string
  tier: Tier
  isTeamAdmin: boolean
  isAdmin: boolean
}

const TOOLS_EXPANDED_KEY = 'sidebar-tools-expanded'

export default function AppSidebar({ email, tier, isTeamAdmin, isAdmin }: AppSidebarProps) {
  const [open, setOpen] = useState(false)
  const [toolsExpanded, setToolsExpanded] = useState(false)
  const pathname = usePathname()
  const { t } = useLocale()

  // Load tools expanded state from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(TOOLS_EXPANDED_KEY)
      if (stored !== null) setToolsExpanded(stored === 'true')
    } catch {}
  }, [])

  // Close mobile drawer on navigation
  useEffect(() => { setOpen(false) }, [pathname])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  const toggleTools = () => {
    const next = !toolsExpanded
    setToolsExpanded(next)
    try { localStorage.setItem(TOOLS_EXPANDED_KEY, String(next)) } catch {}
  }

  const tierColors: Record<Tier, string> = {
    free: 'bg-gray-100 text-gray-600',
    starter: 'bg-blue-100 text-blue-700',
    ultimate: 'bg-amber-100 text-amber-700',
  }

  const sidebarContent = (
    <>
      {/* Header */}
      <div className="p-6 border-b border-gray-100 dark:border-gray-800">
        <Link href="/dashboard" className="font-bold text-blue-800 dark:text-blue-400 text-lg hover:text-blue-900 dark:hover:text-blue-300">
          EPA 608
        </Link>
        <p className="text-xs text-gray-400 mt-0.5 truncate">{email}</p>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-2 inline-block ${tierColors[tier]}`}>
          {getTierLabel(tier)}
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <NavLink href="/dashboard" label={t('dashboard')} icon={<Home size={18} />} pathname={pathname} />

        {/* Sections */}
        <SectionHeader>{t('sections')}</SectionHeader>
        <NavLink href="/test/core" label="Core" icon={<FileText size={18} />} pathname={pathname} matchPrefix="/test/core" />
        <NavLink href="/test/type-1" label="Type I" icon={<Snowflake size={18} />} pathname={pathname} matchPrefix="/test/type-1" locked={tier === 'free'} />
        <NavLink href="/test/type-2" label="Type II" icon={<Wrench size={18} />} pathname={pathname} matchPrefix="/test/type-2" locked={tier === 'free'} />
        <NavLink href="/test/type-3" label="Type III" icon={<Factory size={18} />} pathname={pathname} matchPrefix="/test/type-3" locked={tier === 'free'} />
        <NavLink href="/test/universal" label="Universal" icon={<Target size={18} />} pathname={pathname} matchPrefix="/test/universal" locked={tier === 'free'} />

        {/* Collapsible Tools */}
        <button
          onClick={toggleTools}
          className="flex items-center w-full text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 pt-4 pb-1 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <span>{t('tools')}</span>
          <svg
            className={`w-3.5 h-3.5 ml-auto transition-transform duration-200 ${toolsExpanded ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {toolsExpanded && (
          <div className="space-y-1">
            <NavLink href="/flashcards" label={t('flashcards')} icon={<Layers size={18} />} pathname={pathname} />
            <NavLink href="/podcast" label={t('podcast')} icon={<Headphones size={18} />} pathname={pathname} />
            <NavLink href="/tutor" label={t('aiTutor')} icon={<Bot size={18} />} pathname={pathname} />
            <NavLink href="/progress" label={t('progress')} icon={<BarChart3 size={18} />} pathname={pathname} />
            <NavLink href="/progress/weak-spots" label={t('weakSpots')} icon={<Search size={18} />} pathname={pathname} matchPrefix="/progress/weak-spots" />
            <NavLink href="/certificate" label={t('certificate')} icon={<Award size={18} />} pathname={pathname} />
          </div>
        )}

        {/* Admin */}
        {(isTeamAdmin || isAdmin) && (
          <>
            <SectionHeader>{t('admin')}</SectionHeader>
            {isTeamAdmin && <NavLink href="/admin/team" label={t('teamAdmin')} icon={<Users size={18} />} pathname={pathname} />}
            {isAdmin && <NavLink href="/admin/users" label={t('users')} icon={<Shield size={18} />} pathname={pathname} />}
            {isAdmin && <NavLink href="/admin/analytics" label={t('analytics')} icon={<BarChart3 size={18} />} pathname={pathname} />}
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-100 dark:border-gray-800 space-y-2">
        {tier === 'free' && (
          <Link
            href="/pricing"
            className="block w-full text-center px-4 py-2.5 bg-blue-800 text-white rounded-lg text-sm font-semibold hover:bg-blue-900 transition-colors"
          >
            {t('upgrade')}
          </Link>
        )}
        <NavLink href="/settings" label={t('settings')} icon={<Settings size={18} />} pathname={pathname} />
        <ThemeToggle />
        <LanguageToggle />
        <form action="/auth/signout" method="post">
          <button type="submit" className="w-full text-left text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 px-3 py-2 transition-colors">
            {t('signOut')}
          </button>
        </form>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex items-center h-14 px-4">
        <button onClick={() => setOpen(true)} className="p-2.5 -ml-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white" aria-label="Open menu">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span className="ml-3 font-bold text-blue-800 dark:text-blue-400">EPA 608</span>
      </div>

      {/* Mobile overlay */}
      {open && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/40" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 flex flex-col shrink-0
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

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 pt-4 pb-1">
      {children}
    </p>
  )
}

function NavLink({
  href,
  label,
  icon,
  pathname,
  matchPrefix,
  locked,
}: {
  href: string
  label: string
  icon: ReactNode
  pathname: string | null
  matchPrefix?: string
  locked?: boolean
}) {
  const prefix = matchPrefix ?? href
  const isActive = pathname === href || (pathname?.startsWith(prefix + '/') ?? false)

  if (locked) {
    return (
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-gray-300 dark:text-gray-600 text-sm cursor-not-allowed select-none">
        <span aria-hidden>{icon}</span>
        <span>{label}</span>
        <span className="ml-auto"><Lock size={14} /></span>
      </div>
    )
  }

  return (
    <Link
      href={href}
      className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-colors ${
        isActive
          ? 'bg-blue-50 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-medium'
          : 'text-gray-600 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-950 hover:text-blue-800 dark:hover:text-blue-300'
      }`}
    >
      <span aria-hidden>{icon}</span>
      <span>{label}</span>
    </Link>
  )
}
