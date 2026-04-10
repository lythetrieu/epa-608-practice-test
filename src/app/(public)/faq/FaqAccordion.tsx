'use client'

import { useState } from 'react'

// ─── FAQ data ────────────────────────────────────────────────────────────────

interface FaqItem {
  q: string
  a: string
}

interface FaqSection {
  title: string
  items: FaqItem[]
}

const SECTIONS: FaqSection[] = [
  {
    title: 'About the Platform',
    items: [
      {
        q: 'What is EPA608PracticeTest.net?',
        a: 'EPA608PracticeTest.net is a free online practice-test platform built to help HVAC technicians prepare for the EPA Section 608 certification exam. We offer hundreds of practice questions across all four certification categories — Core, Type I, Type II, and Type III — along with detailed explanations, progress tracking, AI-powered tutoring, and analytics.',
      },
      {
        q: 'Is this an official EPA testing site?',
        a: 'No. We are an independent study-aid platform and are not affiliated with, endorsed by, or partnered with the U.S. Environmental Protection Agency (EPA) or any EPA-approved certification body. To take the official exam you must register with an EPA-approved testing organization.',
      },
      {
        q: 'How many questions are in the question bank?',
        a: 'Our question bank contains over 500 verified practice questions covering all four EPA 608 categories. Questions are modeled on actual 2023\u20132024 exam content and are continuously reviewed for accuracy.',
      },
      {
        q: 'How often are questions updated?',
        a: 'We review and update our question bank on a rolling basis. When the EPA publishes rule changes or updates exam topics, we revise existing questions and add new ones to keep the content current.',
      },
    ],
  },
  {
    title: 'Exam Prep',
    items: [
      {
        q: 'What is the EPA Section 608 certification?',
        a: 'EPA Section 608 certification is required by federal law for any technician who purchases, handles, or disposes of refrigerants. The certification proves you understand proper refrigerant handling practices and environmental regulations under the Clean Air Act.',
      },
      {
        q: 'What score do I need to pass?',
        a: 'You need a score of 70% or higher on each section of the exam to earn that certification type. Each section is scored independently, so you can pass some types and not others.',
      },
      {
        q: 'How many questions are on the real exam?',
        a: 'The Core section has 25 questions, and each specialty section (Type I, Type II, Type III) has 25 questions as well. To earn Universal certification you must pass all four sections — 100 questions total.',
      },
      {
        q: "What's the difference between Type I, II, III, and Universal?",
        a: 'Type I covers small appliances (5 lbs of refrigerant or less), such as household refrigerators and window AC units. Type II covers high-pressure equipment like residential and commercial air conditioning. Type III covers low-pressure equipment such as centrifugal chillers. Universal certification means you have passed all three types plus the Core section and can work on any equipment.',
      },
      {
        q: 'Can I use a calculator on the exam?',
        a: 'No. Calculators are not permitted on the EPA 608 exam. However, any math on the test is straightforward and does not require a calculator. Our practice tests mirror this — no calculator-dependent questions.',
      },
    ],
  },
  {
    title: 'Account & Billing',
    items: [
      {
        q: 'Is the free plan really free forever?',
        a: 'Yes. The free plan gives you full access to the Core category with unlimited practice questions, detailed explanations, progress tracking, and 5 AI tutor queries per day — no credit card required, no time limit, no catch.',
      },
      {
        q: 'What do I get with Starter vs Ultimate?',
        a: 'Starter ($19.99 one-time) unlocks all four categories, 20 AI tutor queries per day, and a downloadable PDF study guide. Ultimate ($29.99 one-time) includes everything in Starter plus 100 AI tutor queries per day, a pass guarantee (full refund if you don\u2019t pass), priority support, and early access to new features.',
      },
      {
        q: 'Is it a subscription or one-time payment?',
        a: 'One-time payment. Both Starter and Ultimate are single purchases that grant lifetime access. There are no recurring charges or hidden fees.',
      },
      {
        q: 'How do I upgrade my plan?',
        a: 'Log in to your account and visit the Pricing page. Click the plan you want and complete the checkout. Your account is upgraded instantly and you only pay the difference if upgrading from Starter to Ultimate.',
      },
      {
        q: "What's your refund policy?",
        a: 'Because the service delivers instant access to digital content, sales are generally final. The Ultimate plan includes a pass guarantee — if you can document that you did not pass the official EPA 608 exam after using our platform, we will issue a full refund. See our Terms of Service for details.',
      },
    ],
  },
  {
    title: 'Features',
    items: [
      {
        q: 'How does the AI Tutor work?',
        a: 'The AI Tutor lets you ask natural-language questions about any EPA 608 topic and get instant, detailed explanations. It can also break down why a specific answer is correct or incorrect. Free users get 5 queries per day; paid plans include 20 or 100 queries per day.',
      },
      {
        q: 'What is Blind-Spot Training?',
        a: 'Blind-Spot Training analyzes your answer history to identify the specific topics where you score lowest. It then generates a focused mini-test targeting those weak areas so you can improve efficiently instead of re-studying material you already know.',
      },
      {
        q: 'Can I study offline?',
        a: 'Currently the platform requires an internet connection. We are exploring offline support for a future update. In the meantime, paid plans include a downloadable PDF study guide you can use anywhere.',
      },
      {
        q: 'How does the Pass Predictor work?',
        a: 'The Pass Predictor uses your recent accuracy, question coverage, and improvement trends to estimate your likelihood of passing each section of the real exam. It updates in real time as you practice so you know when you are truly ready to test.',
      },
    ],
  },
]

// ─── Component ───────────────────────────────────────────────────────────────

export default function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState<string | null>(null)

  function toggle(key: string) {
    setOpenIndex((prev) => (prev === key ? null : key))
  }

  return (
    <div className="space-y-10">
      {SECTIONS.map((section) => (
        <div key={section.title}>
          <h2 className="text-xl font-bold text-gray-900 mb-4">{section.title}</h2>
          <div className="space-y-3">
            {section.items.map((item, i) => {
              const key = `${section.title}-${i}`
              const isOpen = openIndex === key
              return (
                <div
                  key={key}
                  className="rounded-xl border border-gray-200 bg-white overflow-hidden"
                >
                  <button
                    onClick={() => toggle(key)}
                    className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left text-[15px] font-semibold text-gray-900 hover:bg-gray-50 transition-colors"
                  >
                    <span>{item.q}</span>
                    <svg
                      className={`w-5 h-5 shrink-0 text-gray-400 transition-transform duration-200 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-4 text-[15px] leading-relaxed text-gray-600">
                      {item.a}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
