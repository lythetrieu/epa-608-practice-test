import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy | EPA 608 Practice Test',
  description:
    'Privacy Policy for EPA608PracticeTest.net — how we collect, use, and protect your data.',
}

export default function PrivacyPage() {
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
        <h1 className="text-3xl font-extrabold text-gray-900">Privacy Policy</h1>
        <p className="mt-2 text-sm text-gray-500">Last updated: January 1, 2026</p>

        <div className="mt-10 space-y-8 text-gray-700 text-[15px] leading-relaxed">
          {/* 1 */}
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">1. Introduction</h2>
            <p>
              EPA608PracticeTest.net (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;)
              respects your privacy. This Privacy Policy explains what information we collect, how we
              use it, and your rights regarding your data when you use our Service.
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">2. Information We Collect</h2>
            <p className="mb-2">We collect the following categories of information:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Account information:</strong> email address, name (if provided), and
                authentication credentials when you create an account or sign in via Google OAuth.
              </li>
              <li>
                <strong>Test and study data:</strong> your practice test answers, scores, progress
                metrics, and study session history.
              </li>
              <li>
                <strong>Payment information:</strong> when you purchase a paid plan, payment details
                are collected and processed by our payment provider (Paddle). We do not store your
                full credit card number.
              </li>
              <li>
                <strong>Usage data:</strong> pages visited, features used, browser type, and device
                information to improve the Service.
              </li>
            </ul>
          </section>

          {/* 3 */}
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">3. How We Use Your Information</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Provide, maintain, and improve the Service.</li>
              <li>Track your study progress and generate personalized recommendations.</li>
              <li>Process payments and manage your subscription.</li>
              <li>Send transactional emails (account confirmation, password resets, purchase receipts).</li>
              <li>Respond to support requests.</li>
              <li>Detect and prevent fraud or abuse.</li>
            </ul>
          </section>

          {/* 4 */}
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">4. Third-Party Services</h2>
            <p className="mb-2">
              We use the following third-party services to operate the platform. Each processes data
              only as necessary to provide its function:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Supabase</strong> &mdash; authentication and database hosting.
              </li>
              <li>
                <strong>Paddle</strong> &mdash; payment processing and sales tax compliance.
              </li>
              <li>
                <strong>Resend</strong> &mdash; transactional email delivery.
              </li>
              <li>
                <strong>Google</strong> &mdash; OAuth sign-in (only if you choose to sign in with
                Google).
              </li>
            </ul>
            <p className="mt-2">
              We do not sell, rent, or share your personal information with third parties for
              marketing purposes.
            </p>
          </section>

          {/* 5 */}
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">5. Cookies</h2>
            <p>
              We use essential cookies only, specifically for authentication and session management.
              We do not use advertising cookies, tracking pixels, or third-party analytics cookies.
              Because these cookies are strictly necessary for the Service to function, they do not
              require separate consent under most cookie laws.
            </p>
          </section>

          {/* 6 */}
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">6. Data Security</h2>
            <p>
              We implement industry-standard security measures including encrypted connections
              (HTTPS/TLS), secure authentication tokens, and access controls. While no system is
              100% secure, we take reasonable steps to protect your data from unauthorized access,
              alteration, or destruction.
            </p>
          </section>

          {/* 7 */}
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">7. Data Retention</h2>
            <p>
              We retain your account and study data for as long as your account is active. If you
              delete your account, we will remove your personal data within 30 days, except where
              retention is required by law (e.g., payment records for tax purposes).
            </p>
          </section>

          {/* 8 */}
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">8. Your Rights</h2>
            <p className="mb-2">
              Depending on your location, you may have the following rights under applicable data
              protection laws (including GDPR and CCPA):
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Access:</strong> request a copy of the personal data we hold about you.
              </li>
              <li>
                <strong>Correction:</strong> request correction of inaccurate data.
              </li>
              <li>
                <strong>Deletion:</strong> request deletion of your personal data.
              </li>
              <li>
                <strong>Portability:</strong> request your data in a machine-readable format.
              </li>
              <li>
                <strong>Opt-out of sale:</strong> we do not sell personal data, so there is nothing
                to opt out of.
              </li>
            </ul>
            <p className="mt-2">
              To exercise any of these rights, email us at{' '}
              <a href="mailto:support@epa608practicetest.net" className="text-blue-800 underline">
                support@epa608practicetest.net
              </a>
              . We will respond within 30 days.
            </p>
          </section>

          {/* 9 */}
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">9. Children&apos;s Privacy</h2>
            <p>
              The Service is not directed at children under 13. We do not knowingly collect personal
              information from children under 13. If you believe a child has provided us with
              personal data, please contact us and we will delete it promptly.
            </p>
          </section>

          {/* 10 */}
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">10. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of material
              changes by posting the updated policy on this page and updating the &ldquo;Last
              updated&rdquo; date. Continued use of the Service after changes constitutes acceptance
              of the revised policy.
            </p>
          </section>

          {/* 11 */}
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">11. Contact Us</h2>
            <p>
              For privacy-related questions or data requests, contact us at{' '}
              <a href="mailto:support@epa608practicetest.net" className="text-blue-800 underline">
                support@epa608practicetest.net
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </main>
  )
}
