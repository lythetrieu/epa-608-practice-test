'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Plus, Clock, Bot, Mic, Volume2, VolumeX } from 'lucide-react'
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

function renderMarkdown(text: string): string {
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="bg-gray-100 rounded-lg p-3 my-2 overflow-x-auto text-sm"><code>$2</code></pre>')
  html = html.replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1.5 py-0.5 rounded text-sm">$1</code>')
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
  html = html.replace(/^### (.+)$/gm, '<h4 class="font-semibold text-gray-800 mt-3 mb-1">$1</h4>')
  html = html.replace(/^## (.+)$/gm, '<h3 class="font-bold text-gray-900 mt-4 mb-1 text-lg">$1</h3>')
  html = html.replace(/(^- .+$(\n- .+$)*)/gm, (match) => {
    const items = match.split('\n').map((line) => `<li class="ml-4 list-disc">${line.replace(/^- /, '')}</li>`).join('')
    return `<ul class="my-2 space-y-1">${items}</ul>`
  })
  html = html.replace(/(^\d+\. .+$(\n\d+\. .+$)*)/gm, (match) => {
    const items = match.split('\n').map((line) => `<li class="ml-4 list-decimal">${line.replace(/^\d+\. /, '')}</li>`).join('')
    return `<ol class="my-2 space-y-1">${items}</ol>`
  })
  html = html.split(/\n\n+/).map((block) => {
    const t = block.trim()
    if (!t) return ''
    if (t.startsWith('<h') || t.startsWith('<ul') || t.startsWith('<ol') || t.startsWith('<pre')) return t
    return `<p class="mb-2">${t.replace(/\n/g, '<br />')}</p>`
  }).join('')
  return html
}

// Strip markdown for TTS
function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/^#{1,4}\s+/gm, '')
    .replace(/^[-*]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .trim()
}

// Check browser support
function hasSpeechRecognition(): boolean {
  if (typeof window === 'undefined') return false
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition)
}

function hasSpeechSynthesis(): boolean {
  if (typeof window === 'undefined') return false
  return !!window.speechSynthesis
}

export default function TutorChat({
  email: _email, tier: _tier, aiQueriesRemaining: initialRemaining,
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

  // Voice states
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [autoRead, setAutoRead] = useState(false)
  const [micSupported, setMicSupported] = useState(false)
  const [ttsSupported, setTtsSupported] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)
  const lastSpokenIdx = useRef(-1)

  // Check browser support on mount
  useEffect(() => {
    setMicSupported(hasSpeechRecognition())
    setTtsSupported(hasSpeechSynthesis())
  }, [])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => { scrollToBottom() }, [messages, scrollToBottom])

  useEffect(() => {
    fetch('/api/ai/history').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setHistory(data)
    }).catch(() => {})
  }, [])

  // Auto-read new AI responses
  useEffect(() => {
    if (!autoRead || !ttsSupported) return
    const lastMsg = messages[messages.length - 1]
    if (lastMsg?.role === 'assistant' && lastMsg.content && !isLoading && messages.length - 1 > lastSpokenIdx.current) {
      lastSpokenIdx.current = messages.length - 1
      speakText(lastMsg.content)
    }
  }, [messages, isLoading, autoRead, ttsSupported])

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
    stopSpeaking()
  }

  useEffect(() => {
    const ta = textareaRef.current
    if (ta) {
      ta.style.height = 'auto'
      ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`
    }
  }, [input])

  // ── Speech Recognition (Mic) — v2 ──
  const startListening = () => {
    if (!micSupported) {
      setError('Voice input not supported in this browser. Use Chrome or Edge.')
      return
    }
    stopSpeaking()
    setError(null)
    setIsListening(true) // Show listening UI immediately

    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      const recognition = new SpeechRecognition()
      recognition.lang = 'en-US'
      recognition.interimResults = true
      recognition.continuous = false
      recognition.maxAlternatives = 1

      recognition.onstart = () => { /* already set above */ }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let transcript = ''
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript
      }
      setInput(transcript)
    }

    recognition.onend = () => {
      setIsListening(false)
      setTimeout(() => {
        const currentInput = textareaRef.current?.value?.trim()
        if (currentInput) {
          sendMessageDirect(currentInput)
        }
      }, 300)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      setIsListening(false)
      const err = event.error || 'unknown'
      if (err === 'not-allowed' || err === 'service-not-allowed') {
        setError('Voice blocked by your system. Tip: click the text box, press Fn twice to use Mac dictation instead.')
      } else if (err === 'no-speech') {
        // Silent — user just didn't speak, not an error
      } else if (err === 'network') {
        setError('Voice needs internet — Chrome sends audio to Google for processing.')
      } else if (err === 'aborted') {
        // User cancelled
      } else {
        setError(`Voice error: "${err}". Make sure Chrome has Speech Recognition permission in System Settings.`)
      }
    }

    recognitionRef.current = recognition
    recognition.start()
    } catch (e) {
      setIsListening(false)
      setError(`Could not start voice. Error: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  const stopListening = () => {
    recognitionRef.current?.stop()
    setIsListening(false)
  }

  // ── Speech Synthesis (TTS) ──
  const speakText = (text: string) => {
    if (!ttsSupported) return
    stopSpeaking()

    const clean = stripMarkdown(text)
    if (!clean) return

    const utterance = new SpeechSynthesisUtterance(clean)
    utterance.lang = 'en-US'
    utterance.rate = 0.95
    utterance.pitch = 1

    // Pick a good voice
    const voices = speechSynthesis.getVoices()
    const preferred = voices.find(v => v.name.includes('Samantha') || v.name.includes('Google US') || v.name.includes('Microsoft Aria'))
    if (preferred) utterance.voice = preferred

    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)

    speechSynthesis.speak(utterance)
  }

  const stopSpeaking = () => {
    if (ttsSupported) {
      speechSynthesis.cancel()
      setIsSpeaking(false)
    }
  }

  // ── Send Message ──
  const sendMessageDirect = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || isLoading || remaining <= 0) return

    setError(null)
    const userMessage: Message = { role: 'user', content: trimmed }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setIsLoading(true)
    setMessages([...newMessages, { role: 'assistant', content: '' }])

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages.map((m) => ({ role: m.role, content: m.content })), sessionId: chatSessionId }),
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
            } catch { /* skip */ }
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
  }

  const sendMessage = () => sendMessageDirect(input)

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const limitReached = remaining <= 0

  return (
    <div className="flex flex-col h-[calc(100dvh-3.5rem)] md:h-[100dvh]">
      {/* Header */}
      <div className="border-b border-gray-100 bg-white px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Bot size={24} className="text-blue-800" />
          <div>
            <h1 className="font-bold text-gray-900 text-base leading-tight">AI Study Helper</h1>
            <p className="text-xs text-gray-500">Voice & text</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Auto-read toggle */}
          {ttsSupported && (
            <button
              onClick={() => { setAutoRead(!autoRead); if (autoRead) stopSpeaking() }}
              className={`p-2 min-h-[40px] min-w-[40px] rounded-lg border transition-colors ${autoRead ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
              title={autoRead ? 'Auto-read ON — tap to turn off' : 'Auto-read OFF — tap to read responses aloud'}
            >
              {autoRead ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
          )}
          <button onClick={startNewChat} className="p-2 min-h-[40px] min-w-[40px] rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50" title="New chat">
            <Plus size={18} />
          </button>
          <button onClick={() => setShowHistory(!showHistory)} className="p-2 min-h-[40px] min-w-[40px] rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50" title="History">
            <Clock size={18} />
          </button>
          <div className={`text-xs px-3 py-1.5 rounded-full font-semibold ${limitReached ? 'bg-red-100 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
            {limitReached ? 'Limit' : `${remaining}`}
          </div>
        </div>
      </div>

      {/* History dropdown */}
      {showHistory && (
        <div className="border-b border-gray-100 bg-gray-50 px-4 py-3 max-h-48 overflow-y-auto shrink-0">
          {history.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-2">No previous conversations</p>
          ) : (
            <div className="space-y-1">
              {history.map(h => (
                <button key={h.id} onClick={() => loadChat(h.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm hover:bg-white transition-colors min-h-[44px] ${chatSessionId === h.id ? 'bg-white border border-blue-200' : ''}`}>
                  <div className="font-medium text-gray-800 truncate">{h.title}</div>
                  <div className="text-xs text-gray-500">{new Date(h.updated_at).toLocaleDateString()}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-sm px-4">
              <Bot size={48} className="text-blue-800 mx-auto mb-4" />
              <h2 className="text-lg font-bold text-gray-800 mb-2">Ask me anything about EPA 608</h2>
              <p className="text-sm text-gray-500 mb-1">Type or tap the mic to ask by voice.</p>
              {autoRead && <p className="text-xs text-blue-600 mb-4">Auto-read is ON — I will read answers aloud.</p>}
              <div className="space-y-2">
                {[
                  'Explain like I\'m 5: What is refrigerant recovery?',
                  'What\'s the difference between Type I and Type II?',
                  'What is the de minimis release rule?',
                  'How do I remember pressure-temperature values?',
                ].map((q) => (
                  <button key={q} onClick={() => { setInput(q); textareaRef.current?.focus() }}
                    className="w-full text-left text-sm bg-blue-50 text-blue-700 px-4 py-3 min-h-[48px] rounded-xl hover:bg-blue-100 transition-colors">
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[90%] sm:max-w-[80%] rounded-2xl px-4 py-3 ${
              msg.role === 'user' ? 'bg-blue-800 text-white' : 'bg-white border border-gray-200 text-gray-800'
            }`}>
              {msg.role === 'assistant' && (
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Bot size={14} className="text-blue-800" />
                    <span className="text-xs font-medium text-gray-500">AI Study Helper</span>
                  </div>
                  {/* Read aloud button */}
                  {ttsSupported && msg.content && (
                    <button
                      onClick={() => isSpeaking ? stopSpeaking() : speakText(msg.content)}
                      className="p-1 rounded hover:bg-gray-100 transition-colors"
                      title={isSpeaking ? 'Stop reading' : 'Read aloud'}
                    >
                      {isSpeaking ? <VolumeX size={14} className="text-gray-400" /> : <Volume2 size={14} className="text-gray-400" />}
                    </button>
                  )}
                </div>
              )}
              {msg.role === 'assistant' ? (
                msg.content ? (
                  <div className="text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
                ) : (
                  <div className="flex items-center gap-1 py-1">
                    <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce [animation-delay:0ms]" />
                    <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce [animation-delay:300ms]" />
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
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-2.5">{error}</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input — voice + text */}
      <div className="border-t border-gray-100 bg-white px-4 py-3 shrink-0" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
        {limitReached ? (
          <div className="text-center py-2">
            <p className="text-sm text-gray-500">Daily limit reached. Resets at midnight UTC.</p>
          </div>
        ) : isListening ? (
          /* Listening mode */
          <div className="flex items-center justify-center gap-4 py-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-gray-700">Listening...</span>
            </div>
            <span className="text-sm text-gray-500 max-w-[200px] truncate italic">{input || 'Speak now'}</span>
            <button
              onClick={stopListening}
              className="px-4 py-2.5 min-h-[48px] bg-red-500 text-white rounded-xl font-medium hover:bg-red-600"
            >
              Stop
            </button>
          </div>
        ) : (
          /* Normal input mode */
          <div className="flex items-end gap-2 max-w-3xl mx-auto">
            {/* Mic button */}
            {micSupported && (
              <button
                onClick={startListening}
                disabled={isLoading}
                className="shrink-0 w-12 h-12 rounded-xl bg-gray-100 text-gray-600 flex items-center justify-center hover:bg-blue-50 hover:text-blue-700 disabled:opacity-40 transition-colors"
                title="Tap to speak"
              >
                <Mic size={22} />
              </button>
            )}

            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type or tap mic to ask..."
              rows={1}
              disabled={isLoading}
              className="flex-1 resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-base text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800 disabled:opacity-50"
            />

            <button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading || limitReached}
              className="shrink-0 w-12 h-12 rounded-xl bg-blue-800 text-white flex items-center justify-center hover:bg-blue-900 disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Send"
            >
              <Send size={20} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// TypeScript declarations for Web Speech API
/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    SpeechRecognition: any
    webkitSpeechRecognition: any
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */
