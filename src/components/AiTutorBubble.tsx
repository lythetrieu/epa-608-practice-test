'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bot, Send, X, Maximize2, Lock } from 'lucide-react'
import { TIER_LIMITS, type Tier } from '@/types'
import { useTutorChat, renderMarkdown, TUTOR_HANDOFF_KEY } from '@/components/tutor/useTutorChat'

type AiTutorBubbleProps = {
  tier: Tier
  aiQueriesRemaining: number
}

// Routes where the bubble must NOT appear. Timed/active tests live under
// /test/<category>?mode=... — usePathname drops the query string, so we hide the
// bubble on the whole /test/* space (the mode selector is a brief interstitial).
function isHiddenRoute(pathname: string | null): boolean {
  if (!pathname) return false
  return pathname.startsWith('/test/') || pathname === '/tutor'
}

export default function AiTutorBubble({ tier, aiQueriesRemaining }: AiTutorBubbleProps) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  // Prompt handed over by an `epa608:open-tutor` event (Home fix-plan notes).
  // Pro users get it PREFILLED in the input (never auto-sent); free users just
  // see the upsell panel open — that's the conversion surface, on purpose.
  const [prefill, setPrefill] = useState<string | null>(null)
  const hasAiChat = TIER_LIMITS[tier].hasAiChat

  // Open-on-demand: other surfaces (e.g. the dashboard fix-plan note) dispatch
  // `epa608:open-tutor` with an optional { prompt }. The bubble is hidden on
  // /test/* and /tutor, but the event only fires from Home so that's fine.
  useEffect(() => {
    const onOpenTutor = (e: Event) => {
      const detail = (e as CustomEvent<{ prompt?: string }>).detail
      setPrefill(detail?.prompt ?? null)
      setOpen(true)
    }
    window.addEventListener('epa608:open-tutor', onOpenTutor)
    return () => window.removeEventListener('epa608:open-tutor', onOpenTutor)
  }, [])

  // Don't render during timed tests, or on the full /tutor page (redundant there).
  if (isHiddenRoute(pathname)) return null

  return (
    <>
      {/* Floating launcher — bottom-right; sits above the mobile tab bar (bottom-20) */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open AI Tutor"
          className="fixed z-40 right-4 bottom-20 md:right-6 md:bottom-6 flex items-center justify-center w-14 h-14 rounded-full text-white shadow-lg hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-800"
          style={{ background: '#001d57', marginBottom: 'env(safe-area-inset-bottom)' }}
        >
          <Bot size={26} aria-hidden />
          {!hasAiChat && (
            <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center">
              <Lock size={11} className="text-blue-950" aria-hidden />
            </span>
          )}
        </button>
      )}

      {open && (
        <BubblePanel
          hasAiChat={hasAiChat}
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
  hasAiChat,
  aiQueriesRemaining,
  prefill,
  onClose,
}: {
  hasAiChat: boolean
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
        {hasAiChat ? (
          <BubbleChat aiQueriesRemaining={aiQueriesRemaining} prefill={prefill} onClose={onClose} />
        ) : (
          <BubbleUpsell onClose={onClose} />
        )}
      </div>
    </>
  )
}

// ─── Pro chat (compact, shares logic with /tutor via useTutorChat) ───────────

function BubbleChat({
  aiQueriesRemaining,
  prefill,
  onClose,
}: {
  aiQueriesRemaining: number
  prefill: string | null
  onClose: () => void
}) {
  const { messages, isLoading, remaining, error, sendMessage, chatSessionId } = useTutorChat({
    initialRemaining: aiQueriesRemaining,
  })
  const [input, setInput] = useState(prefill ?? '')
  const endRef = useRef<HTMLDivElement>(null)
  const limitReached = remaining <= 0

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
            <p className="text-[11px] text-steel">{limitReached ? 'Daily limit reached' : `${remaining} left today`}</p>
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
        {messages.length === 0 && (
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
          <p className="text-center text-xs text-steel py-1">Daily limit reached. Resets at midnight UTC.</p>
        ) : (
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
        )}
      </div>
    </>
  )
}

// ─── Free upsell (bubble visible on purpose — conversion surface) ────────────

function BubbleUpsell({ onClose }: { onClose: () => void }) {
  return (
    <>
      <div className="flex items-center justify-between px-4 py-3 border-b border-line shrink-0">
        <div className="flex items-center gap-2">
          <Bot size={20} className="text-blue-800" aria-hidden />
          <p className="font-bold text-gray-900 text-sm">AI Tutor</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          aria-label="Close AI Tutor"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center text-center px-6 py-8">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
          <Lock size={26} className="text-blue-800" aria-hidden />
        </div>
        <h2 className="text-base font-bold text-gray-900 mb-1">🔒 AI Tutor — unlock with Pro</h2>
        <p className="text-sm text-steel mb-6 max-w-xs">
          Get instant, personalized answers on refrigerants, regulations, recovery and safety —
          plus voice, chat history, and 1,000 questions a month.
        </p>
        <Link
          href="/checkout.html"
          onClick={onClose}
          className="w-full max-w-xs px-5 py-3 rounded-xl font-bold text-white text-center transition-opacity hover:opacity-90"
          style={{ background: '#F97316' }}
        >
          Upgrade to Pro — $14.99
        </Link>
        <p className="text-[11px] text-gray-400 mt-2 line-through">$39.99</p>
      </div>
    </>
  )
}
