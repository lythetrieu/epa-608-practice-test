import Link from 'next/link'

export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-blue-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 max-w-md w-full text-center">
        <div className="text-5xl mb-4">🎓</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Join EPA 608 Team</h1>
        <p className="text-gray-500 mb-2 text-sm">
          You&apos;ve been invited to join a team account with full access to all practice tests,
          progress tracking, and more.
        </p>
        <p className="text-xs text-gray-400 mb-8">
          After signing in or creating an account, you&apos;ll be automatically added to your team.
        </p>
        <div className="space-y-3">
          <Link
            href={`/signup?join=${code}`}
            className="block w-full py-3 bg-blue-800 text-white rounded-xl font-semibold hover:bg-blue-900 transition-colors"
          >
            Create Account &amp; Join
          </Link>
          <Link
            href={`/login?join=${code}`}
            className="block w-full py-3 border border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
          >
            Sign In &amp; Join
          </Link>
        </div>
        <p className="text-xs text-gray-400 mt-6">
          <Link href="/" className="hover:underline">
            EPA 608 Practice Test
          </Link>{' '}
          · HVAC Certification Prep
        </p>
      </div>
    </div>
  )
}
