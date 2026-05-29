import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { WelcomeScreen } from './WelcomeScreen'

export default async function WelcomePage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { next } = await searchParams
  const destination = next || '/dashboard'
  const name = user.email?.split('@')[0] ?? 'there'

  return <WelcomeScreen name={name} destination={destination} />
}
