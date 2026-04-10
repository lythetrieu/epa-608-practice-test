// ─────────────────────────────────────────────────────────────────────────────
// Offline support — download & cache all 531 questions for offline practice
// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'epa608_offline_questions'
const SYNC_KEY = 'epa608_offline_sync'

export type OfflineQuestion = {
  id: string
  category: string
  subtopic_id: string | null
  question: string
  options: string[]
  answer_text: string
  explanation: string
  difficulty: string
}

export type OfflineData = {
  total: number
  syncedAt: string
  categories: Record<string, OfflineQuestion[]>
}

/**
 * Download all questions from the server and store in localStorage.
 * Returns the synced data or throws on failure.
 */
export async function syncOfflineQuestions(): Promise<OfflineData> {
  const res = await fetch('/api/offline/questions')
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `Sync failed (${res.status})`)
  }

  const data: OfflineData = await res.json()
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  localStorage.setItem(SYNC_KEY, data.syncedAt)
  return data
}

/**
 * Get all cached offline questions (or null if never synced).
 */
export function getOfflineData(): OfflineData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

/**
 * Get offline questions for a specific category, shuffled.
 */
export function getOfflineQuestions(
  category: string,
  count?: number,
): OfflineQuestion[] | null {
  const data = getOfflineData()
  if (!data) return null

  let questions: OfflineQuestion[]

  if (category === 'Universal') {
    // Combine all categories
    questions = Object.values(data.categories).flat()
  } else {
    questions = data.categories[category] ?? []
  }

  // Shuffle
  questions = [...questions].sort(() => Math.random() - 0.5)

  // Limit
  if (count && count < questions.length) {
    questions = questions.slice(0, count)
  }

  return questions
}

/**
 * Get the last sync timestamp, or null if never synced.
 */
export function getLastSyncTime(): string | null {
  return localStorage.getItem(SYNC_KEY)
}

/**
 * Get approximate storage size of cached questions in bytes.
 */
export function getOfflineStorageSize(): number {
  const raw = localStorage.getItem(STORAGE_KEY)
  return raw ? new Blob([raw]).size : 0
}

/**
 * Clear all offline data.
 */
export function clearOfflineData(): void {
  localStorage.removeItem(STORAGE_KEY)
  localStorage.removeItem(SYNC_KEY)
}

/**
 * Check if the browser is currently offline.
 */
export function isOffline(): boolean {
  return typeof navigator !== 'undefined' && !navigator.onLine
}

/**
 * Check if offline data is available (regardless of network status).
 */
export function hasOfflineData(): boolean {
  return localStorage.getItem(STORAGE_KEY) !== null
}
