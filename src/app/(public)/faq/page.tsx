import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import FaqAccordion from './FaqAccordion'

export const metadata: Metadata = {
  title: 'FAQ | EPA 608 Practice Test',
  description:
    'Frequently asked questions about EPA608PracticeTest.net — exam prep, pricing, features, and more.',
}

export default async function FaqPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-blue-50">
      {/* Nav */}
      <nav className="border-b border-gray-100 bg-white sticky top-0 z-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14">
          <Link
            href={user ? '/dashboard' : '/'}
            className="text-lg font-bold text-blue-800"
          >
            EPA 608 Practice Test
          </Link>
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <span className="text-sm text-gray-500">{user.email}</span>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center justify-center rounded-lg bg-blue-800 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-900 transition-colors"
                >
                  Dashboard
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center rounded-lg bg-blue-800 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-900 transition-colors"
                >
                  Get started free
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900">
            Frequently Asked Questions
          </h1>
          <p className="mt-4 text-lg text-gray-500">
            Everything you need to know about EPA608PracticeTest.net and the EPA
            Section 608 certification exam.
          </p>
        </div>

        {/* Accordion sections */}
        <FaqAccordion />

        {/* Still have questions? */}
        <section className="mt-16 rounded-2xl border border-gray-200 bg-white p-8 text-center">
          <h2 className="text-lg font-bold text-gray-900">
            Still have questions?
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            We&apos;re here to help. Reach out and we&apos;ll get back to you as
            soon as possible.
          </p>
          <Link
            href="/contact"
            className="mt-4 inline-flex items-center justify-center rounded-lg border border-blue-800 px-6 py-3 text-sm font-semibold text-blue-800 hover:bg-blue-50 transition-colors"
          >
            Contact us
          </Link>
        </section>
      </div>
    </main>
  )
}
