'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const STORAGE_KEY = 'epa608_onboarding_done'

export function Onboarding({ show }: { show: boolean }) {
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (!show) return
    const done = localStorage.getItem(STORAGE_KEY)
    if (!done) setVisible(true)
  }, [show])

  function dismiss() {
    setVisible(false)
    localStorage.setItem(STORAGE_KEY, 'true')
  }

  if (!visible) return null

  const totalSteps = 4

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Content area */}
        <div className="p-6 sm:p-8 min-h-[320px] flex flex-col">
          {step === 0 && <StepWelcome />}
          {step === 1 && <StepCore />}
          {step === 2 && <StepProgress />}
          {step === 3 && <StepAI />}

          {/* Step indicators */}
          <div className="flex items-center justify-center gap-2 mt-6">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  i === step ? 'bg-blue-800 scale-110' : 'bg-gray-300 hover:bg-gray-400'
                }`}
                aria-label={`Go to step ${i + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 sm:px-8 pb-6 flex items-center justify-between">
          <button
            onClick={dismiss}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            Skip
          </button>

          {step < totalSteps - 1 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="px-5 py-2.5 bg-blue-800 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors"
            >
              Next
            </button>
          ) : (
            <Link
              href="/test/core"
              onClick={dismiss}
              className="px-5 py-2.5 bg-blue-800 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors"
            >
              Got it, let&apos;s start!
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

function StepWelcome() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center">
      <div className="text-5xl mb-4">&#128075;</div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">
        Welcome to EPA 608 Practice Test!
      </h2>
      <p className="text-gray-500 text-sm mb-6">
        Let&apos;s get you ready to pass your certification exam.
      </p>

      <div className="flex items-center gap-3 w-full max-w-xs">
        <StepBadge num={1} label="Learn" color="blue" />
        <Arrow />
        <StepBadge num={2} label="Practice" color="green" />
        <Arrow />
        <StepBadge num={3} label="Test" color="red" />
      </div>
    </div>
  )
}

function StepCore() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center">
      <div className="text-5xl mb-4">&#128221;</div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">
        Start with the Core Section
      </h2>
      <p className="text-gray-500 text-sm mb-4">
        Core is required for all EPA 608 certifications &mdash; everyone takes it.
      </p>
      <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-800">
        We recommend <span className="font-semibold">Practice mode</span> first &mdash; no timer, instant feedback on every question.
      </div>
    </div>
  )
}

function StepProgress() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center">
      <div className="text-5xl mb-4">&#128200;</div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">
        Track Your Progress
      </h2>
      <p className="text-gray-500 text-sm mb-5">
        As you practice, we track your scores and identify weak areas.
      </p>

      {/* Mini gauge preview */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 w-full max-w-xs">
        <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Pass Predictor</p>
        <svg viewBox="0 0 100 55" className="w-32 h-[70px] mx-auto">
          <path
            d="M 15 45 A 35 35 0 0 1 85 45"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={8}
            strokeLinecap="round"
          />
          <path
            d="M 15 45 A 35 35 0 0 1 67.5 17.5"
            fill="none"
            stroke="#16a34a"
            strokeWidth={8}
            strokeLinecap="round"
          />
          <text x={50} y={43} textAnchor="middle" className="font-bold" fill="#16a34a" fontSize="16">
            72%
          </text>
        </svg>
        <p className="text-xs text-gray-400 mt-1">Shows when you&apos;re ready for the real exam</p>
      </div>
    </div>
  )
}

function StepAI() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center">
      <div className="text-5xl mb-4">&#129302;</div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">
        AI Tutor Has Your Back
      </h2>
      <p className="text-gray-500 text-sm mb-4">
        Stuck on a question? Ask our AI Tutor for a clear explanation.
      </p>
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800">
        You get <span className="font-semibold">10 free AI queries</span> per day &mdash; use them when you need them.
      </div>
    </div>
  )
}

function StepBadge({ num, label, color }: { num: number; label: string; color: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-800 border-blue-200',
    green: 'bg-green-100 text-green-800 border-green-200',
    red: 'bg-red-100 text-red-800 border-red-200',
  }
  return (
    <div className={`flex-1 rounded-lg border px-2 py-2 text-center ${colors[color]}`}>
      <div className="text-lg font-bold">{num}</div>
      <div className="text-xs font-medium">{label}</div>
    </div>
  )
}

function Arrow() {
  return (
    <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  )
}
