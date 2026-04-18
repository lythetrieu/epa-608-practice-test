import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CertificateList from './CertificateList'
import NamePrompt from './NamePrompt'
import Link from 'next/link'
import { Award, ArrowLeft } from 'lucide-react'

export const metadata = {
  title: 'Your Achievement Badges | EPA 608 Practice Test',
  description: 'View and share your EPA 608 achievement badges.',
}

type Certificate = {
  id: string
  user_name: string
  category: string
  tier: string
  score: number
  total_questions: number
  correct_answers: number
  issued_at: string
}

export default async function CertificatePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/certificate')

  // Get user profile
  const { data: profile } = await supabase
    .from('users_profile')
    .select('display_name, email')
    .eq('id', user.id)
    .single()

  const displayName = profile?.display_name || ''
  const emailPrefix = profile?.email?.split('@')[0] || 'Student'

  // Get all certificates
  const { data: certs } = await supabase
    .from('certificates')
    .select('id, user_name, category, tier, score, total_questions, correct_answers, issued_at')
    .eq('user_id', user.id)
    .order('issued_at', { ascending: false })

  const certificates = (certs || []) as Certificate[]

  // Check if user needs to set display name
  const needsName = !displayName

  if (certificates.length === 0) {
    return (
      <div className="p-6 sm:p-8 max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
          <Award className="w-14 h-14 text-gray-300 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            Earn Your First Achievement Badge
          </h1>
          <p className="text-gray-500 mb-2">
            Score 70% or higher on any test to unlock your first badge.
          </p>
          <p className="text-gray-400 text-sm mb-2">
            4 badge tiers available:
          </p>
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-medium border border-amber-200">70%+ Bronze</span>
            <span className="px-3 py-1 rounded-full bg-gray-50 text-gray-600 text-xs font-medium border border-gray-200">80%+ Silver</span>
            <span className="px-3 py-1 rounded-full bg-yellow-50 text-yellow-700 text-xs font-medium border border-yellow-200">90%+ Gold</span>
            <span className="px-3 py-1 rounded-full bg-cyan-50 text-cyan-700 text-xs font-medium border border-cyan-200">100% Diamond</span>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-800 text-white rounded-xl font-semibold hover:bg-blue-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 sm:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Your Achievement Badges</h1>
        <p className="text-gray-500 text-sm mt-1">
          {certificates.length} badge{certificates.length !== 1 ? 's' : ''} earned. Share your achievements!
        </p>
      </div>

      {needsName && (
        <NamePrompt currentName={emailPrefix} />
      )}

      <CertificateList certificates={certificates} />
    </div>
  )
}
