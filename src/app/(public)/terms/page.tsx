import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terms of Service | EPA 608 Practice Test',
  description:
    'Terms of Service for EPA608PracticeTest.net — free and paid EPA 608 HVAC certification practice test platform.',
}

export default function TermsPage() {
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
        <h1 className="text-3xl font-extrabold text-gray-900">Terms of Service</h1>
        <p className="mt-2 text-sm text-gray-500">Last updated: January 1, 2026</p>

        <div className="mt-10 space-y-8 text-gray-700 text-[15px] leading-relaxed">
          {/* 1 */}
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">1. Agreement to Terms</h2>
            <p>
              By accessing or using EPA608PracticeTest.net (the &ldquo;Service&rdquo;), you agree to
              be bound by these Terms of Service. If you do not agree, you may not use the Service.
              These terms apply to all visitors, free-tier users, and paid subscribers.
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">2. Description of Service</h2>
            <p>
              EPA608PracticeTest.net is a web-based practice-test platform designed to help HVAC
              technicians prepare for the EPA Section 608 certification exam. The Service offers
              practice questions, progress tracking, analytics, and AI-assisted study tools across
              free and paid tiers.
            </p>
            <p className="mt-2">
              The Service is an independent study aid. We are not affiliated with, endorsed by, or
              partnered with the U.S. Environmental Protection Agency (EPA) or any EPA-approved
              certification body.
            </p>
          </section>

          {/* 3 */}
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">3. Account Registration</h2>
            <p>
              To use certain features you must create an account by providing a valid email address
              or signing in through a supported third-party provider (e.g., Google). You are
              responsible for maintaining the confidentiality of your account credentials and for all
              activity under your account.
            </p>
          </section>

          {/* 4 */}
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">4. Free and Paid Plans</h2>
            <p>
              The Service offers a free tier with limited access and paid plans (Starter, Ultimate)
              that provide additional features. Paid plans are one-time purchases granting lifetime
              access to the features described at the time of purchase. Pricing, features, and plan
              availability may change; existing purchases will not be affected.
            </p>
          </section>

          {/* 5 */}
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">5. Payments and Refunds</h2>
            <p>
              Payments are processed securely through our payment provider, Paddle. All sales of
              digital goods are final. Because the Service delivers instant access to digital
              content, refunds are generally not available, except where required by applicable law
              or where a specific pass-guarantee is included with your plan.
            </p>
          </section>

          {/* 6 */}
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">6. User Responsibilities</h2>
            <ul className="list-disc pl-5 space-y-1 mt-1">
              <li>Use the Service only for lawful purposes related to EPA 608 exam preparation.</li>
              <li>Do not share, redistribute, or scrape questions, answers, or other proprietary content.</li>
              <li>Do not attempt to reverse-engineer, decompile, or tamper with the Service.</li>
              <li>Do not create multiple accounts to circumvent free-tier limits.</li>
            </ul>
          </section>

          {/* 7 */}
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">7. Intellectual Property</h2>
            <p>
              All content, software, design, and trademarks on the Service are owned by
              EPA608PracticeTest.net or its licensors. You may not copy, modify, or distribute any
              part of the Service without prior written consent.
            </p>
          </section>

          {/* 8 */}
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">8. Disclaimer of Warranties</h2>
            <p>
              The Service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without
              warranties of any kind, whether express or implied. We do not guarantee that using the
              Service will result in passing the EPA 608 certification exam. Practice questions are
              for study purposes only and may not reflect the exact content of the official exam.
            </p>
          </section>

          {/* 9 */}
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">9. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, EPA608PracticeTest.net and its operators shall
              not be liable for any indirect, incidental, special, consequential, or punitive
              damages arising out of your use of or inability to use the Service. Our total liability
              shall not exceed the amount you paid for the Service in the twelve months preceding the
              claim.
            </p>
          </section>

          {/* 10 */}
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">10. Termination</h2>
            <p>
              We may suspend or terminate your account at our discretion if you violate these terms.
              Upon termination, your right to use the Service ceases immediately. Sections regarding
              intellectual property, limitation of liability, and governing law survive termination.
            </p>
          </section>

          {/* 11 */}
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">11. Changes to Terms</h2>
            <p>
              We may update these Terms from time to time. Material changes will be communicated via
              email or a notice on the Service. Continued use after changes constitutes acceptance of
              the revised terms.
            </p>
          </section>

          {/* 12 */}
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">12. Governing Law</h2>
            <p>
              These Terms are governed by the laws of the United States. Any disputes shall be
              resolved in the courts of competent jurisdiction.
            </p>
          </section>

          {/* 13 */}
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">13. Contact</h2>
            <p>
              If you have questions about these Terms, please contact us at{' '}
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
