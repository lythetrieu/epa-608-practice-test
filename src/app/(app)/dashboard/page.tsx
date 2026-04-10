import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { TIER_LIMITS, type Tier, type Category } from '@/types'

const TEST_CARDS: {
  label: string
  category: Category | 'Universal'
  href: string
  emoji: string
  description: string
  paidOnly: boolean
}[] = [
  {
    label: 'Core',
    category: 'Core',
    href: '/test/core',
    emoji: '📝',
    description: 'Refrigerant fundamentals & regulations',
    paidOnly: false,
  },
  {
    label: 'Type I',
    category: 'Type I',
    href: '/test/type-1',
    emoji: '❄️',
    description: 'Small appliances (under 5 lbs)',
    paidOnly: true,
  },
  {
    label: 'Type II',
    category: 'Type II',
    href: '/test/type-2',
    emoji: '🔧',
    description: 'High-pressure appliances',
    paidOnly: true,
  },
  {
    label: 'Type III',
    category: 'Type III',
    href: '/test/type-3',
    emoji: '🏭',
    description: 'Low-pressure appliances',
    paidOnly: true,
  },
  {
    label: 'Universal',
    category: 'Universal',
    href: '/test/universal',
    emoji: '🎯',
    description: 'All categories combined',
    paidOnly: true,
  },
]

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/dashboard')

  const { data: profile } = await supabase
    .from('users_profile')
    .select('tier, lifetime_access, ai_queries_today')
    .eq('id', user.id)
    .single()

  const tier = (profile?.tier ?? 'free') as Tier
  const isFree = tier === 'free'
  const limits = TIER_LIMITS[tier]

  // Recent completed sessions
  const { data: sessions } = await supabase
    .from('test_sessions')
    .select('id, category, score, total, submitted_at')
    .eq('user_id', user.id)
    .not('submitted_at', 'is', null)
    .order('submitted_at', { ascending: false })
    .limit(5)

  return (
    <div className="p-6 sm:p-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back{user.email ? `, ${user.email.split('@')[0]}` : ''}!
        </h1>
        <p className="text-gray-500 text-sm mt-1">{user.email}</p>
      </div>

      {/* Upgrade banner — free tier only */}
      {isFree && (
        <div className="bg-gradient-to-r from-blue-800 to-blue-600 rounded-2xl p-6 text-white mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="font-bold text-lg">Unlock all 4 exam types</p>
            <p className="text-blue-100 text-sm mt-1">
              Starter Pass — one-time $19.99 lifetime access. No subscription.
            </p>
          </div>
          <Link
            href="/pricing"
            className="shrink-0 px-5 py-2.5 bg-white text-blue-800 rounded-xl font-bold hover:bg-blue-50 transition-colors whitespace-nowrap"
          >
            Upgrade
          </Link>
        </div>
      )}

      {/* AI queries remaining — paid tiers */}
      {!isFree && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-8 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            <span className="font-medium text-gray-900">AI Queries Today</span>
            <span className="text-gray-400 ml-2">
              {profile?.ai_queries_today ?? 0} / {limits.aiQueriesPerDay === Infinity ? '∞' : limits.aiQueriesPerDay} used
            </span>
          </div>
          <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-medium">
            Resets daily
          </span>
        </div>
      )}

      {/* Practice tests */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Start a Practice Test</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {TEST_CARDS.map((t) => {
            const locked = t.paidOnly && isFree
            return locked ? (
              <div
                key={t.label}
                className="rounded-xl border-2 border-dashed border-gray-200 p-5 bg-gray-50"
              >
                <div className="text-3xl mb-2">{t.emoji}</div>
                <div className="font-semibold text-gray-400">{t.label}</div>
                <div className="text-xs text-gray-400 mt-1">{t.description}</div>
                <Link
                  href="/pricing"
                  className="mt-4 inline-flex items-center text-xs font-medium text-blue-700 hover:underline"
                >
                  Upgrade to unlock
                </Link>
              </div>
            ) : (
              <Link
                key={t.label}
                href={t.href}
                className="rounded-xl border-2 border-gray-200 p-5 bg-white hover:border-blue-800 hover:bg-blue-50 transition-all group"
              >
                <div className="text-3xl mb-2">{t.emoji}</div>
                <div className="font-semibold text-gray-800 group-hover:text-blue-800">
                  {t.label}
                </div>
                <div className="text-xs text-gray-400 mt-1">{t.description}</div>
                <div className="mt-4 text-xs font-medium text-blue-800 group-hover:underline">
                  Start test →
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      {/* Recent sessions */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Tests</h2>
          {!isFree && (
            <Link href="/progress" className="text-sm text-blue-800 hover:underline font-medium">
              View all →
            </Link>
          )}
        </div>

        {sessions && sessions.length > 0 ? (
          <div className="space-y-2">
            {sessions.map((s) => {
              const pct = s.score !== null ? Math.round((s.score / s.total) * 100) : 0
              const passed = pct >= 70
              return (
                <div
                  key={s.id}
                  className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center justify-between"
                >
                  <div>
                    <span className="font-medium text-gray-800">{s.category}</span>
                    <span className="text-sm text-gray-400 ml-3">
                      {new Date(s.submitted_at!).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`font-bold text-lg ${passed ? 'text-green-600' : 'text-red-500'}`}
                    >
                      {pct}%
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        passed
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-600'
                      }`}
                    >
                      {passed ? 'Pass' : 'Fail'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
            <p className="text-gray-400 text-sm">No completed tests yet. Start one above!</p>
          </div>
        )}
      </section>
    </div>
  )
}
