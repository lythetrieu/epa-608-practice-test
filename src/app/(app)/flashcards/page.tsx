import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Tier } from '@/types'
import FlashcardClient from './FlashcardClient'

export default async function FlashcardsPage() {
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

  return <FlashcardClient tier={tier} />
}
