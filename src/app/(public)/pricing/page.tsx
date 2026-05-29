import type { Metadata } from 'next'
import Link from 'next/link'
import { Check, X } from 'lucide-react'

export const metadata: Metadata = {
  title: 'EPA 608 Practice Test Pricing — Free Practice + Pro $14.99',
  description:
    'Free EPA 608 practice: 25 questions, all sections, 10 AI queries/day. Pro $14.99 one-time lifetime: unlimited AI, blind-spot training, offline, certificates, pass guarantee.',
}

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-blue-50">
      {/* Nav */}
      <nav className="border-b border-gray-100 bg-white sticky top-0 z-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14">
          <Link href="/" className="text-lg font-bold text-blue-800">EPA 608 Practice Test</Link>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2">Practice Free</Link>
            <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2">Sign In</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-4 pt-16 pb-12 text-center">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight">
          You already know where you&apos;re weak.<br />
          <span className="text-blue-800">Now fix it.</span>
        </h1>
        <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
          Free practice shows your weak spots. Pro gives you the tools to fix them — and a guarantee you&apos;ll pass.
        </p>
      </section>

      {/* Pricing Cards */}
      <section className="mx-auto max-w-4xl px-4 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">

          {/* FREE */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Free</h2>
            <div className="mt-2">
              <span className="text-4xl font-bold text-gray-900">$0</span>
              <span className="text-gray-500 ml-2">forever</span>
            </div>
            <p className="mt-3 text-sm text-gray-600">Everything you need to practice. No signup required — or sign up to sync across devices.</p>

            <div className="mt-6 space-y-3">
              <Feature included text="All 5 sections (Core, I, II, III, Universal)" />
              <Feature included text="Unlimited tests & attempts" />
              <Feature included text="Explanations on every wrong answer" />
              <Feature included text="Weak-spot chart & topic breakdown" />
              <Feature included text="Full session history" />
              <Feature included text="AI Study Helper (10/day)" />
              <Feature included text="Flashcards (all sections)" />
              <Feature included text="Signup = sync history across devices" />
              <Feature included={false} text="Blind-spot drill (auto-targeted test)" />
              <Feature included={false} text="Unlimited AI" />
              <Feature included={false} text="Certificate of completion" />
              <Feature included={false} text="Pass guarantee — full refund" />
            </div>

            <Link href="/" className="mt-8 block w-full text-center px-6 py-3 min-h-[48px] border-2 border-gray-200 text-gray-700 rounded-xl font-semibold text-base hover:bg-gray-50 transition-colors">
              Start Practicing Free
            </Link>
          </div>

          {/* PRO */}
          <div className="bg-white rounded-2xl border-2 border-blue-800 p-6 sm:p-8 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-800 text-white text-xs font-bold px-4 py-1 rounded-full uppercase tracking-wider">
              Most Popular
            </div>
            <h2 className="text-sm font-bold text-blue-800 uppercase tracking-wider">Pro</h2>
            <div className="mt-2">
              <span className="text-4xl font-bold text-gray-900">$14.99</span>
              <span className="text-gray-500 ml-2">one-time, lifetime</span>
            </div>
            <p className="mt-3 text-sm text-gray-600">For technicians who need to pass fast — and want proof they did.</p>

            <div className="mt-6 space-y-3">
              <Feature included text="Everything in Free" />
              <Feature included text="Blind-spot drill — auto test your weak topics" bold />
              <Feature included text="Unlimited AI Study Helper" bold />
              <Feature included text="Certificate of completion (shareable PDF)" bold />
              <Feature included text="Pass guarantee — full refund if you fail" bold />
            </div>

            <Link href="/signup" className="mt-8 block w-full text-center px-6 py-3 min-h-[48px] bg-blue-800 text-white rounded-xl font-bold text-base hover:bg-blue-900 transition-colors">
              Get Pro — $14.99
            </Link>
            <p className="mt-3 text-center text-xs text-gray-500">One-time payment. Lifetime access. Money back if you don&apos;t pass.</p>
          </div>
        </div>

        {/* Social proof */}
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500">
            SkillCat charges $10/month (recurring). We charge $14.99 once (lifetime).
          </p>
        </div>

        {/* Pass Guarantee */}
        <div className="mt-12 max-w-2xl mx-auto bg-blue-50 border border-blue-200 rounded-2xl p-6 sm:p-8 text-center">
          <h3 className="text-xl font-bold text-blue-900 mb-3">Pass Guarantee</h3>
          <p className="text-sm text-blue-800 leading-relaxed">
            Complete 10+ practice tests scoring 70%+. Take the real EPA 608 exam within 90 days.
            If you don&apos;t pass on your first attempt, send us your score report — we refund 100%. No questions asked.
          </p>
        </div>

        {/* Enterprise */}
        <div className="mt-12 text-center">
          <p className="text-gray-600 mb-2">Training a team of HVAC technicians?</p>
          <Link href="/contact.html" className="text-blue-800 font-semibold hover:underline">
            Contact us for enterprise pricing →
          </Link>
        </div>
      </section>
    </main>
  )
}

function Feature({ included, text, bold }: { included: boolean; text: string; bold?: boolean }) {
  return (
    <div className="flex items-start gap-3">
      {included ? (
        <Check size={18} className="text-green-600 shrink-0 mt-0.5" />
      ) : (
        <X size={18} className="text-gray-300 shrink-0 mt-0.5" />
      )}
      <span className={`text-sm ${included ? (bold ? 'text-gray-900 font-semibold' : 'text-gray-700') : 'text-gray-400'}`}>
        {text}
      </span>
    </div>
  )
}
