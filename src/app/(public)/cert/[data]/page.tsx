import { Metadata } from 'next'
import PublicCertificate from './PublicCertificate'

type CertData = {
  n: string   // name
  c: string[] // passed categories
  s: number   // best score
  sc: string  // best score category
  d: string   // date
}

function decodeCert(data: string): CertData | null {
  try {
    const json = Buffer.from(data, 'base64url').toString('utf-8')
    const parsed = JSON.parse(json)
    if (!parsed.n || !Array.isArray(parsed.c) || typeof parsed.s !== 'number') {
      return null
    }
    return parsed as CertData
  } catch {
    return null
  }
}

type Props = {
  params: Promise<{ data: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { data } = await params
  const cert = decodeCert(data)
  if (!cert) {
    return { title: 'Certificate | EPA 608 Practice Test' }
  }
  return {
    title: `${cert.n}'s EPA 608 Certificate | EPA608PracticeTest.net`,
    description: `${cert.n} passed ${cert.c.join(', ')} with a best score of ${cert.s}%. Prepared with EPA608PracticeTest.net - the free EPA 608 practice test platform.`,
    openGraph: {
      title: `${cert.n} is EPA 608 Exam Ready!`,
      description: `Passed ${cert.c.join(', ')} with ${cert.s}% on ${cert.sc}. Practice free at EPA608PracticeTest.net`,
      siteName: 'EPA608PracticeTest.net',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${cert.n} is EPA 608 Exam Ready!`,
      description: `Passed ${cert.c.join(', ')} with ${cert.s}% on ${cert.sc}. Practice free at EPA608PracticeTest.net`,
    },
  }
}

export default async function PublicCertPage({ params }: Props) {
  const { data } = await params
  const cert = decodeCert(data)

  if (!cert) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center max-w-md">
          <div className="text-5xl mb-4">🔗</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Invalid Certificate Link</h1>
          <p className="text-gray-500 text-sm mb-6">
            This certificate link appears to be invalid or corrupted.
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

  const formattedDate = new Date(cert.d).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex flex-col items-center justify-center p-6">
      <PublicCertificate
        userName={cert.n}
        passedCategories={cert.c}
        bestScore={cert.s}
        bestCategory={cert.sc}
        date={formattedDate}
      />

      {/* CTA */}
      <div className="mt-8 text-center">
        <p className="text-gray-500 text-sm mb-4">
          Want to earn your own EPA 608 Practice Champion certificate?
        </p>
        <a
          href="https://epa608practicetest.net"
          className="inline-flex items-center px-6 py-3 bg-blue-800 text-white rounded-xl font-semibold hover:bg-blue-900 transition-colors"
        >
          Start Practicing Free
        </a>
      </div>
    </div>
  )
}
