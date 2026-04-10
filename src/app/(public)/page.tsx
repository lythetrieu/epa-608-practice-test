import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'EPA 608 Practice Test | Free HVAC Certification Prep',
  description:
    'Free EPA 608 HVAC certification practice tests. Core, Type I, Type II, Type III, and Universal exams with instant feedback, AI tutor, and progress tracking.',
}

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-blue-50">
      {/* Nav */}
      <nav className="border-b border-gray-100 bg-white/80 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14">
          <span className="text-lg font-bold text-blue-800">EPA 608 Practice Test</span>
          <div className="flex gap-3">
            <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2">
              Sign in
            </Link>
            <Link href="/signup" className="text-sm bg-blue-800 text-white px-4 py-2 rounded-lg hover:bg-blue-900 font-medium">
              Get started free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-4 pt-20 pb-16 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight">
          Pass Your EPA 608 Exam<br />
          <span className="text-blue-800">On the First Try</span>
        </h1>
        <p className="mt-6 text-lg text-gray-600 max-w-2xl mx-auto">
          Free practice tests with 531 real exam questions, AI-powered tutoring, blind-spot training, and progress tracking. Built for HVAC technicians.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/signup" className="px-8 py-3 bg-blue-800 text-white rounded-xl font-semibold text-lg hover:bg-blue-900 transition-colors">
            Start Practicing Free
          </Link>
          <Link href="/pricing" className="px-8 py-3 border-2 border-gray-200 text-gray-700 rounded-xl font-semibold text-lg hover:bg-gray-50 transition-colors">
            View Pricing
          </Link>
        </div>
        <p className="mt-4 text-sm text-gray-400">No credit card required. Core section is 100% free.</p>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-4 pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <FeatureCard icon="📝" title="531 Exam Questions" desc="Verified questions covering Core, Type I, Type II, and Type III with detailed explanations." />
          <FeatureCard icon="🎯" title="Blind-Spot Training" desc="AI identifies your weakest topics and builds custom quizzes to fix knowledge gaps." />
          <FeatureCard icon="🎓" title="AI Tutor" desc="Ask questions about any EPA 608 topic. Get instant, accurate answers from your personal tutor." />
          <FeatureCard icon="🃏" title="Flashcards" desc="Swipe-based study cards for quick review. Perfect for studying on the go." />
          <FeatureCard icon="🎧" title="Podcast Mode" desc="Listen to questions and answers while driving. Study hands-free with text-to-speech." />
          <FeatureCard icon="📊" title="Progress Tracking" desc="See your readiness score, streak, and weak areas. Know exactly when you're ready to test." />
          <FeatureCard icon="⏱️" title="Timed Tests" desc="Simulate the real exam with 25 questions per section, countdown timer, and 70% pass requirement." />
          <FeatureCard icon="📱" title="Works Offline" desc="Download questions for offline study. Practice in basements, rooftops, or anywhere without signal." />
          <FeatureCard icon="🏆" title="Shareable Certificate" desc="Earn a digital certificate when you pass. Share your achievement on social media." />
        </div>
      </section>

      {/* CTA */}
      <section className="bg-blue-800 py-16 text-center">
        <h2 className="text-3xl font-bold text-white mb-4">Ready to Get Certified?</h2>
        <p className="text-blue-100 mb-8 max-w-lg mx-auto">
          Join thousands of HVAC technicians who passed their EPA 608 exam using our platform.
        </p>
        <Link href="/signup" className="px-8 py-3 bg-white text-blue-800 rounded-xl font-bold text-lg hover:bg-blue-50 transition-colors">
          Create Free Account
        </Link>
      </section>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-100 py-10 px-4">
        <div className="mx-auto max-w-5xl flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-sm text-gray-400">
            &copy; {new Date().getFullYear()} EPA608PracticeTest.net. Not affiliated with the EPA.
          </div>
          <div className="flex gap-6 text-sm text-gray-500">
            <Link href="/pricing" className="hover:text-gray-700">Pricing</Link>
            <Link href="/terms" className="hover:text-gray-700">Terms</Link>
            <Link href="/privacy" className="hover:text-gray-700">Privacy</Link>
            <Link href="/contact" className="hover:text-gray-700">Contact</Link>
          </div>
        </div>
      </footer>
    </main>
  )
}

function FeatureCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6 hover:shadow-md transition-shadow">
      <div className="text-3xl mb-3">{icon}</div>
      <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-500">{desc}</p>
    </div>
  )
}
