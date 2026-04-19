/**
 * Shared types for the Question Bank Pipeline
 */

export type Difficulty = 'easy' | 'medium' | 'hard'
export type Category = 'Core' | 'Type I' | 'Type II' | 'Type III'

export type Question = {
  id: string
  category: Category
  topic: string
  subtopic: string
  subtopic_id: string
  difficulty: Difficulty
  angle: string
  question: string
  options: [string, string, string, string]
  answer_text: string
  explanation: string
  source_ref: string
  tags: string[]
  is_a2l: boolean
  last_updated: string
  verified: boolean
  // Added by pipeline (not generated)
  validation_warnings?: string[]
  dedup_hash?: string
}

export type ValidationResult = {
  valid: boolean
  warnings: string[]
  errors: string[]
}

export type CoverageReport = {
  subtopic_id: string
  label: string
  category: Category
  target: number
  current: number
  gap: number
  covered_angles: string[]
  missing_angles: string[]
}

export type ChangeDetectionResult = {
  changed: boolean
  sections: string[]
  lastChecked: string
  lastModified?: string
  details?: string
}
