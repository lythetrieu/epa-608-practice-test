import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { TIER_LIMITS, type Tier } from '@/types'
import TutorChat from './TutorChat'

export default async function TutorPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/tutor')

  const { data: profile } = await supabase
    .from('users_profile')
    .select('tier, ai_queries_today')
    .eq('id', user.id)
    .single()

  const tier = (profile?.tier ?? 'free') as Tier
  const limits = TIER_LIMITS[tier]

  if (limits.aiQueriesPerDay === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <div className="text-5xl mb-4">🎓</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">AI Tutor</h1>
          <p className="text-gray-500 mb-6">
            Get instant help with EPA 608 exam topics. Ask questions about
            refrigerants, regulations, safety procedures, and more.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-6">
            <p className="text-sm text-blue-800 font-medium mb-1">
              Upgrade to unlock AI Tutor
            </p>
            <p className="text-xs text-blue-600">
              Starter Pass includes 20 AI queries per day. Ultimate gets 100.
            </p>
          </div>
          <Link
            href="/pricing"
            className="inline-block px-6 py-3 bg-blue-800 text-white rounded-xl font-bold hover:bg-blue-900 transition-colors"
          >
            Upgrade Now
          </Link>
        </div>
      </div>
    )
  }

  const aiQueriesRemaining = Math.max(
    0,
    limits.aiQueriesPerDay - (profile?.ai_queries_today ?? 0),
  )

  return (
    <TutorChat
      email={user.email ?? ''}
      tier={tier}
      aiQueriesRemaining={aiQueriesRemaining}
    />
  )
}
