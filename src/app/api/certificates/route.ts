import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/certificates - Get all certificates for current user
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: certs, error } = await supabase
    .from('certificates')
    .select('id, user_name, category, tier, score, total_questions, correct_answers, issued_at')
    .eq('user_id', user.id)
    .order('issued_at', { ascending: false })

  if (error) return NextResponse.json({ error: 'Failed to fetch certificates' }, { status: 500 })

  return NextResponse.json({ certificates: certs })
}
