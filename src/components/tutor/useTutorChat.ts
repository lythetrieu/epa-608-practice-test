'use client'

import { useState, useEffect, useCallback } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// Shared AI Tutor chat logic.
// Used by both the full /tutor page (TutorChat) and the floating AiTutorBubble
// so the streaming/fetch logic lives in exactly one place.
// ─────────────────────────────────────────────────────────────────────────────

export type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type ChatHistoryItem = { id: string; title: string; updated_at: string }

type UseTutorChatOptions = {
  initialRemaining: number
  /** Load past-conversation history list on mount (full page only). */
  loadHistory?: boolean
}

export function useTutorChat({ initialRemaining, loadHistory = false }: UseTutorChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [chatSessionId, setChatSessionId] = useState<string | null>(null)
  const [history, setHistory] = useState<ChatHistoryItem[]>([])
  const [remaining, setRemaining] = useState(initialRemaining)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!loadHistory) return
    fetch('/api/ai/history')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setHistory(data)
      })
      .catch(() => {})
  }, [loadHistory])

  const loadChat = useCallback(async (id: string) => {
    const res = await fetch(`/api/ai/history?id=${id}`)
    const data = await res.json()
    if (data?.messages) {
      const parsed = typeof data.messages === 'string' ? JSON.parse(data.messages) : data.messages
      setMessages(parsed)
      setChatSessionId(id)
    }
  }, [])

  const startNewChat = useCallback(() => {
    setMessages([])
    setChatSessionId(null)
    setError(null)
  }, [])

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || isLoading || remaining <= 0) return

      setError(null)
      const userMessage: ChatMessage = { role: 'user', content: trimmed }
      const newMessages = [...messages, userMessage]
      setMessages([...newMessages, { role: 'assistant', content: '' }])
      setIsLoading(true)

      try {
        const response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
            sessionId: chatSessionId,
          }),
        })
        if (!response.ok) {
          const errData = await response.json().catch(() => null)
          throw new Error(errData?.error ?? `Request failed (${response.status})`)
        }
        const newSessionId = response.headers.get('X-Chat-Session-Id')
        if (newSessionId && !chatSessionId) setChatSessionId(newSessionId)
        if (!response.body) throw new Error('No response body')

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
                    updated[updated.length - 1] = { role: 'assistant', content: fullContent }
                    return updated
                  })
                }
              } catch {
                /* skip */
              }
            }
          }
        }
        setRemaining((r) => Math.max(0, r - 1))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
        setMessages(newMessages)
      } finally {
        setIsLoading(false)
      }
    },
    [messages, isLoading, remaining, chatSessionId],
  )

  return {
    messages,
    setMessages,
    isLoading,
    chatSessionId,
    history,
    remaining,
    error,
    setError,
    loadChat,
    startNewChat,
    sendMessage,
  }
}

// ─── Markdown rendering (shared between full page + bubble) ──────────────────

export function renderMarkdown(text: string): string {
  let html = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  html = html.replace(
    /```(\w*)\n([\s\S]*?)```/g,
    '<pre class="bg-gray-100 rounded-lg p-3 my-2 overflow-x-auto text-sm"><code>$2</code></pre>',
  )
  html = html.replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1.5 py-0.5 rounded text-sm">$1</code>')
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
  html = html.replace(/^### (.+)$/gm, '<h4 class="font-semibold text-gray-800 mt-3 mb-1">$1</h4>')
  html = html.replace(/^## (.+)$/gm, '<h3 class="font-bold text-gray-900 mt-4 mb-1 text-lg">$1</h3>')
  html = html.replace(/(^- .+$(\n- .+$)*)/gm, (match) => {
    const items = match
      .split('\n')
      .map((line) => `<li class="ml-4 list-disc">${line.replace(/^- /, '')}</li>`)
      .join('')
    return `<ul class="my-2 space-y-1">${items}</ul>`
  })
  html = html.replace(/(^\d+\. .+$(\n\d+\. .+$)*)/gm, (match) => {
    const items = match
      .split('\n')
      .map((line) => `<li class="ml-4 list-decimal">${line.replace(/^\d+\. /, '')}</li>`)
      .join('')
    return `<ol class="my-2 space-y-1">${items}</ol>`
  })
  html = html
    .split(/\n\n+/)
    .map((block) => {
      const t = block.trim()
      if (!t) return ''
      if (t.startsWith('<h') || t.startsWith('<ul') || t.startsWith('<ol') || t.startsWith('<pre')) return t
      return `<p class="mb-2">${t.replace(/\n/g, '<br />')}</p>`
    })
    .join('')
  return html
}
