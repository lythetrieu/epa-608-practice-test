// ─────────────────────────────────────────────────────────────────────────────
// Tiers
// ─────────────────────────────────────────────────────────────────────────────

export type Tier = 'free' | 'starter' | 'ultimate' | 'pro'

export const TIER_RANK: Record<Tier, number> = {
  free: 0,
  starter: 1,
  ultimate: 2,
  pro: 2,
}

// questionPoolLimit: how many DISTINCT questions from the bank a tier may ever
// draw. Free = a fixed 200-question pool (deterministic, balanced 50/category);
// paid = the full bank (Infinity). See lib/question-pool.ts for enforcement.
export const TIER_LIMITS = {
  free: {
    questionsPerDay: Infinity,
    questionPoolLimit: Infinity, // Free = full 569 bank (Pro differentiates by features, not count)
    categories: ['Core', 'Type I', 'Type II', 'Type III', 'Universal'] as Category[],
    hasExplanations: true,
    hasProgress: true,
    hasProgressLimit: Infinity,
    hasBlindSpot: false,
    hasStudyPath: true,          // OPEN to free for now (flip to false to make it Pro-only)
    hasRadarChart: false,        // Pro only — free sees raw scores only
    hasTimedMode: false,         // Pro only — timed simulation
    hasAiChat: true,             // AI Tutor chat is free-with-quota (monthly model)
    aiQueriesPerDay: 10,         // LEGACY fallback only (pre-migration-031 daily model)
    aiQueriesPerMonth: 10,       // shared monthly counter: chat + explain/ELI5
    hasPDF: false,
  },
  starter: {
    questionsPerDay: Infinity,
    questionPoolLimit: Infinity, // Full 569-question bank
    categories: ['Core', 'Type I', 'Type II', 'Type III', 'Universal'] as Category[],
    hasExplanations: true,
    hasProgress: true,
    hasProgressLimit: Infinity,
    hasBlindSpot: true,
    hasStudyPath: true,
    hasRadarChart: true,
    hasTimedMode: true,
    hasAiChat: true,
    aiQueriesPerDay: 1000,       // LEGACY fallback only (pre-migration-031 daily model)
    aiQueriesPerMonth: 1000,     // shared monthly counter: chat + explain/ELI5
    hasPDF: true,
  },
  ultimate: {
    questionsPerDay: Infinity,
    questionPoolLimit: Infinity,
    categories: ['Core', 'Type I', 'Type II', 'Type III', 'Universal'] as Category[],
    hasExplanations: true,
    hasProgress: true,
    hasProgressLimit: Infinity,
    hasBlindSpot: true,
    hasStudyPath: true,
    hasRadarChart: true,
    hasTimedMode: true,
    hasAiChat: true,
    aiQueriesPerDay: 1000,       // LEGACY fallback only (pre-migration-031 daily model)
    aiQueriesPerMonth: 1000,     // shared monthly counter: chat + explain/ELI5
    hasPDF: true,
  },
  pro: {
    questionsPerDay: Infinity,
    questionPoolLimit: Infinity,
    categories: ['Core', 'Type I', 'Type II', 'Type III', 'Universal'] as Category[],
    hasExplanations: true,
    hasProgress: true,
    hasProgressLimit: Infinity,
    hasBlindSpot: true,
    hasStudyPath: true,
    hasRadarChart: true,
    hasTimedMode: true,
    hasAiChat: true,
    aiQueriesPerDay: 1000,       // LEGACY fallback only (pre-migration-031 daily model)
    aiQueriesPerMonth: 1000,     // shared monthly counter: chat + explain/ELI5
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
  // Monthly AI quota (migration 031). Optional: columns may not exist yet
  // (SAFE-DEPLOY — code ships before the migration runs).
  ai_queries_month?: number
  ai_queries_month_key?: string
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
  passed: boolean // >= 72% (real proctored pass mark; Universal = every section >= 72%)
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
