'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import type { Tier } from '@/types'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

type TutorChatProps = {
  email: string
  tier: Tier
  aiQueriesRemaining: number
}

// Simple markdown-to-HTML renderer
function renderMarkdown(text: string): string {
  let html = text
    // Escape HTML entities
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // Code blocks (triple backtick)
  html = html.replace(
    /```(\w*)\n([\s\S]*?)```/g,
    '<pre class="bg-gray-100 rounded-lg p-3 my-2 overflow-x-auto text-sm"><code>$2</code></pre>',
  )

  // Inline code
  html = html.replace(
    /`([^`]+)`/g,
    '<code class="bg-gray-100 px-1.5 py-0.5 rounded text-sm">$1</code>',
  )

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')

  // Italic
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')

  // Headers (## and ###)
  html = html.replace(
    /^### (.+)$/gm,
    '<h4 class="font-semibold text-gray-800 mt-3 mb-1">$1</h4>',
  )
  html = html.replace(
    /^## (.+)$/gm,
    '<h3 class="font-bold text-gray-900 mt-4 mb-1 text-lg">$1</h3>',
  )

  // Unordered lists: convert consecutive "- " lines into <ul>
  html = html.replace(
    /(^- .+$(\n- .+$)*)/gm,
    (match) => {
      const items = match
        .split('\n')
        .map((line) => `<li class="ml-4 list-disc">${line.replace(/^- /, '')}</li>`)
        .join('')
      return `<ul class="my-2 space-y-1">${items}</ul>`
    },
  )

  // Ordered lists: convert consecutive "1. " lines
  html = html.replace(
    /(^\d+\. .+$(\n\d+\. .+$)*)/gm,
    (match) => {
      const items = match
        .split('\n')
        .map(
          (line) =>
            `<li class="ml-4 list-decimal">${line.replace(/^\d+\. /, '')}</li>`,
        )
        .join('')
      return `<ol class="my-2 space-y-1">${items}</ol>`
    },
  )

  // Paragraphs: double newlines
  html = html
    .split(/\n\n+/)
    .map((block) => {
      const trimmed = block.trim()
      if (!trimmed) return ''
      // Don't wrap already-wrapped blocks
      if (
        trimmed.startsWith('<h') ||
        trimmed.startsWith('<ul') ||
        trimmed.startsWith('<ol') ||
        trimmed.startsWith('<pre')
      ) {
        return trimmed
      }
      return `<p class="mb-2">${trimmed.replace(/\n/g, '<br />')}</p>`
    })
    .join('')

  return html
}

export default function TutorChat({
  email: _email,
  tier: _tier,
  aiQueriesRemaining: initialRemaining,
}: TutorChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [chatSessionId, setChatSessionId] = useState<string | null>(null)
  const [history, setHistory] = useState<{ id: string; title: string; updated_at: string }[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [remaining, setRemaining] = useState(initialRemaining)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Load chat history on mount
  useEffect(() => {
    fetch('/api/ai/history').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setHistory(data)
    }).catch(() => {})
  }, [])

  const loadChat = async (id: string) => {
    const res = await fetch(`/api/ai/history?id=${id}`)
    const data = await res.json()
    if (data?.messages) {
      const parsed = typeof data.messages === 'string' ? JSON.parse(data.messages) : data.messages
      setMessages(parsed)
      setChatSessionId(id)
      setShowHistory(false)
    }
  }

  const startNewChat = () => {
    setMessages([])
    setChatSessionId(null)
    setShowHistory(false)
  }

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current
    if (ta) {
      ta.style.height = 'auto'
      ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`
    }
  }, [input])

  const sendMessage = async () => {
    const trimmed = input.trim()
    if (!trimmed || isLoading || remaining <= 0) return

    setError(null)
    const userMessage: Message = { role: 'user', content: trimmed }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setIsLoading(true)

    // Add placeholder assistant message
    const assistantMessage: Message = { role: 'assistant', content: '' }
    setMessages([...newMessages, assistantMessage])

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          sessionId: chatSessionId,
        }),
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => null)
        throw new Error(errData?.error ?? `Request failed (${response.status})`)
      }

      // Read session ID from response header for chat history
      const newSessionId = response.headers.get('X-Chat-Session-Id')
      if (newSessionId && !chatSessionId) {
        setChatSessionId(newSessionId)
      }

      if (!response.body) {
        throw new Error('No response body')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let fullContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const json = JSON.parse(line.slice(6))
              const content = json.choices?.[0]?.delta?.content
              if (content) {
                fullContent += content
                setMessages((prev) => {
                  const updated = [...prev]
                  updated[updated.length - 1] = {
                    role: 'assistant',
                    content: fullContent,
                  }
                  return updated
                })
              }
            } catch {
              // Skip malformed JSON chunks
            }
          }
        }
      }

      setRemaining((r) => Math.max(0, r - 1))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      // Remove the empty assistant message on error
      setMessages(newMessages)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const limitReached = remaining <= 0

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] md:h-screen">
      {/* Header */}
      <div className="border-b border-gray-100 bg-white px-4 sm:px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🎓</span>
          <div>
            <h1 className="font-bold text-gray-900 text-lg leading-tight">
              AI Tutor
            </h1>
            <p className="text-xs text-gray-400">EPA 608 exam help</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={startNewChat}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
            title="New chat"
          >
            + New
          </button>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
            title="Chat history"
          >
            History
          </button>
          <div
            className={`text-xs px-3 py-1.5 rounded-full font-medium ${
              limitReached
                ? 'bg-red-100 text-red-700'
                : 'bg-blue-50 text-blue-700'
            }`}
          >
            {limitReached
              ? 'Limit reached'
              : `${remaining} left`}
          </div>
        </div>
      </div>

      {/* Chat history dropdown */}
      {showHistory && (
        <div className="border-b border-gray-100 bg-gray-50 px-4 sm:px-6 py-3 max-h-60 overflow-y-auto shrink-0">
          {history.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-2">No previous conversations</p>
          ) : (
            <div className="space-y-1">
              {history.map(h => (
                <button
                  key={h.id}
                  onClick={() => loadChat(h.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-white transition-colors ${
                    chatSessionId === h.id ? 'bg-white border border-blue-200' : ''
                  }`}
                >
                  <div className="font-medium text-gray-800 truncate">{h.title}</div>
                  <div className="text-xs text-gray-400">{new Date(h.updated_at).toLocaleDateString()}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex-1 flex items-center justify-center h-full">
            <div className="text-center max-w-sm">
              <div className="text-5xl mb-4">🎓</div>
              <h2 className="text-lg font-semibold text-gray-800 mb-2">
                Ask me anything about EPA 608
              </h2>
              <p className="text-sm text-gray-400">
                I can help with refrigerant types, safety procedures, regulations,
                recovery techniques, and exam strategies.
              </p>
              <div className="mt-6 flex flex-wrap gap-2 justify-center">
                {[
                  'What refrigerants require recovery?',
                  'Explain the difference between Type I and Type II',
                  'What is the de minimis release rule?',
                ].map((q) => (
                  <button
                    key={q}
                    onClick={() => {
                      setInput(q)
                      textareaRef.current?.focus()
                    }}
                    className="text-xs bg-blue-50 text-blue-700 px-3 py-2 rounded-lg hover:bg-blue-100 transition-colors text-left"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-blue-800 text-white'
                  : 'bg-white border border-gray-200 text-gray-800'
              }`}
            >
              {msg.role === 'assistant' && (
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="text-sm">🎓</span>
                  <span className="text-xs font-medium text-gray-400">
                    AI Tutor
                  </span>
                </div>
              )}
              {msg.role === 'assistant' ? (
                msg.content ? (
                  <div
                    className="text-sm leading-relaxed prose-sm"
                    dangerouslySetInnerHTML={{
                      __html: renderMarkdown(msg.content),
                    }}
                  />
                ) : (
                  <div className="flex items-center gap-1 py-1">
                    <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce [animation-delay:0ms]" />
                    <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce [animation-delay:300ms]" />
                  </div>
                )
              ) : (
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {msg.content}
                </p>
              )}
            </div>
          </div>
        ))}

        {error && (
          <div className="flex justify-center">
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-2.5">
              {error}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-gray-100 bg-white px-4 sm:px-6 py-3 shrink-0">
        {limitReached ? (
          <div className="text-center py-2">
            <p className="text-sm text-gray-400">
              You have reached your daily AI query limit. Queries reset at midnight UTC.
            </p>
          </div>
        ) : (
          <div className="flex items-end gap-2 max-w-3xl mx-auto">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about EPA 608 topics..."
              rows={1}
              disabled={isLoading}
              className="flex-1 resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800 disabled:opacity-50 transition-colors"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading || limitReached}
              className="shrink-0 w-10 h-10 rounded-xl bg-blue-800 text-white flex items-center justify-center hover:bg-blue-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Send message"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 12h14M12 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
