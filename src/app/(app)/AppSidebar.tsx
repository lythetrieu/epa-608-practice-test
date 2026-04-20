'use client'

import { useState, useEffect, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { getTierLabel } from '@/lib/tier'
import type { Tier } from '@/types'
import {
  LayoutDashboard, BookOpen, Layers, Bot, BarChart3, Target,
  Award, Settings, LogOut, Shield, Users, ChevronRight,
  Snowflake, Wrench, Factory, FileText, Zap, Menu, X, History,
} from 'lucide-react'

type AppSidebarProps = {
  email: string
  tier: Tier
  isTeamAdmin: boolean
  isAdmin: boolean
}

const PRACTICE_ITEMS = [
  { href: '/test/core',      label: 'Core',      icon: <FileText size={15} /> },
  { href: '/test/type-1',    label: 'Type I',    icon: <Snowflake size={15} /> },
  { href: '/test/type-2',    label: 'Type II',   icon: <Wrench size={15} /> },
  { href: '/test/type-3',    label: 'Type III',  icon: <Factory size={15} /> },
  { href: '/test/universal', label: 'Universal', icon: <Zap size={15} /> },
]

export default function AppSidebar({ email, tier, isTeamAdmin, isAdmin }: AppSidebarProps) {
  const [open, setOpen] = useState(false)
  const [practiceOpen, setPracticeOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => { setOpen(false) }, [pathname])
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])
  useEffect(() => {
    if (pathname?.startsWith('/test')) setPracticeOpen(true)
  }, [pathname])

  const isPro = tier !== 'free'
  const username = email.split('@')[0]

  const sidebar = (
    <div className="flex flex-col h-full" style={{ background: '#001d57' }}>

      {/* Logo */}
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

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto space-y-0.5">

        <NavItem href="/dashboard" icon={<LayoutDashboard size={17} />} label="Dashboard" pathname={pathname} />

        {/* Study */}
        <SectionLabel>Study</SectionLabel>
        <NavItem href="/learn"      icon={<BookOpen size={17} />} label="Study Path"  pathname={pathname} />
        <NavItem href="/flashcards" icon={<Layers size={17} />}   label="Flashcards"  pathname={pathname} />
        <NavItem href="/tutor"      icon={<Bot size={17} />}      label="AI Tutor"    pathname={pathname} badge={!isPro ? 'Pro' : undefined} />

        {/* Practice */}
        <SectionLabel>Practice</SectionLabel>
        <button
          onClick={() => setPracticeOpen(v => !v)}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-white/70 hover:text-white hover:bg-white/10"
        >
          <Zap size={17} className="shrink-0" />
          <span className="flex-1 text-left">Practice Tests</span>
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

        {/* Results */}
        <SectionLabel>Results</SectionLabel>
        <NavItem href="/progress"            icon={<BarChart3 size={17} />} label="Coverage"    pathname={pathname} />
        <NavItem href="/progress/weak-spots" icon={<Target size={17} />}    label="Weak Spots"  pathname={pathname} />
        <NavItem href="/history"             icon={<History size={17} />}   label="History"     pathname={pathname} />
        <NavItem href="/certificate"         icon={<Award size={17} />}     label="Badges"      pathname={pathname} />

        {/* Admin */}
        {(isTeamAdmin || isAdmin) && (
          <>
            <SectionLabel>Admin</SectionLabel>
            {isTeamAdmin && <NavItem href="/admin/team"       icon={<Users size={17} />}    label="Team"      pathname={pathname} />}
            {isAdmin      && <NavItem href="/admin/users"     icon={<Shield size={17} />}   label="Users"     pathname={pathname} />}
            {isAdmin      && <NavItem href="/admin/analytics" icon={<BarChart3 size={17} />} label="Analytics" pathname={pathname} />}
          </>
        )}
      </nav>

      {/* Upgrade */}
      {!isPro && (
        <div className="px-3 pb-2">
          <Link href="https://epa608practicetest.net/checkout.html"
            className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
            style={{ background: '#e85d04' }}>
            <span className="text-white">⚡ Upgrade to Pro</span>
            <span className="text-white/70 text-xs font-normal">$14.99</span>
          </Link>
        </div>
      )}

      {/* User footer */}
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
        <NavItem href="/settings" icon={<Settings size={17} />} label="Settings" pathname={pathname} />
        <form action="/auth/signout" method="post">
          <button type="submit" className="w-full text-left text-sm text-white/50 hover:text-red-400 px-3 py-2.5 rounded-lg hover:bg-red-500/10 transition-colors flex items-center gap-2.5">
            <LogOut size={17} />
            Sign Out
          </button>
        </form>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between h-14 px-4 border-b border-white/10" style={{ background: '#001d57' }}>
        <div className="flex items-center gap-2">
          <button onClick={() => setOpen(true)} className="p-2 -ml-2 text-white/70" aria-label="Open menu">
            <Menu size={22} />
          </button>
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center text-white text-xs font-bold">608</div>
            <span className="font-bold text-white text-sm">EPA 608</span>
          </Link>
        </div>
        {!isPro && (
          <Link href="https://epa608practicetest.net/checkout.html"
            className="text-xs font-bold px-3 py-1.5 rounded-lg text-white"
            style={{ background: '#e85d04' }}>
            Go Pro
          </Link>
        )}
      </div>

      {/* Mobile overlay */}
      {open && <div className="md:hidden fixed inset-0 z-40 bg-black/60" onClick={() => setOpen(false)} />}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-56 flex flex-col shrink-0
        transform transition-transform duration-200 ease-in-out
        md:static md:translate-x-0
        ${open ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
      `}>
        <button onClick={() => setOpen(false)} className="md:hidden absolute top-3 right-3 p-1.5 text-white/40 hover:text-white z-10" aria-label="Close">
          <X size={18} />
        </button>
        {sidebar}
      </aside>
    </>
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
