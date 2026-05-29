import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { parsePaddleWebhook } from '@/lib/paddle'
import { EventName } from '@paddle/paddle-node-sdk'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const signature = request.headers.get('paddle-signature') ?? ''

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let event: any
  try {
    event = parsePaddleWebhook(rawBody, signature)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
  }

  const admin = createAdminClient()

  try {
    switch (event.eventType) {

      case EventName.TransactionCompleted: {
        const tx = event.data
        const custom = tx.customData as { user_id?: string; tier?: string; seats?: number; team_name?: string }
        if (!custom?.user_id || !custom?.tier) break

        if (custom.tier === 'starter') {
          await admin.from('users_profile').update({
            tier: 'starter', lifetime_access: true,
            paddle_customer_id: tx.customerId,
          }).eq('id', custom.user_id)
        }

        else if (custom.tier === 'ultimate') {
          await admin.from('users_profile').update({
            tier: 'ultimate', lifetime_access: true,
            paddle_customer_id: tx.customerId,
          }).eq('id', custom.user_id)
        }

        else if (custom.tier === 'team') {
          const seats = custom.seats ?? 5
          const inviteCode = crypto.randomUUID()
          const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
          const codeExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

          const { data: team } = await admin.from('teams').insert({
            name: custom.team_name ?? 'My Team',
            owner_id: custom.user_id,
            seats_total: seats,
            seats_used: 1,
            invite_code: inviteCode,
            invite_code_expires_at: codeExpiry,
            paddle_subscription_id: tx.subscriptionId ?? null,
            expires_at: expiresAt,
          }).select('id').single()

          if (team) {
            await admin.from('users_profile').update({
              tier: 'ultimate',
              team_id: team.id,
              is_team_admin: true,
              paddle_customer_id: tx.customerId,
            }).eq('id', custom.user_id)
          }
        }
        break
      }

      case EventName.SubscriptionCanceled: {
        const { data: team } = await admin.from('teams')
          .select('id').eq('paddle_subscription_id', event.data.id).single()
        if (team) {
          await admin.from('users_profile')
            .update({ tier: 'free', team_id: null, is_team_admin: false })
            .eq('team_id', team.id)
          await admin.from('teams')
            .update({ expires_at: new Date().toISOString() })
            .eq('id', team.id)
        }
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (e) {
    console.error('Webhook error:', e)
    return NextResponse.json({ error: 'Processing error' }, { status: 500 })
  }
}
