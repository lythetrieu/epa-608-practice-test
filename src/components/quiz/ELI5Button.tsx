'use client'
import { useState } from 'react'
import { Bot } from 'lucide-react'

/**
 * "Simple Explanation" AI button — calls /api/ai/explain to get a plain-language
 * walkthrough of why the correct answer is correct. Used in Practice mode after
 * a wrong answer is revealed.
 */
export function ELI5Button({ questionText, correctAnswer }: { questionText: string; correctAnswer: string }) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [explanation, setExplanation] = useState('')

  async function handleClick() {
    if (state === 'done') return
    setState('loading')
    try {
      const res = await fetch('/api/ai/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionText, correctAnswer, userAnswer: 'wrong' }),
        signal: AbortSignal.timeout(30000),
      })
      const data = await res.json()
      if (!res.ok || !data.explanation) { setState('error'); return }
      setExplanation(data.explanation)
      setState('done')
    } catch { setState('error') }
  }

  if (state === 'done') {
    return (
      <div className="mt-3 bg-purple-50 border border-purple-200 rounded-xl p-4">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Bot size={14} className="text-purple-600" />
          <span className="font-semibold text-purple-700 text-xs uppercase tracking-wide">Simple Explanation</span>
        </div>
        <p className="text-sm text-purple-900 leading-relaxed">{explanation}</p>
      </div>
    )
  }

  return (
    <button onClick={handleClick} disabled={state === 'loading'}
      className="mt-3 inline-flex items-center gap-2 text-sm px-4 py-2.5 min-h-[44px] rounded-xl bg-purple-100 text-purple-700 hover:bg-purple-200 disabled:opacity-50 font-medium">
      {state === 'loading' ? (
        <><span className="w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" /> Explaining...</>
      ) : (
        <><Bot size={16} /> Explain Simply</>
      )}
    </button>
  )
}
