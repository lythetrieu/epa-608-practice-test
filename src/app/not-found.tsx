import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-white rounded-xl border border-gray-200 p-10">
          <p className="text-6xl font-bold text-blue-800">404</p>
          <h1 className="mt-4 text-xl font-semibold text-gray-900">Page not found</h1>
          <p className="mt-2 text-sm text-gray-500">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/"
              className="px-5 py-2.5 bg-blue-800 text-white rounded-xl text-sm font-semibold hover:bg-blue-900 transition-colors"
            >
              Go home
            </Link>
            <Link
              href="/dashboard"
              className="px-5 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
