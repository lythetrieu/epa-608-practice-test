import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Tier } from '@/types'
import DailyDrillClient from './DailyDrillClient'

export default async function DailyDrillPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users_profile')
    .select('tier')
    .eq('id', user.id)
    .single()

  const tier = (profile?.tier ?? 'free') as Tier
  if (tier !== 'ultimate') redirect('/pricing')

  return <DailyDrillClient />
}
