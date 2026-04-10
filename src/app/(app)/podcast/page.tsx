import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PodcastClient from './PodcastClient'

export const metadata = {
  title: 'Podcast Mode | EPA 608 Practice',
  description: 'Listen to EPA 608 practice questions read aloud — perfect for studying while driving.',
}

export default async function PodcastPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users_profile')
    .select('tier')
    .eq('id', user.id)
    .single()

  const tier = (profile?.tier ?? 'free') as 'free' | 'starter' | 'ultimate'

  return <PodcastClient tier={tier} />
}
