import type { Metadata } from 'next'
import Link from 'next/link'
import { PlanCard, type PlanCardData } from './PlanCard'

export const metadata: Metadata = {
  title: 'Pricing | EPA 608 Practice Test',
  description:
    'Simple one-time pricing for EPA 608 certification prep. Free plan available. Starter and Ultimate lifetime access options.',
}

// ─── Plan data ───────────────────────────────────────────────────────────────

const PLANS: PlanCardData[] = [
  {
    name: 'Free',
    price: '$0',
    priceNote: 'forever',
    description: 'Full experience with Core category — no credit card, no limits.',
    features: [
      { text: 'Core category (full access)', included: true },
      { text: 'Unlimited practice questions', included: true },
      { text: 'Detailed answer explanations', included: true },
      { text: 'Progress tracking & analytics', included: true },
      { text: 'Blind-spot training mode', included: true },
      { text: 'AI tutor (5 queries/day)', included: true },
      { text: 'All 4 categories (I, II, III)', included: false },
      { text: 'PDF study guide download', included: false },
      { text: 'AI tutor (20+ queries/day)', included: false },
    ],
    cta: 'Get started free',
    ctaHref: '/signup',
  },
  {
    name: 'Starter',
    price: '$19.99',
    priceNote: 'one-time, lifetime access',
    description: 'Everything you need to pass the EPA 608 on your first try.',
    highlighted: true,
    features: [
      { text: 'All 4 categories (Core, I, II, III)', included: true },
      { text: 'Unlimited questions per day', included: true },
      { text: 'Detailed answer explanations', included: true },
      { text: 'Progress tracking & analytics', included: true },
      { text: 'Blind-spot training mode', included: true },
      { text: 'PDF study guide download', included: true },
      { text: 'AI tutor (20 queries/day)', included: true },
      { text: 'AI tutor (100 queries/day)', included: false },
      { text: 'Pass guarantee', included: false },
    ],
    cta: 'Buy Starter — $19.99',
  },
  {
    name: 'Ultimate',
    price: '$29.99',
    priceNote: 'one-time, lifetime access',
    description: 'Maximum AI support and a pass guarantee — or your money back.',
    features: [
      { text: 'Everything in Starter', included: true },
      { text: 'AI tutor (100 queries/day)', included: true },
      { text: 'Pass guarantee (or full refund)', included: true },
      { text: 'Priority email support', included: true },
      { text: 'Early access to new features', included: true },
      { text: 'All 4 categories (Core, I, II, III)', included: true },
      { text: 'Unlimited questions per day', included: true },
      { text: 'Progress tracking & analytics', included: true },
      { text: 'PDF study guide download', included: true },
    ],
    cta: 'Buy Ultimate — $29.99',
  },
]

// ─── Page ───────────────────────────────────────────────────────────────────

export default function PricingPage() {
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

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16 space-y-16">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto">
          <h1 className="text-4xl font-extrabold text-gray-900">
            Simple, one-time pricing
          </h1>
          <p className="mt-4 text-lg text-gray-500">
            No subscriptions. No recurring fees. Pay once, study forever.
          </p>
        </div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          {PLANS.map((plan) => (
            <PlanCard key={plan.name} plan={plan} />
          ))}
        </div>

        {/* Business / Team tier */}
        <section className="rounded-2xl border border-gray-200 bg-white p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Business / Team</h2>
            <p className="mt-1 text-gray-500 text-sm max-w-lg">
              Training 5 or more technicians? Get volume pricing, centralised team management,
              seat assignment, and admin reporting. Contact us for a custom quote.
            </p>
          </div>
          <Link
            href="/contact"
            className="shrink-0 inline-flex items-center justify-center rounded-lg border border-blue-800 px-6 py-3 text-sm font-semibold text-blue-800 hover:bg-blue-50 transition-colors"
          >
            Contact us
          </Link>
        </section>

        {/* Trust signals */}
        <section className="text-center space-y-3">
          <p className="text-sm text-gray-500 font-medium uppercase tracking-wide">
            Why thousands of HVAC techs choose us
          </p>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-600">
            {[
              '500+ verified questions',
              'Built from 2023–2024 exam content',
              'No subscription — pay once',
              'Pass guarantee on Ultimate',
              '100% data private — stays on your device',
            ].map((point) => (
              <span key={point} className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {point}
              </span>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
