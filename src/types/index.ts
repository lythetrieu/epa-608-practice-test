// ─────────────────────────────────────────────────────────────────────────────
// Tiers
// ─────────────────────────────────────────────────────────────────────────────

export type Tier = 'free' | 'starter' | 'ultimate'

export const TIER_RANK: Record<Tier, number> = {
  free: 0,
  starter: 1,
  ultimate: 2,
}

export const TIER_LIMITS = {
  free: {
    questionsPerDay: Infinity,
    categories: ['Core'] as Category[],
    hasExplanations: true,
    hasProgress: true,
    hasBlindSpot: true,
    aiQueriesPerDay: 5,
    hasPDF: false,
  },
  starter: {
    questionsPerDay: Infinity,
    categories: ['Core', 'Type I', 'Type II', 'Type III'] as Category[],
    hasExplanations: true,
    hasProgress: true,
    hasBlindSpot: true,
    aiQueriesPerDay: 20,
    hasPDF: true,
  },
  ultimate: {
    questionsPerDay: Infinity,
    categories: ['Core', 'Type I', 'Type II', 'Type III'] as Category[],
    hasExplanations: true,
    hasProgress: true,
    hasBlindSpot: true,
    aiQueriesPerDay: 100,
    hasPDF: true,
  },
} as const

// ─────────────────────────────────────────────────────────────────────────────
// User
// ─────────────────────────────────────────────────────────────────────────────

export type UserProfile = {
  id: string
  email: string
  tier: Tier
  lifetime_access: boolean
  team_id: string | null
  is_team_admin: boolean
  ai_queries_today: number
  ai_queries_reset_at: string
  paddle_customer_id: string | null
  created_at: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Teams
// ─────────────────────────────────────────────────────────────────────────────

export type Team = {
  id: string
  name: string
  owner_id: string
  seats_total: number
  seats_used: number
  invite_code: string
  paddle_subscription_id: string | null
  expires_at: string
  created_at: string
}

export type TeamMember = {
  team_id: string
  user_id: string
  email: string
  is_team_admin: boolean
  joined_at: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Questions
// SECURITY: QuestionPublic NEVER exposes answer_text or explanation.
// QuestionFull is server-side only and must never be serialised to the client.
// ─────────────────────────────────────────────────────────────────────────────

export type Category = 'Core' | 'Type I' | 'Type II' | 'Type III'

/** Safe to send to the browser. Contains no answer data. */
export type QuestionPublic = {
  id: string
  category: Category
  subtopic_id: string | null
  question: string
  options: string[]
  difficulty: 'easy' | 'medium' | 'hard'
}

/**
 * Full question record — server-side only.
 * NEVER serialise this type in an API response.
 */
export type QuestionFull = QuestionPublic & {
  answer_text: string
  explanation: string
  source_ref: string
  verified: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// Progress & Sessions
// ─────────────────────────────────────────────────────────────────────────────

export type UserProgress = {
  id: string
  user_id: string
  question_id: string
  correct: boolean
  answered_at: string
}

export type TestSession = {
  id: string
  user_id: string
  category: Category | 'Universal'
  question_ids: string[]
  started_at: string
  submitted_at: string | null
  score: number | null
  total: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Scoring (server → client after submission)
// ─────────────────────────────────────────────────────────────────────────────

/** Returned per-question after a session is submitted — never before. */
export type SubmitAnswerResult = {
  questionId: string
  correct: boolean
  correctAnswer: string
  userAnswer: string | null
  explanation: string
}

/** Per-section score breakdown (Universal test only). */
export type SectionScore = {
  category: string
  score: number
  total: number
  percentage: number
  passed: boolean
}

/** Final result returned when a session is submitted. */
export type SessionResult = {
  sessionId: string
  score: number
  total: number
  percentage: number
  results: SubmitAnswerResult[]
  passed: boolean // >= 70%
  sectionScores?: SectionScore[]
}

// ─────────────────────────────────────────────────────────────────────────────
// API helpers
// ─────────────────────────────────────────────────────────────────────────────

export type ApiError = {
  error: string
  code?: string
}

export type PaginatedResponse<T> = {
  data: T[]
  total: number
  page: number
  pageSize: number
}
