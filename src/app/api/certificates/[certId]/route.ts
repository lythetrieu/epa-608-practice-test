import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/certificates/[certId] - Public lookup by cert ID
// Uses anon client (RLS allows public read on certificates table)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ certId: string }> }
) {
  const { certId } = await params
  const supabase = await createClient()

  const { data: cert, error } = await supabase
    .from('certificates')
    .select('id, user_name, category, tier, score, total_questions, correct_answers, issued_at')
    .eq('id', certId.toUpperCase())
    .single()

  if (error || !cert) {
    return NextResponse.json({ error: 'Certificate not found' }, { status: 404 })
  }

  return NextResponse.json({ certificate: cert })
}
