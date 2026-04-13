import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import StudyPathClient from './StudyPathClient'

export default async function LearnPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/learn')

  return <StudyPathClient />
}
