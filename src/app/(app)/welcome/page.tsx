import { getCurrentUser } from '@/lib/supabase/auth'
import { redirect } from 'next/navigation'
import { WelcomeScreen } from './WelcomeScreen'

export default async function WelcomePage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const { next } = await searchParams
  const destination = next || '/learn'
  const name = user.email?.split('@')[0] ?? 'there'

  return <WelcomeScreen name={name} destination={destination} />
}
