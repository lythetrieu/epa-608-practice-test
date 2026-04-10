import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'EPA 608 Practice Test | Free HVAC Certification Prep',
  description:
    'Free EPA 608 HVAC certification practice tests. Core, Type I, Type II, Type III, and Universal exams with instant feedback and progress tracking.',
}

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-white to-blue-50 px-4">
      <div className="max-w-2xl w-full text-center space-y-6">
        <h1 className="text-4xl font-bold text-primary">EPA 608 Practice Test</h1>
        <p className="text-lg text-gray-600">Free HVAC certification prep — Coming soon</p>
        <p className="text-sm text-gray-500">
          Core · Type I · Type II · Type III · Universal
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
          <a href="/signup" className="btn-primary">
            Get started free
          </a>
          <a href="/login" className="btn-secondary">
            Sign in
          </a>
        </div>
      </div>
    </main>
  )
}
