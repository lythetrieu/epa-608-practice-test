import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
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

  if (tier === 'free') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="text-5xl mb-4">🃏</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Flashcards — Pro Feature</h1>
          <p className="text-gray-500 mb-6">
            Drill every concept with spaced-repetition flashcards. Available on Pro.
          </p>
          <Link
            href="https://epa608practicetest.net/checkout.html"
            className="inline-block px-6 py-3 bg-blue-800 text-white rounded-xl font-semibold hover:bg-blue-900 transition-colors"
          >
            Upgrade to Pro — $14.99
          </Link>
          <p className="mt-4 text-xs text-gray-400">One-time payment · Lifetime access</p>
        </div>
      </div>
    )
  }

  return <FlashcardClient tier={tier} />
}
