import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { UsersAdminClient } from './UsersAdminClient'

const ADMIN_EMAILS = ['thetrieu9587@gmail.com']

type UserRow = {
  id: string
  email: string
  tier: string
  lifetime_access: boolean
  created_at: string
  total_tests: number
  last_test_date: string | null
}

export default async function UsersAdminPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (!ADMIN_EMAILS.includes(user.email ?? '')) redirect('/dashboard')

  const admin = createAdminClient()

  // Fetch all user profiles
  const { data: profiles } = await admin
    .from('users_profile')
    .select('id, email, tier, lifetime_access, created_at')
    .order('created_at', { ascending: false })

  if (!profiles) {
    return (
      <div className="p-8 text-center text-gray-500">
        Failed to load users.
      </div>
    )
  }

  // Fetch test session counts and last test date per user
  const { data: sessionStats } = await admin
    .from('test_sessions')
    .select('user_id, submitted_at')
    .not('submitted_at', 'is', null)

  // Aggregate stats
  const statsMap: Record<string, { total: number; lastDate: string | null }> = {}
  sessionStats?.forEach((s: { user_id: string; submitted_at: string | null }) => {
    if (!statsMap[s.user_id]) {
      statsMap[s.user_id] = { total: 0, lastDate: null }
    }
    statsMap[s.user_id].total++
    if (
      s.submitted_at &&
      (!statsMap[s.user_id].lastDate || s.submitted_at > statsMap[s.user_id].lastDate!)
    ) {
      statsMap[s.user_id].lastDate = s.submitted_at
    }
  })

  const users: UserRow[] = profiles.map((p) => ({
    id: p.id,
    email: p.email,
    tier: p.tier,
    lifetime_access: p.lifetime_access,
    created_at: p.created_at,
    total_tests: statsMap[p.id]?.total ?? 0,
    last_test_date: statsMap[p.id]?.lastDate ?? null,
  }))

  return <UsersAdminClient users={users} />
}
