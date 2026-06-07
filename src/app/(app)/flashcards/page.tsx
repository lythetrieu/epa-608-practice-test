import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import FlashcardClient from './FlashcardClient'

export default async function FlashcardsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Flashcards are open to everyone (free + Pro).
  return <FlashcardClient />
}
