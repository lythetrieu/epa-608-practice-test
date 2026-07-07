import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/auth'
import { getDashboardData } from '@/lib/dashboard-data'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// JSON backend for the local-first Dashboard (see DashboardClient +
// src/lib/local-first.ts). Middleware already 401s unauthenticated /api/app
// requests; the getCurrentUser check here is defense in depth.
export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return NextResponse.json(await getDashboardData(user.id))
}
