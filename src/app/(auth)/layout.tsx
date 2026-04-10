import Link from 'next/link'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <h1 className="text-2xl font-bold text-blue-800 hover:text-blue-900 transition-colors">
              EPA 608 Practice Test
            </h1>
          </Link>
          <p className="text-gray-400 text-sm mt-1">HVAC Certification Prep</p>
        </div>
        {children}
      </div>
    </div>
  )
}
