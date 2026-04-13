import { notFound } from 'next/navigation'
import ModeSelector from './ModeSelector'

const VALID = ['core', 'type-1', 'type-2', 'type-3', 'universal']
const CATEGORY_MAP: Record<string, string> = {
  'core': 'Core', 'type-1': 'Type I', 'type-2': 'Type II',
  'type-3': 'Type III', 'universal': 'Universal'
}

export default async function TestPage({ params, searchParams }: {
  params: Promise<{ category: string }>
  searchParams: Promise<{ mode?: string }>
}) {
  const { category: slug } = await params
  const { mode } = await searchParams
  if (!VALID.includes(slug)) notFound()
  const category = CATEGORY_MAP[slug]

  // If mode is specified via query param, go directly to test/practice
  if (mode === 'test' || mode === 'practice') {
    // Dynamic import to avoid loading both components
    if (mode === 'test') {
      const { TestClient } = await import('./TestClient')
      return <TestClient category={category} />
    } else {
      const { PracticeClient } = await import('../../practice/[category]/PracticeClient')
      return <PracticeClient category={category} />
    }
  }

  // No mode selected → show mode selector
  return <ModeSelector slug={slug} category={category} />
}
