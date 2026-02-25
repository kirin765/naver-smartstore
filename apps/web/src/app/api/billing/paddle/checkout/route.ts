import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { createClient } from '@/lib/supabase/server'

type Body = {
  planCode: string
}

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const { planCode } = (await request.json()) as Body
    if (!planCode) {
      return NextResponse.json({ error: 'planCode가 필요합니다.' }, { status: 400 })
    }

    const { data: pkg, error } = await supabase
      .from('credit_packages')
      .select('name, credits, price_krw, provider_price_id')
      .eq('plan_code', planCode)
      .eq('is_active', true)
      .single()

    if (error || !pkg) {
      return NextResponse.json({ error: '요청한 플랜을 찾을 수 없습니다.' }, { status: 404 })
    }

    const transactionId = `tx-${randomUUID()}`
    const baseUrl = process.env.PADDLE_CHECKOUT_URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''

    if (process.env.PADDLE_API_TOKEN && process.env.PADDLE_VENDOR_ID) {
      // Optional full integration point:
      // Integrate Paddle API request here if API credentials are provided.
      // Keep fallback for stable MVP behavior when Paddle checkout URL is configured.
    }

    if (!baseUrl) {
      return NextResponse.json(
        {
          error:
            'Paddle checkout URL이 미설정입니다. 관리자 환경변수(PADDLE_CHECKOUT_URL)를 등록하세요.',
        },
        { status: 500 }
      )
    }

    const checkoutUrl = `${baseUrl}?planCode=${encodeURIComponent(
      planCode
    )}&userId=${encodeURIComponent(user.id)}&tx=${encodeURIComponent(transactionId)}`

    return NextResponse.json({
      checkoutUrl,
      transactionId,
      package: {
        name: pkg.name,
        credits: pkg.credits,
        price_krw: pkg.price_krw,
      },
      successUrl: appUrl ? `${appUrl}/settings?pay=success` : undefined,
      cancelUrl: appUrl ? `${appUrl}/settings?pay=cancel` : undefined,
    })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json({ error: 'Checkout 생성 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
