'use client'

import { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, Check, AlertTriangle, RotateCcw, ChevronRight, BookOpen, Brain, Lightbulb, AlertCircle, Lock, ListOrdered, LayoutGrid, Eye } from 'lucide-react'
import { CONCEPT_VISUALS } from './concept-visuals'

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

type ViewMode = 'course' | 'browse'

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

function getSavedMode(): ViewMode {
  try {
    return (localStorage.getItem('epa608StudyMode') as ViewMode) || 'course'
  } catch { return 'course' }
}

function getEffectiveStatus(prog: ConceptProgress): string {
  const status = prog.status || 'pending'
  if (status === 'mastered' && prog.lastPassed) {
    const days = (Date.now() - new Date(prog.lastPassed).getTime()) / 86400000
    if (days > 3) return 'review'
  }
  return status
}

// Status icon/color map used in both views
function getStatusUI(status: string) {
  const map: Record<string, { icon: React.ReactNode; color: string; bg: string; label: string }> = {
    mastered: { icon: <Check size={16} />, color: 'text-green-600', bg: 'bg-green-50 border-green-200', label: 'Mastered' },
    reviewed: { icon: <BookOpen size={16} />, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200', label: 'Pass 1/2' },
    weak: { icon: <AlertTriangle size={16} />, color: 'text-red-500', bg: 'bg-red-50 border-red-200', label: 'Needs Work' },
    review: { icon: <RotateCcw size={16} />, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', label: 'Review Due' },
    pending: { icon: <ChevronRight size={16} />, color: 'text-gray-400', bg: 'bg-white border-gray-200', label: 'Study' },
    locked: { icon: <Lock size={14} />, color: 'text-gray-300', bg: 'bg-gray-50 border-gray-100', label: 'Locked' },
  }
  return map[status] || map.pending
}

export default function StudyPathClient() {
  const [concepts, setConcepts] = useState<Concept[]>([])
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState<Record<string, ConceptProgress>>({})
  const [mode, setMode] = useState<ViewMode>('course')
  const [activeConceptPrefix, setActiveConceptPrefix] = useState<string | null>(null)
  const [activeConceptId, setActiveConceptId] = useState<string | null>(null)
  const [quiz, setQuiz] = useState<QuizData | null>(null)
  const [quizIdx, setQuizIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [quizPhase, setQuizPhase] = useState<'lesson' | 'quiz' | 'result'>('lesson')
  const [lessonReady, setLessonReady] = useState(false)
  const [result, setResult] = useState<{ percentage: number; passed: boolean } | null>(null)
  const [scoring, setScoring] = useState(false)

  useEffect(() => {
    setProgress(getProgress())
    setMode(getSavedMode())
    fetch('/api/public/study-path')
      .then(r => r.json())
      .then(data => { setConcepts(data.concepts || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const switchMode = (m: ViewMode) => {
    setMode(m)
    localStorage.setItem('epa608StudyMode', m)
  }

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
  const sectionStats = sections.map(cat => {
    const items = grouped[cat] || []
    let mastered = 0, inProgress = 0, weak = 0
    items.forEach(c => {
      const p = progress[c.id] || { status: 'pending', passCount: 0, lastPassed: null }
      const s = getEffectiveStatus(p)
      if (s === 'mastered') { mastered++; totalMastered++ }
      else if (s === 'reviewed') inProgress++
      else if (s === 'weak' || s === 'review') weak++
    })
    return { cat, total: items.length, mastered, inProgress, weak }
  })
  const overallPct = concepts.length > 0 ? Math.round(totalMastered / concepts.length * 100) : 0

  // Course mode: find current lesson index (first non-mastered)
  const currentLessonIdx = orderedConcepts.findIndex(c => {
    const p = progress[c.id]
    if (!p) return true
    return getEffectiveStatus(p) !== 'mastered'
  })
  const currentLesson = currentLessonIdx >= 0 ? orderedConcepts[currentLessonIdx] : null

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
    setTimeout(() => setLessonReady(true), 4000)

    fetch('/api/public/study-path', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conceptPrefix: prefix, count: 5 }),
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
      setResult({ percentage: data.percentage, passed })
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
            {quiz.lesson ? (
              <div className="space-y-4 mb-6">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <BookOpen size={16} className="text-blue-600" />
                    <span className="text-xs font-bold text-blue-700 uppercase tracking-wide">Quick Overview</span>
                  </div>
                  <p className="text-sm text-gray-800 leading-relaxed">
                    {quiz.lesson.split(/\.\s+/).slice(0, 3).join('. ').trim().replace(/\.$/, '') + '.'}
                  </p>
                </div>

                {/* Visual Diagram */}
                {activeConceptPrefix && CONCEPT_VISUALS[activeConceptPrefix] && (
                  <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Eye size={14} className="text-gray-600" />
                      <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Visual Guide</span>
                    </div>
                    {CONCEPT_VISUALS[activeConceptPrefix]()}
                  </div>
                )}

                {/* Exam Patterns — must-know rules & numbers */}
                {quiz.facts && quiz.facts.length > 0 && (() => {
                  const rules = quiz.facts.filter(f => /(must|never|always|required|illegal|violation|prohibited|cannot|only)/i.test(f))
                  const numbers = quiz.facts.filter(f => /\d/.test(f) && !rules.includes(f))
                  const patterns = [...rules.slice(0, 6), ...numbers.slice(0, 4)]
                  const remaining = quiz.facts.filter(f => !patterns.includes(f))

                  return (
                    <div className="space-y-3">
                      {patterns.length > 0 && (
                        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <AlertCircle size={14} className="text-orange-600" />
                            <span className="text-xs font-bold text-orange-700 uppercase tracking-wide">
                              Exam Patterns — What They Test
                            </span>
                          </div>
                          <ul className="space-y-2">
                            {patterns.map((fact, i) => {
                              const isRule = rules.includes(fact)
                              return (
                                <li key={i} className={`text-xs leading-relaxed pl-3 py-1.5 rounded-lg border-l-2 ${
                                  isRule ? 'border-red-400 bg-red-50/70 text-red-800 font-medium' : 'border-blue-400 bg-blue-50/70 text-blue-800'
                                }`}>
                                  {fact}
                                </li>
                              )
                            })}
                          </ul>
                        </div>
                      )}

                      {remaining.length > 0 && (
                        <details className="bg-gray-50 border border-gray-200 rounded-xl">
                          <summary className="px-4 py-3 cursor-pointer text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-2 select-none">
                            <ChevronRight size={14} className="transition-transform details-open:rotate-90" />
                            All {quiz.facts.length} Facts (Reference)
                          </summary>
                          <ul className="px-4 pb-4 space-y-1.5 max-h-[300px] overflow-y-auto">
                            {remaining.map((fact, i) => (
                              <li key={i} className="text-xs text-gray-600 leading-relaxed pl-3 border-l-2 border-gray-200 py-0.5">
                                {fact}
                              </li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </div>
                  )
                })()}

                {quiz.keyNumbers.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Brain size={14} className="text-amber-600" />
                      <span className="text-xs font-bold text-amber-700 uppercase tracking-wide">Numbers to Remember</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {quiz.keyNumbers.map((n, i) => (
                        <span key={i} className="px-3 py-1 bg-white border border-amber-300 rounded-lg text-sm font-semibold text-amber-800">{n}</span>
                      ))}
                    </div>
                  </div>
                )}

                {quiz.memoryTrick && (
                  <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Lightbulb size={14} className="text-indigo-600" />
                      <span className="text-xs font-bold text-indigo-700 uppercase tracking-wide">Memory Trick</span>
                    </div>
                    <p className="text-sm text-indigo-800 font-medium">{quiz.memoryTrick}</p>
                  </div>
                )}

                {quiz.examWarning && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle size={14} className="text-red-600" />
                      <span className="text-xs font-bold text-red-700 uppercase tracking-wide">Exam Trap</span>
                    </div>
                    <p className="text-sm text-red-800">{quiz.examWarning}</p>
                  </div>
                )}
              </div>
            ) : null}

            <button
              onClick={() => { setQuizPhase('quiz'); setQuizIdx(0) }}
              disabled={!lessonReady}
              className={`w-full py-3.5 rounded-xl font-bold text-base min-h-[52px] transition-all ${
                lessonReady ? 'bg-blue-800 text-white hover:bg-blue-900' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {lessonReady ? "I've Read This — Start Quiz" : 'Read the lesson first...'}
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

            <p className="text-base font-semibold text-gray-900 mb-4 leading-relaxed">
              {quiz.questions[quizIdx].question}
            </p>

            <div className="space-y-2 mb-6">
              {quiz.questions[quizIdx].options.map((opt, i) => {
                const selected = answers[quiz.questions[quizIdx].id] === opt
                return (
                  <button
                    key={i}
                    onClick={() => setAnswers(prev => ({ ...prev, [quiz.questions[quizIdx].id]: opt }))}
                    className={`w-full text-left px-4 py-3.5 rounded-xl border-2 text-sm font-medium min-h-[52px] transition-all ${
                      selected ? 'border-blue-600 bg-blue-50 text-blue-900' : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300'
                    }`}
                  >
                    {opt}
                  </button>
                )
              })}
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
          </div>
        )}
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN VIEW
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="p-3 sm:p-6 max-w-3xl">
      {/* Header + Mode Toggle */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 mb-0.5">Study Path</h1>
          <p className="text-sm text-gray-500">Master every concept. Pass the exam.</p>
        </div>
        <div className="flex bg-gray-100 rounded-lg p-0.5 shrink-0">
          <button
            onClick={() => switchMode('course')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              mode === 'course' ? 'bg-white text-blue-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <ListOrdered size={14} /> Course
          </button>
          <button
            onClick={() => switchMode('browse')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              mode === 'browse' ? 'bg-white text-blue-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <LayoutGrid size={14} /> Browse
          </button>
        </div>
      </div>

      {/* Overall progress */}
      <div className="bg-blue-800 rounded-xl p-4 mb-4 text-white">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold">{totalMastered}/{concepts.length} Concepts Mastered</span>
          <span className="text-sm font-bold">{overallPct}%</span>
        </div>
        <div className="h-2.5 bg-blue-950 rounded-full overflow-hidden">
          <div className="h-full bg-green-400 rounded-full transition-all duration-500" style={{ width: `${overallPct}%` }} />
        </div>
      </div>

      {/* Section cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
        {sectionStats.map(s => {
          const pct = s.total > 0 ? Math.round(s.mastered / s.total * 100) : 0
          return (
            <div key={s.cat} className="bg-white rounded-xl border border-gray-200 p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-gray-700">{s.cat}</span>
                <span className={`text-xs font-bold ${pct >= 80 ? 'text-green-600' : pct > 0 ? 'text-amber-600' : 'text-gray-400'}`}>{pct}%</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${pct >= 80 ? 'bg-green-500' : pct > 0 ? 'bg-amber-400' : 'bg-gray-200'}`} style={{ width: `${pct}%` }} />
              </div>
              <div className="text-[10px] text-gray-400 mt-1">{s.mastered}/{s.total} mastered</div>
            </div>
          )
        })}
      </div>

      {/* ═══ COURSE MODE ═══ */}
      {mode === 'course' && (
        <>
          {/* Current lesson CTA */}
          {currentLesson && (
            <button
              onClick={() => openConcept(currentLesson.subtopicPrefix, currentLesson.id)}
              className="w-full bg-green-600 text-white rounded-xl p-4 mb-5 hover:bg-green-700 transition-colors text-left flex items-center justify-between"
            >
              <div>
                <p className="text-xs text-green-200 font-semibold mb-0.5">
                  Lesson {currentLessonIdx + 1} of {orderedConcepts.length}
                </p>
                <p className="font-bold text-base">{currentLesson.title}</p>
                <p className="text-green-100 text-xs mt-0.5">{currentLesson.category}</p>
              </div>
              <ChevronRight size={24} className="shrink-0" />
            </button>
          )}

          {!currentLesson && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-5 mb-5 text-center">
              <p className="text-green-800 font-bold text-lg">All 23 Concepts Mastered!</p>
              <p className="text-green-600 text-sm mt-1">You&apos;ve completed the entire study path. Take a practice test to confirm.</p>
            </div>
          )}

          {/* Linear concept list with step numbers */}
          <div className="space-y-1">
            {orderedConcepts.map((c, idx) => {
              const p = progress[c.id] || { status: 'pending', passCount: 0, lastPassed: null }
              const status = getEffectiveStatus(p)
              const isCurrent = currentLesson?.id === c.id
              const isLocked = mode === 'course' && idx > currentLessonIdx && status === 'pending' && currentLessonIdx >= 0
              const effectiveStatus = isLocked ? 'locked' : status
              const ui = getStatusUI(effectiveStatus)

              // Section divider
              const prevCat = idx > 0 ? orderedConcepts[idx - 1].category : null
              const showDivider = c.category !== prevCat

              return (
                <div key={c.id}>
                  {showDivider && (
                    <div className="flex items-center gap-2 pt-4 pb-1.5">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{c.category}</span>
                      <div className="flex-1 h-px bg-gray-200" />
                    </div>
                  )}
                  <button
                    onClick={() => !isLocked && openConcept(c.subtopicPrefix, c.id)}
                    disabled={isLocked}
                    className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl border transition-all min-h-[52px] ${
                      isCurrent ? 'border-green-400 bg-green-50 ring-2 ring-green-200' : ui.bg
                    } ${isLocked ? 'cursor-not-allowed opacity-60' : 'hover:shadow-sm'}`}
                  >
                    {/* Step number */}
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      effectiveStatus === 'mastered' ? 'bg-green-600 text-white'
                      : isCurrent ? 'bg-green-600 text-white'
                      : effectiveStatus === 'locked' ? 'bg-gray-200 text-gray-400'
                      : 'bg-gray-100 text-gray-500'
                    }`}>
                      {effectiveStatus === 'mastered' ? <Check size={14} /> : idx + 1}
                    </span>

                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${isLocked ? 'text-gray-400' : 'text-gray-900'}`}>{c.title}</p>
                    </div>

                    <span className={`text-xs font-semibold shrink-0 ${ui.color}`}>
                      {isCurrent && effectiveStatus === 'pending' ? 'Start' : ui.label}
                    </span>
                  </button>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* ═══ BROWSE MODE ═══ */}
      {mode === 'browse' && (
        <>
          {sections.map(cat => {
            const items = grouped[cat] || []
            if (items.length === 0) return null
            const stats = sectionStats.find(s => s.cat === cat)!

            return (
              <div key={cat} className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">{cat}</h2>
                  <span className="text-xs text-gray-400">{stats.mastered}/{stats.total}</span>
                </div>
                <div className="space-y-1.5">
                  {items.map(c => {
                    const p = progress[c.id] || { status: 'pending', passCount: 0, lastPassed: null }
                    const status = getEffectiveStatus(p)
                    const ui = getStatusUI(status)

                    return (
                      <button
                        key={c.id}
                        onClick={() => openConcept(c.subtopicPrefix, c.id)}
                        className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl border transition-all hover:shadow-sm min-h-[52px] ${ui.bg}`}
                      >
                        <span className={`shrink-0 ${ui.color}`}>{ui.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{c.title}</p>
                        </div>
                        <span className={`text-xs font-semibold shrink-0 ${ui.color}`}>{ui.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}
