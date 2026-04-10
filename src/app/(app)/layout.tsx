import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getTierLabel } from '@/lib/tier'
import type { Tier } from '@/types'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users_profile')
    .select('tier, is_team_admin, team_id')
    .eq('id', user.id)
    .single()

  const tier = (profile?.tier ?? 'free') as Tier

  const tierColors: Record<Tier, string> = {
    free: 'bg-gray-100 text-gray-600',
    starter: 'bg-blue-100 text-blue-700',
    ultimate: 'bg-amber-100 text-amber-700',
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-100 flex flex-col shrink-0">
        <div className="p-6 border-b border-gray-100">
          <Link href="/dashboard" className="font-bold text-blue-800 text-lg hover:text-blue-900">
            EPA 608
          </Link>
          <p className="text-xs text-gray-400 mt-0.5 truncate">{user.email}</p>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium mt-2 inline-block ${tierColors[tier]}`}
          >
            {getTierLabel(tier)}
          </span>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <NavLink href="/dashboard" label="Dashboard" icon="🏠" />
          <NavLink href="/test/core" label="Core Test" icon="📝" />
          <NavLink href="/test/type-1" label="Type I Test" icon="❄️" locked={tier === 'free'} />
          <NavLink href="/test/type-2" label="Type II Test" icon="🔧" locked={tier === 'free'} />
          <NavLink href="/test/type-3" label="Type III Test" icon="🏭" locked={tier === 'free'} />
          <NavLink href="/test/universal" label="Universal Test" icon="🎯" locked={tier === 'free'} />
          <div className="pt-2 border-t border-gray-100 mt-2">
            <NavLink href="/progress" label="Progress" icon="📊" locked={tier === 'free'} />
          </div>
          {profile?.is_team_admin && (
            <NavLink href="/admin/team" label="Team Admin" icon="👥" />
          )}
        </nav>

        <div className="p-4 border-t border-gray-100 space-y-2">
          {tier === 'free' && (
            <Link
              href="/pricing"
              className="block w-full text-center px-4 py-2.5 bg-blue-800 text-white rounded-lg text-sm font-semibold hover:bg-blue-900 transition-colors"
            >
              Upgrade Now
            </Link>
          )}
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="w-full text-left text-sm text-gray-400 hover:text-gray-600 px-2 py-1 transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}

function NavLink({
  href,
  label,
  icon,
  locked,
}: {
  href: string
  label: string
  icon: string
  locked?: boolean
}) {
  if (locked) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-300 text-sm cursor-not-allowed select-none">
        <span aria-hidden>{icon}</span>
        <span>{label}</span>
        <span className="ml-auto text-xs" aria-label="Locked">
          🔒
        </span>
      </div>
    )
  }

  return (
    <Link
      href={href}
      className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-600 text-sm hover:bg-blue-50 hover:text-blue-800 transition-colors"
    >
      <span aria-hidden>{icon}</span>
      <span>{label}</span>
    </Link>
  )
}
