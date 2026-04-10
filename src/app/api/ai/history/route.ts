import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('id')

  if (sessionId) {
    // Load single chat session
    const { data } = await supabase
      .from('ai_chat_sessions')
      .select('id, title, messages, created_at, updated_at')
      .eq('id', sessionId)
      .single()
    return Response.json(data)
  }

  // List all chat sessions (newest first)
  const { data } = await supabase
    .from('ai_chat_sessions')
    .select('id, title, created_at, updated_at')
    .order('updated_at', { ascending: false })
    .limit(50)

  return Response.json(data ?? [])
}
