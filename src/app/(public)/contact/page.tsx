import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Contact Us | EPA 608 Practice Test',
  description:
    'Get in touch with the EPA608PracticeTest.net team. Support, questions, and feedback.',
}

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-blue-50">
      {/* Nav */}
      <nav className="border-b border-gray-100 bg-white sticky top-0 z-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14">
          <Link href="/" className="text-lg font-bold text-blue-800">
            EPA 608 Practice Test
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900">
              Sign in
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-lg bg-blue-800 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-900 transition-colors"
            >
              Get started free
            </Link>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-3xl font-extrabold text-gray-900">Contact Us</h1>
        <p className="mt-3 text-gray-600 text-[15px] leading-relaxed">
          Have a question, found a bug, or need help with your account? We&apos;re here to help.
        </p>

        <div className="mt-10 space-y-8">
          {/* Email */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Email Support</h2>
            <p className="text-gray-600 text-[15px] mb-4">
              The fastest way to reach us. We typically respond within 24&ndash;48 hours.
            </p>
            <a
              href="mailto:support@epa608practicetest.net"
              className="inline-flex items-center gap-2 text-blue-800 font-semibold text-[15px] hover:underline"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              support@epa608practicetest.net
            </a>
          </div>

          {/* What to include */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
            <h2 className="text-lg font-bold text-gray-900 mb-3">
              What to Include in Your Message
            </h2>
            <ul className="list-disc pl-5 space-y-1.5 text-gray-600 text-[15px]">
              <li>Your account email address (if applicable).</li>
              <li>A clear description of your question or issue.</li>
              <li>Screenshots or error messages, if relevant.</li>
              <li>The device and browser you are using.</li>
            </ul>
          </div>

          {/* Common questions */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
            <h2 className="text-lg font-bold text-gray-900 mb-3">Before You Reach Out</h2>
            <p className="text-gray-600 text-[15px] mb-3">
              Many common questions are already answered in our FAQ. Check there first &mdash; it
              may save you time.
            </p>
            <Link
              href="/faq"
              className="inline-flex items-center justify-center rounded-lg border border-blue-800 px-5 py-2.5 text-sm font-semibold text-blue-800 hover:bg-blue-50 transition-colors"
            >
              View FAQ
            </Link>
          </div>

          {/* Business inquiries */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Business &amp; Team Inquiries</h2>
            <p className="text-gray-600 text-[15px]">
              Looking for volume pricing or team management for your HVAC training program? Email us
              at{' '}
              <a
                href="mailto:support@epa608practicetest.net"
                className="text-blue-800 underline"
              >
                support@epa608practicetest.net
              </a>{' '}
              with the subject line &ldquo;Business Inquiry&rdquo; and we&apos;ll get back to you
              within one business day.
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
