import { getCurrentUser } from '@/lib/supabase/auth'
import { redirect } from 'next/navigation'
import { DashboardClient } from './DashboardClient'

// Perf Phase 3: thin server shell — local JWT decode only, ZERO database
// awaits. All data loads client-side via /api/app/dashboard with a
// localStorage-first snapshot (see DashboardClient + src/lib/local-first.ts),
// so switching to this tab renders instantly.
export default async function DashboardPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login?redirect=/dashboard')

  return (
    <DashboardClient
      userId={user.id}
      userName={user.email?.split('@')[0] ?? 'there'}
    />
  )
}
