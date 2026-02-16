import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'
import { CREDIT_COSTS } from '@naver-smartstore/shared/constants'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Generate title
export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const body = await request.json()
    const { productName, category, brand, keywords, tone = 'professional' } = body

    if (!productName) {
      return NextResponse.json({ error: '상품명을 입력해주세요.' }, { status: 400 })
    }

    // Check credits
    const { data: credits } = await supabase
      .from('user_credits')
      .select('balance')
      .eq('user_id', user.id)
      .single()

    const cost = CREDIT_COSTS.title
    if (!credits || credits.balance < cost) {
      return NextResponse.json(
        { error: '크레딧이 부족합니다. 크레딧을 구매해주세요.' },
        { status: 403 }
      )
    }

    // Build prompt
    const keywordText = keywords?.length ? `\n핵심 키워드: ${keywords.join(', ')}` : ''
    const brandText = brand ? `\n브랜드: ${brand}` : ''
    const categoryText = category ? `\n카테고리: ${category}` : ''

    const prompt = `
You are an expert Naver SmartStore product listing copywriter.
Generate compelling, SEO-optimized product titles for Korean e-commerce.

Rules:
1. Include relevant keywords naturally
2. Add emoji strategically (1-2 max)
3. Keep under 50 characters
4. Focus on key selling points
5. Use Korean sentence endings appropriately
6. Include brand name when provided

Output JSON format:
{
  "title": "generated title",
  "alternatives": ["alt1", "alt2", "alt3"]
}

상품명: ${productName}${categoryText}${brandText}${keywordText}
`

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are an expert product listing copywriter. Output ONLY valid JSON.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    })

    const result = JSON.parse(completion.choices[0].message.content || '{}')

    // Deduct credits
    await supabase
      .from('user_credits')
      .update({
        balance: credits.balance - cost,
        lifetime_usage: credits.lifetime_usage + cost,
      })
      .eq('user_id', user.id)

    // Log generation
    await supabase
      .from('generation_logs')
      .insert({
        user_id: user.id,
        generation_type: 'title',
        credits_used: cost,
      })

    return NextResponse.json({
      title: result.title,
      alternatives: result.alternatives,
      creditsUsed: cost,
    })
  } catch (error) {
    console.error('Title generation error:', error)
    return NextResponse.json(
      { error: '제목 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
