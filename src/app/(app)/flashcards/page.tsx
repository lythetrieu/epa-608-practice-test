import { getCurrentUser } from '@/lib/supabase/auth'
import { redirect } from 'next/navigation'
import FlashcardClient from './FlashcardClient'

export default async function FlashcardsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  // Flashcards are open to everyone (free + Pro).
  return <FlashcardClient />
}
