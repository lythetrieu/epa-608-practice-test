'use client'
import { useState, useRef, useEffect } from 'react'

const REASONS = [
  'Incorrect answer',
  'Outdated information',
  'Unclear question',
  'Other',
]

export function ReportButton({ questionId }: { questionId: string }) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState('')
  const [details, setDetails] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done' | 'error' | 'duplicate'>('idle')
  const ref = useRef<HTMLDivElement>(null)

  // Close on click outside
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const handleSubmit = async () => {
    if (!selected) return
    setStatus('submitting')
    const reason = details.trim() ? `${selected}: ${details.trim()}` : selected
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId, reason }),
      })
      if (res.ok) {
        setStatus('done')
      } else if (res.status === 409) {
        setStatus('duplicate')
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  if (status === 'done' || status === 'duplicate') {
    return (
      <span className="text-xs text-gray-400 flex items-center gap-1">
        <FlagIcon className="w-3.5 h-3.5" />
        <span>{status === 'done' ? 'Reported' : 'Already reported'}</span>
      </span>
    )
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="text-gray-300 hover:text-gray-500 transition-colors p-1 rounded"
        title="Report this question"
        aria-label="Report this question"
      >
        <FlagIcon className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-4 w-64">
          <p className="text-sm font-semibold text-gray-700 mb-2">Report question</p>

          <div className="space-y-1.5 mb-3">
            {REASONS.map(r => (
              <label key={r} className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input
                  type="radio"
                  name={`report-${questionId}`}
                  value={r}
                  checked={selected === r}
                  onChange={() => setSelected(r)}
                  className="accent-blue-800"
                />
                {r}
              </label>
            ))}
          </div>

          <textarea
            placeholder="Additional details (optional)"
            value={details}
            onChange={e => setDetails(e.target.value)}
            className="w-full border border-gray-200 rounded-md text-sm p-2 mb-3 resize-none h-16 focus:outline-none focus:ring-1 focus:ring-blue-800"
            maxLength={500}
          />

          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              disabled={!selected || status === 'submitting'}
              className="flex-1 text-sm px-3 py-1.5 bg-blue-800 text-white rounded-md hover:bg-blue-900 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {status === 'submitting' ? 'Sending...' : 'Submit'}
            </button>
            <button
              onClick={() => setOpen(false)}
              className="text-sm px-3 py-1.5 border border-gray-200 text-gray-600 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>

          {status === 'error' && (
            <p className="text-xs text-red-500 mt-2">Failed to submit. Please try again.</p>
          )}
        </div>
      )}
    </div>
  )
}

function FlagIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
    >
      <path d="M3.5 2.75a.75.75 0 00-1.5 0v14.5a.75.75 0 001.5 0v-4.392l1.657-.348a6.449 6.449 0 014.271.572 7.948 7.948 0 005.965.524l2.078-.64A.75.75 0 0018 11.75V3.24a.75.75 0 00-.978-.724l-2.022.623a6.449 6.449 0 01-4.843-.425 7.948 7.948 0 00-5.264-.705L3.5 2.317V2.75z" />
    </svg>
  )
}
