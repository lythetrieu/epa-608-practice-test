import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Headphones, ArrowLeft } from 'lucide-react'

export const metadata = {
  title: 'Podcast Mode — Coming Soon | EPA 608 Practice Test',
}

export default async function PodcastPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl border border-gray-200 p-10 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <Headphones className="w-8 h-8 text-amber-500" />
        </div>
        <span className="inline-block text-xs font-bold px-3 py-1 rounded-full bg-amber-50 text-amber-600 border border-amber-200 mb-4">
          Coming Q2 2026
        </span>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Podcast Mode</h1>
        <p className="text-gray-500 text-sm leading-relaxed mb-6">
          Listen to EPA 608 concept breakdowns in podcast format — study hands-free on the job site, in your truck, or anywhere with no signal.
        </p>
        <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left space-y-2">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">What&apos;s coming</p>
          <p className="text-sm text-gray-600">🎙️ Audio explanations for every topic</p>
          <p className="text-sm text-gray-600">🚗 Hands-free study while driving</p>
          <p className="text-sm text-gray-600">📶 Works offline, no signal needed</p>
          <p className="text-sm text-gray-600">⚡ Included in your Pro plan at no extra cost</p>
        </div>
        <Link href="/dashboard"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-800 text-white rounded-xl font-semibold hover:bg-blue-900 transition-colors text-sm">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
      </div>
    </div>
  )
}
