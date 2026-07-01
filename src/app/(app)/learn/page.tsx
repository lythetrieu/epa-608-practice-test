import { getCurrentUser } from '@/lib/supabase/auth'
import { redirect } from 'next/navigation'
import StudyPathClient from './StudyPathClient'

export default async function LearnPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login?redirect=/learn')

  return <StudyPathClient />
}
