import { CREDIT_COSTS } from '@naver-smartstore/shared/constants'
import { createClient } from './supabase/server'

export type GenerationAction = 'title' | 'description' | 'bullet' | 'tags' | 'full'

type AccessOutcome =
  | {
      ok: true
      cost: number
      balance: number
      subscriptionActive: boolean
      deductionReason: 'subscription' | 'credits'
      errorCode?: undefined
      message?: undefined
    }
  | {
      ok: false
      errorCode: 'UNAUTHORIZED' | 'INSUFFICIENT_PLAN' | 'INSUFFICIENT_CREDITS' | 'INVALID_ACTION'
      message: string
      status: number
      cost?: undefined
      balance?: undefined
      subscriptionActive?: undefined
      deductionReason?: undefined
    }

type UserCreditRecord = {
  balance: number
  lifetime_usage: number
  subscription_status?: string | null
  subscription_expires_at?: string | null
}

export async function checkGenerationAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  action: GenerationAction
): Promise<AccessOutcome> {
  if (!Object.keys(CREDIT_COSTS).includes(action)) {
    return {
      ok: false,
      errorCode: 'INVALID_ACTION',
      message: '지원되지 않는 생성 타입입니다.',
      status: 400,
    }
  }

  const { data: credits, error } = await supabase
    .from('user_credits')
    .select('balance, lifetime_usage, subscription_status, subscription_expires_at')
    .eq('user_id', userId)
    .single()

  if (error || !credits) {
    return {
      ok: false,
      errorCode: 'UNAUTHORIZED',
      message: '사용자 크레딧 정보를 확인할 수 없습니다.',
      status: 401,
    }
  }

  const creditRecord = credits as UserCreditRecord
  const now = new Date().toISOString()
  const isSubscriptionActive =
    creditRecord.subscription_status === 'active' &&
    (!creditRecord.subscription_expires_at || creditRecord.subscription_expires_at > now)

  if (creditRecord.subscription_status === 'past_due' || creditRecord.subscription_status === 'canceled' || creditRecord.subscription_status === 'expired') {
    return {
      ok: false,
      errorCode: 'INSUFFICIENT_PLAN',
      message: '구독이 만료되었거나 정지 상태입니다. 크레딧 결제가 필요합니다.',
      status: 402,
    }
  }

  const cost = CREDIT_COSTS[action as keyof typeof CREDIT_COSTS] ?? CREDIT_COSTS.full
  if (isSubscriptionActive) {
    return {
      ok: true,
      cost: 0,
      balance: creditRecord.balance || 0,
      subscriptionActive: true,
      deductionReason: 'subscription',
    }
  }

  if ((creditRecord.balance ?? 0) < cost) {
    return {
      ok: false,
      errorCode: 'INSUFFICIENT_CREDITS',
      message: '크레딧이 부족합니다. 크레딧을 충전해 주세요.',
      status: 402,
    }
  }

  return {
    ok: true,
    cost,
    balance: creditRecord.balance,
    subscriptionActive: false,
    deductionReason: 'credits',
  }
}

export async function consumeCredits(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  amount: number,
  description: string
) {
  if (amount <= 0) {
    return { ok: true }
  }

  const { data: credits } = await supabase
    .from('user_credits')
    .select('balance, lifetime_usage')
    .eq('user_id', userId)
    .single()

  if (!credits) {
    return { ok: false, message: '크레딧 계정을 찾을 수 없습니다.' }
  }

  const nextBalance = (credits.balance ?? 0) - amount
  const nextLifetimeUsage = (credits.lifetime_usage ?? 0) + amount

  if (nextBalance < 0) {
    return { ok: false, message: '크레딧이 부족합니다.' }
  }

  const { data: debited, error: updateError } = await supabase
    .from('user_credits')
    .update({
      balance: nextBalance,
      lifetime_usage: nextLifetimeUsage,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .gte('balance', amount)
    .select('balance, lifetime_usage')

  if (updateError || !debited || debited.length === 0) {
    return { ok: false, message: '크레딧 차감에 실패했습니다. 다시 시도해 주세요.' }
  }

  await supabase.from('credit_transactions').insert({
    user_id: userId,
    amount: -amount,
    type: 'usage',
    description,
  })

  return { ok: true }
}
