'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bot, Send, X, Maximize2 } from 'lucide-react'
import { TIER_LIMITS, type Tier } from '@/types'
import { useTutorChat, renderMarkdown, TUTOR_HANDOFF_KEY } from '@/components/tutor/useTutorChat'

type AiTutorBubbleProps = {
  tier: Tier
  aiQueriesRemaining: number
}

// Free tier monthly AI quota (shared counter with the per-question explain
// button). Pro gets 1,000/month. The backend enforces this and returns
// 429 + upgradeRequired when exhausted — the number here is display-only.
const FREE_MONTHLY_LIMIT = TIER_LIMITS.free.aiQueriesPerMonth

// Routes where the floating LAUNCHER must not appear. Timed/active tests live
// under /test/<category>?mode=... — usePathname drops the query string, so we
// hide the launcher on the whole /test/* space (the mode selector is a brief
// interstitial). The panel can still be summoned there explicitly via the
// `epa608:open-tutor` event (Practice mode's "Explain Simply" button).
function isLauncherHiddenRoute(pathname: string | null): boolean {
  if (!pathname) return false
  return pathname.startsWith('/test/') || pathname === '/tutor'
}

export default function AiTutorBubble({ tier, aiQueriesRemaining }: AiTutorBubbleProps) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  // Prompt handed over by an `epa608:open-tutor` event (Home fix-plan notes,
  // Practice "Explain Simply"). It's PREFILLED in the input — never auto-sent.
  const [prefill, setPrefill] = useState<string | null>(null)

  // Open-on-demand: other surfaces dispatch `epa608:open-tutor` with an
  // optional { prompt }. This also opens the panel on /test/* practice pages
  // where the launcher itself is hidden.
  useEffect(() => {
    const onOpenTutor = (e: Event) => {
      const detail = (e as CustomEvent<{ prompt?: string }>).detail
      setPrefill(detail?.prompt ?? null)
      setOpen(true)
    }
    window.addEventListener('epa608:open-tutor', onOpenTutor)
    return () => window.removeEventListener('epa608:open-tutor', onOpenTutor)
  }, [])

  return (
    <>
      {/* Floating launcher — bottom-right; sits above the mobile tab bar (bottom-20) */}
      {!open && !isLauncherHiddenRoute(pathname) && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open AI Tutor"
          className="fixed z-40 right-4 bottom-20 md:right-6 md:bottom-6 flex items-center justify-center w-14 h-14 rounded-full text-white shadow-lg hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-800"
          style={{ background: '#001d57', marginBottom: 'env(safe-area-inset-bottom)' }}
        >
          <Bot size={26} aria-hidden />
        </button>
      )}

      {open && (
        <BubblePanel
          tier={tier}
          aiQueriesRemaining={aiQueriesRemaining}
          prefill={prefill}
          onClose={() => {
            setOpen(false)
            setPrefill(null) // don't resurface a stale prompt on the next open
          }}
        />
      )}
    </>
  )
}

function BubblePanel({
  tier,
  aiQueriesRemaining,
  prefill,
  onClose,
}: {
  tier: Tier
  aiQueriesRemaining: number
  prefill: string | null
  onClose: () => void
}) {
  return (
    <>
      {/* Mobile scrim */}
      <div className="sm:hidden fixed inset-0 z-40 bg-black/40" onClick={onClose} aria-hidden />

      <div
        role="dialog"
        aria-label="AI Tutor"
        className="fixed z-50 bg-white shadow-2xl flex flex-col
          inset-x-0 bottom-0 rounded-t-2xl max-h-[85dvh]
          sm:inset-auto sm:right-6 sm:bottom-6 sm:w-96 sm:h-[560px] sm:max-h-[calc(100dvh-3rem)] sm:rounded-2xl"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <BubbleChat tier={tier} aiQueriesRemaining={aiQueriesRemaining} prefill={prefill} onClose={onClose} />
      </div>
    </>
  )
}

// ─── Chat (free within monthly quota, Pro 1,000/mo; shares logic with /tutor) ─

function BubbleChat({
  tier,
  aiQueriesRemaining,
  prefill,
  onClose,
}: {
  tier: Tier
  aiQueriesRemaining: number
  prefill: string | null
  onClose: () => void
}) {
  const { messages, isLoading, remaining, error, upgradeRequired, sendMessage, chatSessionId } = useTutorChat({
    initialRemaining: aiQueriesRemaining,
  })
  const [input, setInput] = useState(prefill ?? '')
  const endRef = useRef<HTMLDivElement>(null)
  const isFree = tier === 'free'
  const limitReached = remaining <= 0 || upgradeRequired

  // A fix-plan "Ask AI Tutor" fired while the panel was already open: refresh
  // the prefilled draft (user still has to press Send — never auto-send).
  useEffect(() => {
    if (prefill) setInput(prefill)
  }, [prefill])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const submit = () => {
    if (!input.trim()) return
    const text = input
    setInput('')
    sendMessage(text)
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-line shrink-0">
        <div className="flex items-center gap-2">
          <Bot size={20} className="text-blue-800" aria-hidden />
          <div className="leading-tight">
            <p className="font-bold text-gray-900 text-sm">AI Tutor</p>
            <p className="text-[11px] text-steel">{limitReached ? 'Monthly limit reached' : `${remaining} left this month`}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Link
            href={chatSessionId ? `/tutor?session=${chatSessionId}` : '/tutor'}
            onClick={() => {
              // Hand the LIVE conversation to the full page. The server only
              // persists the assistant reply when its stream finishes, so the
              // full page could otherwise load a snapshot without the answer
              // (especially when expanding mid-stream).
              try {
                sessionStorage.setItem(
                  TUTOR_HANDOFF_KEY,
                  JSON.stringify({ sessionId: chatSessionId, messages }),
                )
              } catch { /* best-effort */ }
              onClose()
            }}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            title="Open full tutor (voice + history)"
            aria-label="Open full tutor"
          >
            <Maximize2 size={16} />
          </Link>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            aria-label="Close AI Tutor"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {messages.length === 0 && !limitReached && (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <Bot size={36} className="text-blue-800 mb-3" aria-hidden />
            <p className="text-sm font-semibold text-gray-800 mb-1">Ask me anything about EPA 608</p>
            <p className="text-xs text-steel mb-4">Recovery, refrigerants, regulations, safety…</p>
            <div className="w-full space-y-2">
              {[
                'What is the de minimis release rule?',
                'Type I vs Type II — quick summary?',
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="w-full text-left text-xs bg-blue-50 text-blue-700 px-3 py-2.5 rounded-[7px] hover:bg-blue-100 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-3 py-2 ${
                msg.role === 'user' ? 'bg-blue-800 text-white' : 'bg-gray-50 border border-line text-gray-800'
              }`}
            >
              {msg.role === 'assistant' ? (
                msg.content ? (
                  <div className="text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
                ) : (
                  <div className="flex items-center gap-1 py-1">
                    <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:300ms]" />
                  </div>
                )
              ) : (
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              )}
            </div>
          </div>
        ))}

        {/* Monthly quota exhausted — inline upsell (conversion surface) */}
        {limitReached && (
          <div className={`${messages.length === 0 ? 'h-full flex items-center' : ''}`}>
            <div className="w-full bg-blue-50 border border-line rounded-xl p-4 text-center">
              <p className="text-sm font-semibold text-gray-900 mb-1">Monthly free limit reached</p>
              <p className="text-xs text-steel mb-3">Pro gets 1,000 questions/month.</p>
              <Link
                href="/pricing.html"
                onClick={onClose}
                className="inline-block w-full px-4 py-2.5 rounded-xl font-bold text-white text-sm transition-opacity hover:opacity-90"
                style={{ background: '#F97316' }}
              >
                $14.99 lifetime →
              </Link>
              <p className="text-[11px] text-gray-400 mt-1.5 line-through">$39.99</p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex justify-center">
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2">{error}</div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="border-t border-line px-3 py-3 shrink-0">
        {limitReached ? (
          <p className="text-center text-xs text-steel py-1">
            {isFree ? `You've used all ${FREE_MONTHLY_LIMIT} free questions this month.` : 'Monthly limit reached. Resets on the 1st.'}
          </p>
        ) : (
          <>
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    submit()
                  }
                }}
                placeholder="Ask a question…"
                rows={1}
                disabled={isLoading}
                className="flex-1 resize-none rounded-xl border border-line bg-gray-50 px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800 disabled:opacity-50 max-h-24"
              />
              <button
                onClick={submit}
                disabled={!input.trim() || isLoading}
                className="shrink-0 w-11 h-11 rounded-xl bg-blue-800 text-white flex items-center justify-center hover:bg-blue-900 disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Send"
              >
                <Send size={18} />
              </button>
            </div>
            {isFree && (
              <p className="text-[11px] text-steel font-mono mt-1.5">
                {remaining}/{FREE_MONTHLY_LIMIT} free questions left this month
              </p>
            )}
          </>
        )}
      </div>
    </>
  )
}
