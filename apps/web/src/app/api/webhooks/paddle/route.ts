import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  extractPlanCode,
  extractUserId,
  parseSignature,
  verifySignature,
} from '@/lib/paddle/webhook'

async function applySuccess(
  supabase: any,
  userId: string,
  planCode: string | null,
  eventType: string,
  eventId: string,
  payload: any
) {
  let creditsToAdd = 0
  let isSubscriptionPlan = false
  if (planCode) {
    const { data: plan } = await supabase
      .from('credit_packages')
      .select('credits, is_subscription_plan')
      .eq('plan_code', planCode)
      .eq('is_active', true)
      .single()

    creditsToAdd = Number(plan?.credits ?? 0)
    isSubscriptionPlan = plan?.is_subscription_plan === true
  }

  const now = new Date().toISOString()
  const { data: userCredit } = await supabase
    .from('user_credits')
    .select(
      'balance, subscription_status, plan_code, paddle_subscription_id, subscription_expires_at, subscription_next_billing_at'
    )
    .eq('user_id', userId)
    .single()

  if (!userCredit) {
    return
  }

  const shouldAddCredits = !isSubscriptionPlan || eventType === 'payment_success'
  const nextBalance = (userCredit.balance ?? 0) + (shouldAddCredits ? creditsToAdd : 0)

  await supabase
    .from('user_credits')
    .update({
      balance: nextBalance,
      subscription_status: 'active',
      plan_code: planCode || userCredit.plan_code,
      paddle_subscription_id:
        payload?.subscription?.id || payload?.subscription_id || userCredit.paddle_subscription_id || null,
      subscription_expires_at: payload?.subscription?.next_bill_date || userCredit.subscription_expires_at || null,
      subscription_next_billing_at: payload?.subscription?.next_billing_at || userCredit.subscription_next_billing_at || null,
      updated_at: now,
    })
    .eq('user_id', userId)

  if (shouldAddCredits && creditsToAdd > 0) {
    await supabase.from('credit_transactions').insert({
      user_id: userId,
      amount: creditsToAdd,
      type: 'purchase',
      description: `Paddle ${eventType}`,
      provider_reference_id: String(eventId),
    })
  }
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text()
    const signature =
      request.headers.get('paddle-signature') ||
      request.headers.get('x-paddle-signature') ||
      request.headers.get('paddle-signature-256')
    const secret = process.env.PADDLE_WEBHOOK_SECRET || ''

    if (!secret) {
      console.error('PADDLE_WEBHOOK_SECRET is missing')
      return NextResponse.json({ error: 'Webhook secret is not configured' }, { status: 500 })
    }

    if (!verifySignature(secret, rawBody, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    let payload: any
    try {
      payload = JSON.parse(rawBody || '{}')
    } catch {
      return NextResponse.json({ error: 'Invalid event payload format' }, { status: 400 })
    }
    const eventType = payload?.event_type || payload?.type || payload?.event_name
    const eventId = payload?.event_id || payload?.id || payload?.data?.id

    if (!eventType || !eventId) {
      return NextResponse.json({ error: 'Invalid event payload' }, { status: 400 })
    }

    const supabase = createClient()
    const { error: existsError } = await supabase
      .from('paddle_webhook_events')
      .insert({
        event_id: String(eventId),
        event_type: String(eventType),
        provider_payload: payload,
      })

    if (existsError) {
      if ((existsError as { code?: string }).code === '23505') {
        return NextResponse.json({ ok: true })
      }
      console.error('Failed to record webhook event:', existsError)
      return NextResponse.json({ error: 'Webhook event 저장 실패' }, { status: 500 })
    }

    const userId = extractUserId(payload)
    const planCode = extractPlanCode(payload)

    if (!userId) {
      return NextResponse.json({ ok: true })
    }

    if (eventType === 'payment_success' || eventType === 'subscription_created') {
      await applySuccess(supabase, userId, planCode, eventType, String(eventId), payload)
    }

    if (eventType === 'subscription_updated') {
      await supabase
        .from('user_credits')
        .update({
          subscription_status: 'active',
          plan_code: planCode || undefined,
          subscription_expires_at:
            payload?.subscription?.next_bill_date || payload?.subscription?.next_payment_date || null,
          subscription_next_billing_at:
            payload?.subscription?.next_billing_at || payload?.subscription?.next_payment_date || null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
    }

    if (eventType === 'subscription_cancelled' || eventType === 'refund_completed') {
      await supabase
        .from('user_credits')
        .update({
          subscription_status: 'canceled',
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json({ error: 'Webhook 처리 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
