'use client'

import { useState, useEffect, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { clearLocalFirstCache } from '@/lib/local-first'
import { getTierLabel } from '@/lib/tier'
import { TIER_LIMITS, type Tier } from '@/types'
import {
  BookOpen, Settings, LogOut, Shield, Users, ChevronRight, Home,
  Snowflake, Wrench, Factory, FileText, Zap, BarChart3, ClipboardList, Bot,
} from 'lucide-react'

type AppSidebarProps = {
  email: string
  tier: Tier
  isTeamAdmin: boolean
  isAdmin: boolean
}

// Practice Test categories. Picking one opens the test page where the learner
// chooses Practice (untimed + hints) or Exam (real, timed) mode.
const PRACTICE_ITEMS = [
  { href: '/test/core',      label: 'Core',      icon: <FileText size={15} /> },
  { href: '/test/type-1',    label: 'Type I',    icon: <Snowflake size={15} /> },
  { href: '/test/type-2',    label: 'Type II',   icon: <Wrench size={15} /> },
  { href: '/test/type-3',    label: 'Type III',  icon: <Factory size={15} /> },
  { href: '/test/universal', label: 'Universal', icon: <Zap size={15} /> },
]

// Desktop-only sidebar. On mobile the app shell is MobileTopBar + BottomTabBar.
export default function AppSidebar({ email, tier, isTeamAdmin, isAdmin }: AppSidebarProps) {
  const [practiceOpen, setPracticeOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    if (pathname?.startsWith('/test')) setPracticeOpen(true)
  }, [pathname])

  const isPro = tier !== 'free'
  const username = email.split('@')[0]

  return (
    <aside className="hidden md:flex w-56 flex-col shrink-0" style={{ background: '#001d57' }}>

      {/* Logo → Home */}
      <div className="px-4 py-4 border-b border-white/10">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0 bg-white/15">
            608
          </div>
          <div className="leading-tight">
            <div className="text-white font-bold text-sm">EPA 608</div>
            <div className="text-white/40 text-xs">Practice Test</div>
          </div>
        </Link>
      </div>

      {/* Nav — mirrors the 4 mobile tabs (+ AI Tutor, admin) */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto space-y-0.5">

        <NavItem href="/dashboard" icon={<Home size={18} />} label="Home" pathname={pathname} />

        <NavItem href="/learn" icon={<BookOpen size={18} />} label="Study Path" pathname={pathname} badge={TIER_LIMITS[tier].hasStudyPath ? undefined : 'Pro'} />

        {/* Practice Test — pick a category, then Practice or Exam mode */}
        <button
          onClick={() => setPracticeOpen(v => !v)}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-white/70 hover:text-white hover:bg-white/10"
        >
          <ClipboardList size={18} className="shrink-0" />
          <span className="flex-1 text-left">Practice Test</span>
          <ChevronRight size={13} className={`transition-transform duration-200 opacity-50 ${practiceOpen ? 'rotate-90' : ''}`} />
        </button>
        {practiceOpen && (
          <div className="ml-3 pl-3 border-l border-white/10 space-y-0.5 mt-0.5">
            {PRACTICE_ITEMS.map(item => {
              const active = pathname === item.href || pathname?.startsWith(item.href + '/')
              return (
                <Link key={item.href} href={item.href}
                  className={`flex items-center gap-2 px-2 py-2 rounded-lg text-sm transition-colors ${
                    active ? 'text-white font-semibold bg-white/15' : 'text-white/55 hover:text-white hover:bg-white/10'
                  }`}>
                  <span className="opacity-70">{item.icon}</span>
                  {item.label}
                </Link>
              )
            })}
          </div>
        )}

        <NavItem href="/progress" icon={<BarChart3 size={18} />} label="Progress" pathname={pathname} />

        {/* AI Tutor — Pro-only chat; free sees a Pro lock badge (mirrors Study Path) */}
        <NavItem href="/tutor" icon={<Bot size={18} />} label="AI Tutor" pathname={pathname} badge={isPro ? undefined : 'Pro'} />

        {/* Admin (admin-only — not part of the 4 learner tabs) */}
        {(isTeamAdmin || isAdmin) && (
          <>
            <SectionLabel>Admin</SectionLabel>
            {isTeamAdmin && <NavItem href="/admin/team"       icon={<Users size={17} />}    label="Team"      pathname={pathname} />}
            {isAdmin      && <NavItem href="/admin/users"     icon={<Shield size={17} />}   label="Users"     pathname={pathname} />}
            {isAdmin      && <NavItem href="/admin/analytics" icon={<BarChart3 size={17} />} label="Analytics" pathname={pathname} />}
          </>
        )}
      </nav>

      {/* Upgrade — white-on-navy (approved skin: orange is reserved for each
          screen's ONE primary action, and the sidebar is on every screen) */}
      {!isPro && (
        <div className="px-3 pb-2">
          <Link href={`/checkout.html`}
            className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold bg-white transition-opacity hover:opacity-90"
           prefetch={false}>
            <span style={{ color: '#003087' }}>⚡ Upgrade to Pro</span>
            <span className="text-gray-500 text-xs font-normal font-mono">$14.99</span>
          </Link>
        </div>
      )}

      {/* Account footer */}
      <div className="px-2 py-3 border-t border-white/10 space-y-0.5">
        <div className="flex items-center gap-2.5 px-3 py-2 mb-1">
          <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {username.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-white text-xs font-semibold truncate">{username}</p>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isPro ? 'bg-blue-400/20 text-blue-300' : 'bg-white/10 text-white/50'}`}>
              {getTierLabel(tier)}
            </span>
          </div>
        </div>
        <NavItem href="/settings" icon={<Settings size={18} />} label="Account" pathname={pathname} />
        {/* Wipe local-first snapshots before the sign-out POST navigates away —
            the next account on this device must never see this user's data. */}
        <form action="/auth/signout" method="post" onSubmit={() => clearLocalFirstCache()}>
          <button type="submit" className="w-full text-left text-sm text-white/50 hover:text-red-400 px-3 py-2.5 rounded-lg hover:bg-red-500/10 transition-colors flex items-center gap-2.5">
            <LogOut size={17} />
            Sign Out
          </button>
        </form>
      </div>
    </aside>
  )
}

function NavItem({ href, icon, label, pathname, badge }: {
  href: string; icon: ReactNode; label: string; pathname: string | null; badge?: string
}) {
  const active = pathname === href || (href !== '/dashboard' && (pathname?.startsWith(href + '/') ?? false))
  return (
    <Link href={href} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
      active ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white hover:bg-white/10'
    }`}>
      <span className="shrink-0">{icon}</span>
      <span className="flex-1">{label}</span>
      {badge && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 shrink-0">{badge}</span>}
    </Link>
  )
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest px-3 pt-3 pb-1">{children}</p>
}
