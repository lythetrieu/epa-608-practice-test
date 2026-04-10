import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { TIER_LIMITS } from '@/types'
import { buildUserContext } from '@/lib/ai/context'
import { z } from 'zod'

const schema = z.object({
  examDate: z.string().min(1),
  categories: z.array(z.enum(['Core', 'Type I', 'Type II', 'Type III'])).min(1),
})

export async function POST(request: NextRequest) {
  // Auth
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  // Tier check — Ultimate only
  const { data: profile } = await supabase
    .from('users_profile')
    .select('tier')
    .eq('id', user.id)
    .single()
  if (!profile) return Response.json({ error: 'Profile not found' }, { status: 404 })

  const tier = profile.tier as keyof typeof TIER_LIMITS
  if (tier !== 'ultimate') {
    return Response.json({ error: 'Study Plan AI requires the Ultimate plan.', upgradeRequired: true }, { status: 403 })
  }

  // Parse request
  const body = await request.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) return Response.json({ error: 'Invalid request' }, { status: 400 })

  const { examDate, categories } = parsed.data

  const daysUntilExam = Math.ceil(
    (new Date(examDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  )
  if (daysUntilExam < 1) {
    return Response.json({ error: 'Exam date must be in the future.' }, { status: 400 })
  }

  // Get user performance context
  const userContext = await buildUserContext(user.id)

  // Build prompt
  const systemPrompt = `You are an EPA 608 certification study plan generator. Generate a structured day-by-day study plan as valid JSON.

The user has ${daysUntilExam} days until their exam. They want to study these categories: ${categories.join(', ')}.

${userContext}

Rules:
- Create a plan with one entry per day (max ${Math.min(daysUntilExam, 30)} days — if more than 30 days, spread topics across 30 study days)
- Each day should focus on a specific topic or review session
- Mix modes: "Practice" (take practice tests), "Flashcards" (review terms), "Review" (revisit weak areas), "Full Test" (simulated exam)
- Schedule review days every 3-4 study days
- Prioritize the user's weak areas early in the plan
- Include estimated study time in minutes (30-90 min per day)
- For the last 2-3 days, schedule full practice tests
- Be specific about EPA 608 subtopics

Return ONLY valid JSON in this exact format (no markdown, no explanation):
{
  "totalDays": ${daysUntilExam},
  "examDate": "${examDate}",
  "days": [
    {
      "day": 1,
      "date": "YYYY-MM-DD",
      "topic": "Core - Environment & Ozone",
      "mode": "Practice",
      "estimatedMinutes": 45,
      "details": "Complete 25 practice questions on ozone depletion, CFC/HCFC/HFC classifications, and ODP/GWP metrics."
    }
  ]
}`

  const models = ['qwen/qwen3-235b-a22b:free', 'qwen/qwen-2.5-72b-instruct']

  for (const model of models) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001',
          'X-Title': 'EPA 608 Practice Test',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Generate my ${daysUntilExam}-day study plan for ${categories.join(', ')} categories. My exam is on ${examDate}.` },
          ],
          temperature: 0.4,
          max_tokens: 4096,
          response_format: { type: 'json_object' },
        }),
      })

      if (!res.ok) continue

      const data = await res.json()
      const content = data.choices?.[0]?.message?.content

      if (!content) continue

      // Parse AI response — strip markdown fences if present
      let cleaned = content.trim()
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '')
      }

      try {
        const plan = JSON.parse(cleaned)
        // Validate structure
        if (!plan.days || !Array.isArray(plan.days) || plan.days.length === 0) continue
        return Response.json(plan)
      } catch {
        continue
      }
    } catch {
      continue
    }
  }

  return Response.json({ error: 'AI service unavailable. Please try again.' }, { status: 502 })
}
