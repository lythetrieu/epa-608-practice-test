'use client'

import { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, Check, X, AlertTriangle, RotateCcw, ChevronRight, BookOpen, Brain, Lightbulb, AlertCircle, Lock, LayoutGrid, Bot, Play, Trophy } from 'lucide-react'
import { CONCEPT_VISUALS } from './concept-visuals'
import { canonicalMulti, MULTI_SEP } from '@/lib/multi'

// Per-question AI tutor — on-demand "explain simply" for any reviewed question.
// Mirrors the PracticeClient pattern so every learning surface has the same tutor.
function ExplainButton({ questionText, correctAnswer }: { questionText: string; correctAnswer: string }) {
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
      <div className="mt-2.5 bg-purple-50 border border-purple-200 rounded-lg p-3">
        <div className="flex items-center gap-1.5 mb-1">
          <Bot size={13} className="text-purple-600" />
          <span className="font-semibold text-purple-700 text-[11px] uppercase tracking-wide">AI Tutor</span>
        </div>
        <p className="text-sm text-purple-900 leading-relaxed">{explanation}</p>
      </div>
    )
  }

  return (
    <button onClick={handleClick} disabled={state === 'loading'}
      className="mt-2.5 inline-flex items-center gap-1.5 text-xs px-3 py-2 min-h-[40px] rounded-lg bg-purple-100 text-purple-700 hover:bg-purple-200 disabled:opacity-50 font-medium">
      {state === 'loading' ? (
        <><span className="w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" /> Explaining...</>
      ) : state === 'error' ? (
        <><Bot size={14} /> Try again</>
      ) : (
        <><Bot size={14} /> Ask AI: why?</>
      )}
    </button>
  )
}

type Concept = {
  id: string
  title: string
  category: string
  subtopicPrefix: string
  summary: string
  lesson: string
  keyNumbers: string[]
  memoryTrick: string
  examWarning: string
}

type QuizQuestion = {
  id: string
  category: string
  question: string
  options: string[]
  difficulty: string
  question_type?: string
}

type QuizData = {
  quizId: string
  concept: { id: string; title: string; category: string; subtopicPrefix?: string }
  lesson: string
  keyNumbers: string[]
  memoryTrick: string
  examWarning: string
  facts: string[]
  questions: QuizQuestion[]
  total: number
}

type ConceptProgress = {
  status: 'pending' | 'reviewed' | 'mastered' | 'weak'
  passCount: number
  lastPassed: string | null
}

function getProgress(): Record<string, ConceptProgress> {
  try {
    const raw = localStorage.getItem('epa608StudyPath')
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    for (const k of Object.keys(parsed)) {
      if (typeof parsed[k] === 'string') {
        parsed[k] = { status: parsed[k], passCount: parsed[k] === 'mastered' ? 2 : 0, lastPassed: null }
      }
    }
    return parsed
  } catch { return {} }
}

function saveProgress(p: Record<string, ConceptProgress>) {
  localStorage.setItem('epa608StudyPath', JSON.stringify(p))
}

function getEffectiveStatus(prog: ConceptProgress): string {
  const status = prog.status || 'pending'
  if (status === 'mastered' && prog.lastPassed) {
    const days = (Date.now() - new Date(prog.lastPassed).getTime()) / 86400000
    if (days > 3) return 'review'
  }
  return status
}

export default function StudyPathClient() {
  const [concepts, setConcepts] = useState<Concept[]>([])
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState<Record<string, ConceptProgress>>({})
  const [activeConceptPrefix, setActiveConceptPrefix] = useState<string | null>(null)
  const [activeConceptId, setActiveConceptId] = useState<string | null>(null)
  const [quiz, setQuiz] = useState<QuizData | null>(null)
  const [quizIdx, setQuizIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [quizPhase, setQuizPhase] = useState<'lesson' | 'quiz' | 'result'>('lesson')
  const [lessonReady, setLessonReady] = useState(false)
  const [result, setResult] = useState<{
    percentage: number
    passed: boolean
    results?: { questionId: string; correct: boolean; userAnswer: string | null; correctAnswer: string }[]
  } | null>(null)
  const [scoring, setScoring] = useState(false)

  useEffect(() => {
    setProgress(getProgress())
    fetch('/api/public/study-path')
      .then(r => r.json())
      .then(data => { setConcepts(data.concepts || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  // Ordered flat list: Core → Type I → Type II → Type III
  const sections = ['Core', 'Type I', 'Type II', 'Type III']
  const orderedConcepts: Concept[] = []
  const grouped: Record<string, Concept[]> = {}
  concepts.forEach(c => {
    if (!grouped[c.category]) grouped[c.category] = []
    grouped[c.category].push(c)
  })
  sections.forEach(cat => { orderedConcepts.push(...(grouped[cat] || [])) })

  // Stats
  let totalMastered = 0
  for (const c of concepts) {
    if (getEffectiveStatus(progress[c.id] || { status: 'pending', passCount: 0, lastPassed: null }) === 'mastered') totalMastered++
  }
  const overallPct = concepts.length > 0 ? Math.round(totalMastered / concepts.length * 100) : 0


  // Find next lesson after active concept (for "Next Lesson" button in results)
  const getNextLesson = useCallback(() => {
    if (!activeConceptId) return null
    const idx = orderedConcepts.findIndex(c => c.id === activeConceptId)
    // Find next non-mastered after current
    for (let i = idx + 1; i < orderedConcepts.length; i++) {
      const p = progress[orderedConcepts[i].id]
      if (!p || getEffectiveStatus(p) !== 'mastered') return orderedConcepts[i]
    }
    // Wrap around: find any non-mastered before current
    for (let i = 0; i < idx; i++) {
      const p = progress[orderedConcepts[i].id]
      if (!p || getEffectiveStatus(p) !== 'mastered') return orderedConcepts[i]
    }
    return null
  }, [activeConceptId, orderedConcepts, progress])

  const openConcept = useCallback((prefix: string, conceptId: string) => {
    setActiveConceptPrefix(prefix)
    setActiveConceptId(conceptId)
    setQuizPhase('lesson')
    setLessonReady(false)
    setQuiz(null)
    setQuizIdx(0)
    setAnswers({})
    setResult(null)
    setLessonReady(true) // snappy — no forced wait

    fetch('/api/public/study-path', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conceptPrefix: prefix, count: 10 }),
    })
      .then(r => r.json())
      .then(data => setQuiz(data))
      .catch(() => {})
  }, [])

  const submitQuiz = useCallback(async () => {
    if (!quiz || scoring) return
    setScoring(true)
    try {
      const res = await fetch('/api/public/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quizId: quiz.quizId, answers }),
      })
      const data = await res.json()
      const passed = data.percentage >= 80
      const conceptId = activeConceptId!
      const p = { ...progress }
      const existing = p[conceptId] || { status: 'pending' as const, passCount: 0, lastPassed: null }

      if (passed) {
        existing.passCount = (existing.passCount || 0) + 1
        existing.lastPassed = new Date().toISOString()
        existing.status = existing.passCount >= 2 ? 'mastered' : 'reviewed'
      } else {
        existing.status = 'weak'
        existing.passCount = 0
      }

      p[conceptId] = existing
      setProgress(p)
      saveProgress(p)
      setResult({ percentage: data.percentage, passed, results: data.results })
      setQuizPhase('result')
    } catch {
      setResult({ percentage: 0, passed: false })
      setQuizPhase('result')
    }
    setScoring(false)
  }, [quiz, answers, activeConceptId, progress, scoring])

  const closeModal = useCallback(() => {
    setActiveConceptPrefix(null)
    setActiveConceptId(null)
  }, [])

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CONCEPT DETAIL VIEW (lesson → quiz → result)
  // ═══════════════════════════════════════════════════════════════════════════
  if (activeConceptPrefix && quiz) {
    const conceptProg = progress[activeConceptId!] || { status: 'pending', passCount: 0, lastPassed: null }
    const effectiveStatus = getEffectiveStatus(conceptProg)
    const lessonNum = orderedConcepts.findIndex(c => c.id === activeConceptId) + 1
    const nextLesson = getNextLesson()

    return (
      <div className="p-3 sm:p-6 max-w-2xl">
        <button onClick={closeModal} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft size={16} /> Back to Study Path
        </button>

        {/* Lesson number indicator */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
            Lesson {lessonNum} of {orderedConcepts.length}
          </span>
          <span className="text-xs text-gray-400">{quiz.concept.category}</span>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-5">{quiz.concept.title}</h1>

        {/* LESSON PHASE */}
        {quizPhase === 'lesson' && (
          <>
            <div className="space-y-3 mb-5">
              {/* 1. Visual — the main teaching tool */}
              {activeConceptPrefix && CONCEPT_VISUALS[activeConceptPrefix] && (
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  {CONCEPT_VISUALS[activeConceptPrefix]()}
                </div>
              )}

              {/* 2. Three quick bullets: number + trick + trap */}
              <div className="space-y-2">
                {quiz.memoryTrick && (
                  <div className="flex items-start gap-2.5 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3">
                    <Lightbulb size={16} className="text-indigo-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-indigo-800 font-medium leading-snug">{quiz.memoryTrick}</p>
                  </div>
                )}
                {quiz.examWarning && (
                  <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                    <AlertCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-red-800 leading-snug">{quiz.examWarning}</p>
                  </div>
                )}
                {quiz.keyNumbers.length > 0 && (
                  <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                    <Brain size={16} className="text-amber-600 shrink-0 mt-0.5" />
                    <div className="flex flex-wrap gap-1.5">
                      {quiz.keyNumbers.map((n, i) => (
                        <span key={i} className="px-2 py-0.5 bg-white border border-amber-300 rounded text-xs font-bold text-amber-800">{n}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => { setQuizPhase('quiz'); setQuizIdx(0) }}
              disabled={!lessonReady}
              className={`w-full py-3.5 rounded-xl font-bold text-base min-h-[52px] transition-all ${
                lessonReady ? 'bg-blue-800 text-white hover:bg-blue-900' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {lessonReady ? "Start Quiz" : 'Reading...'}
            </button>
          </>
        )}

        {/* QUIZ PHASE */}
        {quizPhase === 'quiz' && quiz.questions[quizIdx] && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-bold text-gray-500">Question {quizIdx + 1} of {quiz.total}</span>
              <div className="flex gap-1">
                {quiz.questions.map((_, i) => (
                  <div key={i} className={`w-2.5 h-2.5 rounded-full ${
                    i === quizIdx ? 'bg-blue-600' : answers[quiz.questions[i].id] ? 'bg-blue-300' : 'bg-gray-200'
                  }`} />
                ))}
              </div>
            </div>

            <p className="text-base font-semibold text-gray-900 mb-1 leading-relaxed">
              {quiz.questions[quizIdx].question}
            </p>
            {quiz.questions[quizIdx].question_type === 'multi_select' && (
              <p className="text-xs font-bold text-purple-600 mb-3">Select all that apply</p>
            )}

            <div className="space-y-2 mb-6">
              {(() => {
                const q = quiz.questions[quizIdx]
                const multi = q.question_type === 'multi_select'
                const current = answers[q.id] ? answers[q.id].split(MULTI_SEP) : []
                return q.options.map((opt, i) => {
                  const selected = multi ? current.includes(opt) : answers[q.id] === opt
                  const onPick = () => setAnswers(prev => {
                    if (!multi) return { ...prev, [q.id]: opt }
                    const set = new Set(current)
                    if (set.has(opt)) set.delete(opt); else set.add(opt)
                    return { ...prev, [q.id]: canonicalMulti([...set]) }
                  })
                  return (
                    <button key={i} onClick={onPick}
                      className={`w-full text-left px-4 py-3.5 rounded-xl border-2 text-sm font-medium min-h-[52px] transition-all flex items-center gap-3 ${
                        selected ? 'border-blue-600 bg-blue-50 text-blue-900' : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300'
                      }`}>
                      {multi && (
                        <span className={`shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center ${selected ? 'border-blue-600 bg-blue-600' : 'border-gray-300'}`}>
                          {selected && <Check size={13} className="text-white" />}
                        </span>
                      )}
                      <span>{opt}</span>
                    </button>
                  )
                })
              })()}
            </div>

            <div className="flex gap-3">
              {quizIdx > 0 && (
                <button onClick={() => setQuizIdx(quizIdx - 1)}
                  className="px-5 py-3 rounded-xl bg-gray-100 text-gray-600 font-medium text-sm min-h-[48px]">
                  Back
                </button>
              )}
              <button
                onClick={() => {
                  if (quizIdx < quiz.total - 1) setQuizIdx(quizIdx + 1)
                  else submitQuiz()
                }}
                disabled={!answers[quiz.questions[quizIdx].id] || scoring}
                className={`flex-1 py-3 rounded-xl font-bold text-sm min-h-[48px] transition-all ${
                  answers[quiz.questions[quizIdx].id]
                    ? quizIdx === quiz.total - 1 ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-blue-800 text-white hover:bg-blue-900'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                {scoring ? 'Scoring...' : quizIdx === quiz.total - 1 ? 'Submit' : 'Next'}
              </button>
            </div>
          </div>
        )}

        {/* RESULT PHASE */}
        {quizPhase === 'result' && result && (
          <div className="text-center py-6">
            <div className={`text-5xl font-black mb-3 ${result.passed ? 'text-green-600' : 'text-red-500'}`}>
              {result.percentage}%
            </div>

            {effectiveStatus === 'mastered' ? (
              <>
                <p className="text-green-700 font-bold text-lg mb-1">Concept Mastered!</p>
                <p className="text-gray-500 text-sm mb-6">Passed 2/2 — this concept will review in 3 days.</p>
              </>
            ) : effectiveStatus === 'reviewed' ? (
              <>
                <p className="text-blue-700 font-bold text-lg mb-1">Pass 1 of 2</p>
                <p className="text-gray-500 text-sm mb-6">Take the quiz again with new questions to master this concept.</p>
              </>
            ) : (
              <>
                <p className="text-red-600 font-bold text-lg mb-1">Need 80% to Pass</p>
                <p className="text-gray-500 text-sm mb-6">Review the lesson and try again.</p>
              </>
            )}

            <div className="flex flex-col gap-3 items-center">
              {/* Retry / Quiz 2 */}
              {effectiveStatus !== 'mastered' && (
                <button
                  onClick={() => openConcept(activeConceptPrefix!, activeConceptId!)}
                  className={`w-full max-w-xs px-6 py-3 rounded-xl font-bold text-sm min-h-[48px] ${
                    effectiveStatus === 'reviewed' ? 'bg-blue-800 text-white' : 'bg-red-600 text-white'
                  }`}
                >
                  {effectiveStatus === 'reviewed' ? 'Take Quiz 2' : 'Try Again'}
                </button>
              )}

              {/* Next Lesson — auto-advance in course mode */}
              {effectiveStatus === 'mastered' && nextLesson && (
                <button
                  onClick={() => openConcept(nextLesson.subtopicPrefix, nextLesson.id)}
                  className="w-full max-w-xs px-6 py-3 rounded-xl bg-green-600 text-white font-bold text-sm min-h-[48px] hover:bg-green-700 flex items-center justify-center gap-2"
                >
                  Next Lesson: {nextLesson.title} <ChevronRight size={18} />
                </button>
              )}

              {/* All done! */}
              {effectiveStatus === 'mastered' && !nextLesson && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 w-full max-w-xs">
                  <p className="text-green-800 font-bold">All Concepts Mastered!</p>
                  <p className="text-green-600 text-sm mt-1">You&apos;re ready for the real exam.</p>
                </div>
              )}

              <button onClick={closeModal}
                className="w-full max-w-xs px-6 py-3 rounded-xl bg-gray-100 text-gray-600 font-medium text-sm min-h-[48px]">
                Back to Study Path
              </button>
            </div>

            {/* Per-question review — see what you missed, ask the AI tutor why */}
            {result.results && result.results.length > 0 && (
              <div className="mt-8 text-left">
                <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">Review your answers</h2>
                <div className="space-y-3">
                  {result.results.map((r, i) => {
                    const q = quiz.questions.find(qq => qq.id === r.questionId)
                    if (!q) return null
                    return (
                      <div key={r.questionId}
                        className={`rounded-xl border-2 p-4 ${r.correct ? 'border-green-200 bg-green-50/50' : 'border-red-200 bg-red-50/50'}`}>
                        <div className="flex items-start gap-2 mb-2">
                          <span className={`shrink-0 mt-0.5 ${r.correct ? 'text-green-600' : 'text-red-500'}`}>
                            {r.correct ? <Check size={16} /> : <X size={16} />}
                          </span>
                          <p className="text-sm font-semibold text-gray-900 leading-snug">
                            <span className="text-gray-400 font-normal mr-1">Q{i + 1}.</span>{q.question}
                          </p>
                        </div>
                        {!r.correct && (
                          <p className="text-xs text-red-700 ml-6 mb-0.5">
                            Your answer: <span className="font-medium">{(r.userAnswer || '—').split(MULTI_SEP).join(', ')}</span>
                          </p>
                        )}
                        <p className="text-xs text-green-700 ml-6">
                          Correct: <span className="font-semibold">{(r.correctAnswer || '').split(MULTI_SEP).join(', ')}</span>
                        </p>
                        {!r.correct && (
                          <div className="ml-6">
                            <ExplainButton questionText={q.question} correctAnswer={r.correctAnswer} />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN VIEW
  // ═══════════════════════════════════════════════════════════════════════════
    // Linear skill-unlock: first non-cleared concept is the current level; later ones lock.
  let currentIdx = orderedConcepts.findIndex(c => { const s = getEffectiveStatus(progress[c.id] || { status: 'pending', passCount: 0, lastPassed: null }); return !(s === 'mastered' || s === 'review') })
  if (currentIdx === -1) currentIdx = orderedConcepts.length

return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white">
      {/* Slim sticky header */}
      <div className="sticky top-0 z-10 bg-white/85 backdrop-blur border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-base font-extrabold text-gray-900">Study Path</h1>
          <p className="text-[11px] text-gray-400">{totalMastered}/{concepts.length} mastered · {overallPct}%</p>
        </div>
        <div className="w-24 h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-green-500 rounded-full transition-all duration-500" style={{ width: `${overallPct}%` }} />
        </div>
      </div>

      {/* Winding skill path — amplitude widens with screen so desktop uses the width */}
      <div className="px-6 py-8 mx-auto pb-28 max-w-md md:max-w-3xl lg:max-w-5xl [--amp:60px] md:[--amp:230px] lg:[--amp:340px]">
        {orderedConcepts.map((c, idx) => {
          const p = progress[c.id] || { status: 'pending' as const, passCount: 0, lastPassed: null }
          const st = getEffectiveStatus(p)
          const cleared = st === 'mastered' || st === 'review'
          const locked = idx > currentIdx
          const isCurrent = idx === currentIdx
          const prevCat = idx > 0 ? orderedConcepts[idx - 1].category : null
          const showBanner = c.category !== prevCat
          const wob = Math.sin(idx * 0.8).toFixed(3) // -1..1; × responsive --amp

          // node visual
          let circle = 'bg-gray-200 text-gray-400'
          let icon = <Lock size={22} />
          if (cleared && st === 'review') { circle = 'bg-amber-400 text-white shadow-amber-600/40'; icon = <RotateCcw size={22} /> }
          else if (cleared) { circle = 'bg-green-500 text-white shadow-green-700/40'; icon = <Check size={26} strokeWidth={3} /> }
          else if (isCurrent) { circle = 'bg-sky-600 text-white shadow-sky-800/40'; icon = <Play size={24} className="ml-0.5" fill="white" /> }
          else if (st === 'weak') { circle = 'bg-rose-500 text-white shadow-rose-700/40'; icon = <AlertTriangle size={22} /> }
          else if (st === 'reviewed') { circle = 'bg-sky-500 text-white shadow-sky-700/40'; icon = <BookOpen size={22} /> }

          return (
            <div key={c.id}>
              {showBanner && (
                <div className="flex items-center gap-3 mt-7 mb-9 first:mt-2">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs font-extrabold text-gray-500 uppercase tracking-widest px-3 py-1 rounded-full bg-white border border-gray-200 shadow-sm">
                    {c.category}
                  </span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>
              )}
              <div className="flex justify-center my-6" style={{ transform: `translateX(calc(var(--amp) * ${wob}))` }}>
                <button
                  disabled={locked}
                  title={locked ? 'Master the level before this to unlock' : c.title}
                  onClick={() => !locked && openConcept(c.subtopicPrefix, c.id)}
                  className={`group relative flex flex-col items-center ${locked ? 'cursor-not-allowed' : 'cursor-pointer active:translate-y-0.5'} transition-transform`}
                >
                  {isCurrent && (
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-10 text-[10px] font-extrabold text-white bg-sky-700 px-2 py-0.5 rounded-full shadow animate-pulse whitespace-nowrap">START</span>
                  )}
                  <span className={`w-16 h-16 rounded-full flex items-center justify-center border-b-4 ${circle} ${locked ? 'border-gray-300' : 'border-black/20'} ${isCurrent ? 'ring-4 ring-sky-200' : ''} shadow-lg`}>
                    {icon}
                  </span>
                  <span className={`mt-1.5 text-[11px] font-semibold text-center leading-tight max-w-[130px] ${locked ? 'text-gray-300' : 'text-gray-700'}`}>
                    {c.title}
                  </span>
                </button>
              </div>
            </div>
          )
        })}

        {currentIdx >= orderedConcepts.length && (
          <div className="mt-8 text-center bg-green-50 border border-green-200 rounded-2xl p-6">
            <Trophy size={36} className="text-amber-500 mx-auto mb-2" />
            <p className="text-green-800 font-extrabold text-lg">All {concepts.length} levels mastered!</p>
            <p className="text-green-600 text-sm mt-1">You&apos;re ready for the real exam.</p>
          </div>
        )}

        {/* Flashcards (optional drill) */}
        <a href="/flashcards"
          className="mt-10 flex items-center gap-3 bg-white rounded-xl border border-gray-200 p-3 hover:border-blue-300 hover:bg-blue-50/50 transition-colors">
          <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
            <LayoutGrid size={18} className="text-purple-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900">Flashcards</p>
            <p className="text-xs text-gray-400">Swipe-drill any section</p>
          </div>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 shrink-0">Pro</span>
          <ChevronRight size={16} className="text-gray-300 shrink-0" />
        </a>
      </div>
    </div>
  )
}
