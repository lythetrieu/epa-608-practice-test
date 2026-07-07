import { getCurrentUser } from '@/lib/supabase/auth'
import { redirect } from 'next/navigation'
import { ProgressClient } from './ProgressClient'

// Perf Phase 3: thin server shell — local JWT decode only, ZERO database
// awaits. All data loads client-side via /api/app/progress with a
// localStorage-first snapshot (see ProgressClient + src/lib/local-first.ts),
// so switching to this tab renders instantly.
export default async function ProgressPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login?redirect=/progress')

  return <ProgressClient userId={user.id} />
}
