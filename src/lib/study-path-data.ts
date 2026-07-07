// Study Path concept list — PURELY LOCAL computation.
//
// This builds the guided-path concept overview from three local sources:
//   • src/lib/concept-map.ts       (SUBTOPIC_TO_CONCEPT — the concept list + order)
//   • src/lib/ai/micro-lessons.json (per-concept teaching content)
//   • src/lib/ai/knowledge-base.txt (section facts → summaries)
//
// It touches NO network and NO database, so it can be called directly from a
// server component (the /learn page) as well as the public API route — no
// reason to pay an HTTP round-trip to compute static-ish data per request.
//
// Extracted verbatim from the GET handler of
// src/app/api/public/study-path/route.ts so the route and the page share ONE
// implementation.

import { SUBTOPIC_TO_CONCEPT } from '@/lib/concept-map'
import { readFileSync } from 'fs'
import { join } from 'path'

export type StudyPathConcept = {
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

type MicroLesson = {
  title: string
  lesson: string
  keyNumbers: string[]
  memoryTrick: string
  examWarning: string
}

// Load micro-lessons (teaching content for each concept). Read once at module
// load; degrades gracefully to an empty map if the file is missing.
let MICRO_LESSONS: Record<string, MicroLesson> = {}
try {
  const raw = readFileSync(join(process.cwd(), 'src/lib/ai/micro-lessons.json'), 'utf-8')
  MICRO_LESSONS = JSON.parse(raw)
} catch { /* lessons not available */ }

// Load knowledge base and extract facts / summaries per section.
const KNOWLEDGE_SECTIONS: Record<string, string> = {}
try {
  const kb = readFileSync(join(process.cwd(), 'src/lib/ai/knowledge-base.txt'), 'utf-8')
  const sections = kb.split(/\n## /)
  for (const section of sections) {
    const lines = section.split('\n')
    const title = lines[0]?.replace(/^#+\s*/, '').trim().toUpperCase()
    if (title) {
      KNOWLEDGE_SECTIONS[title] = lines.slice(1).join('\n').trim()
    }
  }
} catch { /* knowledge base not available */ }

// Build the ordered concept list with summaries + micro-lessons.
// Identical output shape to the previous inline GET handler logic.
export function buildStudyPathConcepts(): StudyPathConcept[] {
  return Object.entries(SUBTOPIC_TO_CONCEPT).map(([prefix, info]) => {
    // Find matching knowledge section
    let summary = ''
    for (const [title, content] of Object.entries(KNOWLEDGE_SECTIONS)) {
      if (title.includes(info.title.toUpperCase().split(' ')[0]) ||
          title.includes(info.title.toUpperCase().split('&')[0].trim())) {
        // Extract first 50 words as summary
        summary = content.split(/\s+/).slice(0, 50).join(' ') + '...'
        break
      }
    }

    // Get micro-lesson if available
    const microLesson = MICRO_LESSONS[prefix]

    return {
      id: info.id,
      title: info.title,
      category: info.category,
      subtopicPrefix: prefix,
      summary: summary || `Study material for ${info.title}`,
      lesson: microLesson?.lesson || '',
      keyNumbers: microLesson?.keyNumbers || [],
      memoryTrick: microLesson?.memoryTrick || '',
      examWarning: microLesson?.examWarning || '',
    }
  })
}

// Group an ordered concept list by category (same shape the route returned).
export function groupConceptsByCategory(
  concepts: StudyPathConcept[],
): Record<string, StudyPathConcept[]> {
  const grouped: Record<string, StudyPathConcept[]> = {}
  for (const c of concepts) {
    if (!grouped[c.category]) grouped[c.category] = []
    grouped[c.category].push(c)
  }
  return grouped
}
