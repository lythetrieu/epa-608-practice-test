import { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/server'
import PublicCertificate from './PublicCertificate'
import { Award, ArrowRight } from 'lucide-react'

type CertRecord = {
  id: string
  user_name: string
  category: string
  tier: string
  score: number
  total_questions: number
  correct_answers: number
  issued_at: string
}

const TIER_LABELS: Record<string, string> = {
  pass: 'Certified Ready',
  advanced: 'Advanced',
  expert: 'Expert',
  master: 'Master',
}

type Props = {
  params: Promise<{ id: string }>
}

async function getCert(id: string): Promise<CertRecord | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('certificates')
    .select('id, user_name, category, tier, score, total_questions, correct_answers, issued_at')
    .eq('id', id.toUpperCase())
    .single()
  return data
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const cert = await getCert(id)
  if (!cert) {
    return { title: 'Certificate Not Found | EPA 608 Practice Test' }
  }
  const tierLabel = TIER_LABELS[cert.tier] || cert.tier
  return {
    title: `${cert.user_name} — EPA 608 ${tierLabel} (${cert.category}) | EPA608PracticeTest.net`,
    description: `${cert.user_name} earned EPA 608 ${tierLabel} certification in ${cert.category} with ${cert.score}% score. Verified certificate #${cert.id}. Practice free at EPA608PracticeTest.net.`,
    openGraph: {
      title: `${cert.user_name} is EPA 608 ${tierLabel}!`,
      description: `Scored ${cert.score}% on ${cert.category}. Certificate #${cert.id}. Practice free at EPA608PracticeTest.net`,
      siteName: 'EPA608PracticeTest.net',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${cert.user_name} is EPA 608 ${tierLabel}!`,
      description: `Scored ${cert.score}% on ${cert.category}. Certificate #${cert.id}. Practice free at EPA608PracticeTest.net`,
    },
  }
}

export default async function PublicCertPage({ params }: Props) {
  const { id } = await params
  const cert = await getCert(id)

  if (!cert) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center max-w-md">
          <Award className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Certificate Not Found</h1>
          <p className="text-gray-500 text-sm mb-6">
            This certificate ID doesn&apos;t exist or the link may be incorrect.
          </p>
          <a
            href="https://epa608practicetest.net"
            className="inline-flex items-center px-6 py-3 bg-blue-800 text-white rounded-xl font-semibold hover:bg-blue-900 transition-colors"
          >
            Visit EPA608PracticeTest.net
          </a>
        </div>
      </div>
    )
  }

  const formattedDate = new Date(cert.issued_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const schemaMarkup = {
    '@context': 'https://schema.org',
    '@type': 'EducationalOccupationalCredential',
    name: `EPA 608 ${TIER_LABELS[cert.tier]} — ${cert.category}`,
    credentialCategory: 'Certificate of Achievement',
    description: `${cert.user_name} demonstrated proficiency in EPA 608 ${cert.category} with a score of ${cert.score}%.`,
    dateCreated: cert.issued_at,
    recognizedBy: {
      '@type': 'Organization',
      name: 'EPA608PracticeTest.net',
      url: 'https://epa608practicetest.net',
    },
    about: {
      '@type': 'EducationalOccupationalProgram',
      name: 'EPA Section 608 Certification Preparation',
      provider: {
        '@type': 'Organization',
        name: 'EPA608PracticeTest.net',
      },
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaMarkup) }}
      />
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex flex-col items-center justify-center p-4 sm:p-6">
        <PublicCertificate
          certId={cert.id}
          userName={cert.user_name}
          category={cert.category}
          tier={cert.tier}
          score={cert.score}
          totalQuestions={cert.total_questions}
          correctAnswers={cert.correct_answers}
          date={formattedDate}
        />

        <div className="mt-8 text-center">
          <p className="text-gray-500 text-sm mb-4">
            Want to earn your own EPA 608 certificate?
          </p>
          <a
            href="https://epa608practicetest.net"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-800 text-white rounded-xl font-semibold hover:bg-blue-900 transition-colors"
          >
            Start Practicing Free
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </>
  )
}
