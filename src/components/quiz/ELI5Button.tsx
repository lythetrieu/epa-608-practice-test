'use client'
import { Bot } from 'lucide-react'

/**
 * "Simple Explanation" AI button — opens the floating AI Tutor bubble with a
 * prefilled prompt (never auto-sent) asking for a plain-language walkthrough
 * of why the correct answer is correct. Used in Practice mode after a wrong
 * answer is revealed. Quota (10/month free, 1,000/month Pro) is enforced by
 * the tutor chat backend — shared counter with the tutor.
 */
export function ELI5Button({ questionText, correctAnswer }: { questionText: string; correctAnswer: string }) {
  function handleClick() {
    const prompt = `Explain this question in simple terms:\n\n${questionText}\n\nThe correct answer is ${correctAnswer}. Why?`
    window.dispatchEvent(new CustomEvent('epa608:open-tutor', { detail: { prompt } }))
  }

  return (
    <button onClick={handleClick}
      className="mt-3 inline-flex items-center gap-2 text-sm px-4 py-2.5 min-h-[44px] rounded-xl border border-gray-300 bg-white text-blue-800 hover:bg-blue-50 font-medium">
      <Bot size={16} /> Explain Simply
    </button>
  )
}
