import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = createClient()
    const { data: packages, error } = await supabase
      .from('credit_packages')
      .select('plan_code,name,credits,price_krw,provider_product_id,provider_price_id,sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      packages: packages || [],
    })
  } catch (error) {
    console.error('Get plans error:', error)
    return NextResponse.json({ error: '플랜 조회 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
