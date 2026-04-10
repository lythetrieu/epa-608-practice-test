import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CertificateCard from './CertificateCard'
import Link from 'next/link'

type CategoryStats = {
  category: string
  bestScore: number
  bestTotal: number
  bestPct: number
  passed: boolean
}

export const metadata = {
  title: 'Your Certificate | EPA 608 Practice Test',
  description: 'View and share your EPA 608 Practice Champion certificate.',
}

export default async function CertificatePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/certificate')

  // Fetch all completed sessions
  const { data: allSessions } = await supabase
    .from('test_sessions')
    .select('id, category, score, total, submitted_at')
    .eq('user_id', user.id)
    .not('submitted_at', 'is', null)
    .order('submitted_at', { ascending: false })

  // Calculate best scores per category
  const bestByCategory: Record<string, { score: number; total: number }> = {}
  if (allSessions) {
    for (const s of allSessions) {
      if (s.score === null || s.total === 0) continue
      const pct = (s.score / s.total) * 100
      const existing = bestByCategory[s.category]
      if (!existing || pct > (existing.score / existing.total) * 100) {
        bestByCategory[s.category] = { score: s.score, total: s.total }
      }
    }
  }

  const allCategories = ['Core', 'Type I', 'Type II', 'Type III', 'Universal']
  const categoryStats: CategoryStats[] = allCategories
    .filter((cat) => bestByCategory[cat])
    .map((cat) => {
      const { score, total } = bestByCategory[cat]
      const pct = Math.round((score / total) * 100)
      return {
        category: cat,
        bestScore: score,
        bestTotal: total,
        bestPct: pct,
        passed: pct >= 70,
      }
    })

  const passedCategories = categoryStats.filter((c) => c.passed)
  const hasPassed = passedCategories.length > 0

  // Find the overall best score for display
  let overallBest: CategoryStats | null = null
  for (const cs of categoryStats) {
    if (!overallBest || cs.bestPct > overallBest.bestPct) {
      overallBest = cs
    }
  }

  // Build shareable data for the public certificate URL
  const userName = user.email ? user.email.split('@')[0] : 'Student'

  // Encode certificate data as base64 for shareable URL
  const certData = {
    n: userName,
    c: passedCategories.map((c) => c.category),
    s: overallBest?.bestPct ?? 0,
    sc: overallBest?.category ?? '',
    d: new Date().toISOString().slice(0, 10),
  }
  const certBase64 = Buffer.from(JSON.stringify(certData)).toString('base64url')

  if (!hasPassed) {
    return (
      <div className="p-6 sm:p-8 max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
          <div className="text-6xl mb-6">🎯</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            Keep Practicing to Earn Your Certificate
          </h1>
          <p className="text-gray-500 mb-2">
            Score 70% or higher on any test category to unlock your shareable
            &ldquo;EPA 608 Practice Champion&rdquo; certificate.
          </p>
          <p className="text-sm text-gray-400 mb-8">
            Your best scores so far:{' '}
            {categoryStats.length > 0
              ? categoryStats.map((c) => `${c.category}: ${c.bestPct}%`).join(', ')
              : 'No tests completed yet'}
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center px-6 py-3 bg-blue-800 text-white rounded-xl font-semibold hover:bg-blue-900 transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 sm:p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Your Certificate</h1>
        <p className="text-gray-500 text-sm mt-1">
          Congratulations! Share your achievement with the world.
        </p>
      </div>

      <CertificateCard
        userName={userName}
        passedCategories={passedCategories.map((c) => c.category)}
        bestScore={overallBest?.bestPct ?? 0}
        bestCategory={overallBest?.category ?? ''}
        date={new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}
        shareUrl={`${process.env.NEXT_PUBLIC_SITE_URL || 'https://app.epa608practicetest.net'}/cert/${certBase64}`}
      />
    </div>
  )
}
