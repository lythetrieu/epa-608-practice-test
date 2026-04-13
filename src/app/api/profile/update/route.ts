import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

/**
 * POST /api/profile/update
 * Updates the user's display name via Supabase user_metadata.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const displayName = body.display_name

  if (typeof displayName !== 'string' || displayName.trim().length === 0) {
    return NextResponse.json({ error: 'Display name is required' }, { status: 400 })
  }

  if (displayName.trim().length > 100) {
    return NextResponse.json({ error: 'Display name is too long' }, { status: 400 })
  }

  const { error } = await supabase.auth.updateUser({
    data: { display_name: displayName.trim() },
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Also update users_profile.display_name
  await supabase
    .from('users_profile')
    .update({ display_name: displayName.trim() })
    .eq('id', user.id)

  return NextResponse.json({ success: true })
}

/**
 * DELETE /api/profile/update
 * Deletes the user's account and all associated data.
 */
export async function DELETE() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const admin = createAdminClient()

    // Delete user data in order (respecting foreign keys)
    await admin.from('user_progress').delete().eq('user_id', user.id)
    await admin.from('test_sessions').delete().eq('user_id', user.id)
    await admin.from('users_profile').delete().eq('id', user.id)

    // Delete auth user
    const { error } = await admin.auth.admin.deleteUser(user.id)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    console.error('Account deletion error:', err)
    return NextResponse.json(
      { error: 'Failed to delete account. Please contact support.' },
      { status: 500 },
    )
  }
}
