import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Get credit balance
export async function GET() {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const { data: credits, error } = await supabase
      .from('user_credits')
      .select('*, credit_transactions(*)')
      .eq('user_id', user.id)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      balance: credits?.balance || 0,
      lifetimeUsage: credits?.lifetime_usage || 0,
      transactions: credit_transactions || [],
    })
  } catch (error) {
    console.error('Get credits error:', error)
    return NextResponse.json({ error: '크레딧 조회 중 오류' }, { status: 500 })
  }
}
