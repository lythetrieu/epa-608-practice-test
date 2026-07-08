import type { ReactNode } from 'react'

/**
 * Quiz modes — one engine, four surfaces:
 *  - 'practice' : untimed, open-book; per-question reveal + explanation + ELI5
 *  - 'exam'     : countdown timer, deferred feedback (results after submit)
 *  - 'drill'    : Weak Spots blind-spot drill — behaves like 'exam'
 *  - 'study'    : Study Path 10-question mastery check — untimed, deferred
 *                 feedback, Study Path visual chrome (brand navy card)
 */
export type QuizMode = 'practice' | 'exam' | 'drill' | 'study'

/**
 * Superset question shape covering BOTH current API payloads:
 *  - /api/questions         → QuestionPublic (+ answer_text/explanation in practice mode)
 *  - /api/public/study-path → Study Path quiz questions
 * Callers map their responses to this shape — the engine never fetches.
 */
export type QuizQuestion = {
  id: string
  question: string
  options: string[]
  /** Source category (e.g. 'Core') — shown as the section banner on Universal tests. */
  category?: string
  difficulty?: string
  /** 'multi_select' | 'true_false' | undefined (single choice) */
  question_type?: string
  /** Present ONLY in open-book (practice) responses — timed/study payloads never send it. */
  answer_text?: string
  explanation?: string
}

export type AnswerRecord = {
  questionId: string
  /** Canonical answer (MULTI_SEP-joined for multi-select), or null if unanswered. */
  answer: string | null
  /** Only known client-side in practice (open-book) mode; the server scores otherwise. */
  correct?: boolean
  /** Epoch ms when the question was first shown — powers per-question timeMs tracking. */
  firstViewedAt?: number
  /**
   * ACTIVE viewing ms from first view to the final answer lock, accumulated
   * across revisits (time spent looking at OTHER questions never counts).
   * Absent when the question was never answered.
   */
  timeMs?: number
}

export type QuizOutcome = {
  answers: AnswerRecord[]
  /** questionId → canonical answer — the exact map today's submit endpoints expect. */
  answersMap: Record<string, string>
  /** Client-known correct count (practice only; 0 when the server scores). */
  score: number
  total: number
  elapsedSecs: number
}

export type QuizEngineProps = {
  /** Pre-fetched by the caller — the engine never fetches or submits. */
  questions: QuizQuestion[]
  mode: QuizMode
  /** Countdown seconds for 'exam'/'drill'. Ignored by untimed modes. */
  timeLimitSecs?: number | null
  /**
   * Fired on submit (manual, or countdown expiry in timed modes). Awaited —
   * the submit button shows its pending label while this runs. The caller owns
   * server submission and the result screen (it unmounts the engine).
   */
  onComplete: (outcome: QuizOutcome) => void | Promise<void>
  /** Optional per-answer hook — fires whenever an option is picked/toggled. */
  onQuestionAnswered?: (r: AnswerRecord) => void
  /** Header label: category name (practice/exam/drill) or centered title (study). */
  title?: string
  /** Caller-specific header node — Study Path passes its Exit button here. */
  header?: ReactNode
  /** Show the per-question section banner (Universal tests only today). */
  showQuestionCategory?: boolean
}
