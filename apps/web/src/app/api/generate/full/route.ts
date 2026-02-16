import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'
import { CREDIT_COSTS } from '@naver-smartstore/shared/constants'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Generate all content at once
export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const body = await request.json()
    const { productName, category, brand, price, keywords, tone = 'professional' } = body

    if (!productName) {
      return NextResponse.json({ error: '상품명을 입력해주세요.' }, { status: 400 })
    }

    // Check credits
    const { data: credits } = await supabase
      .from('user_credits')
      .select('balance')
      .eq('user_id', user.id)
      .single()

    const cost = CREDIT_COSTS.full
    if (!credits || credits.balance < cost) {
      return NextResponse.json(
        { error: '크레딧이 부족합니다. (전체 생성: 5 크레딧)' },
        { status: 403 }
      )
    }

    // Build prompt
    const keywordText = keywords?.length ? `\n핵심 키워드: ${keywords.join(', ')}` : ''
    const brandText = brand ? `\n브랜드: ${brand}` : ''
    const categoryText = category ? `\n카테고리: ${category}` : ''
    const priceText = price ? `\n가격: ${price}원` : ''

    const prompt = `
You are an expert Naver SmartStore product listing copywriter.

Generate ALL of the following for this product:

1. Product TITLE (keep under 50 chars, include keywords, add 1 emoji)
2. Product DESCRIPTION (HTML format with <p> and <ul><li> tags, persuasive Korean)
3. BULLET SPECS (5 key selling points, each starting with emoji)
4. SEARCH TAGS (5-10 relevant search tags in Korean)

Rules:
- Write in natural Korean
- Include SEO keywords naturally
- Focus on benefits not just features
- Use short paragraphs
- Make it persuasive for Naver SmartStore shoppers

Output JSON format:
{
  "title": "generated title",
  "alternatives": ["alt1", "alt2"],
  "description": "<p>...</p><ul><li>...</li></ul>",
  "bulletSpecs": ["point 1", "point 2", "point 3", "point 4", "point 5"],
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}

상품명: ${productName}${categoryText}${brandText}${priceText}${keywordText}
`

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
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
        generation_type: 'full',
        credits_used: cost,
      })

    return NextResponse.json({
      title: result.title,
      alternatives: result.alternatives,
      description: result.description,
      bulletSpecs: result.bulletSpecs,
      tags: result.tags,
      creditsUsed: cost,
    })
  } catch (error) {
    console.error('Full generation error:', error)
    return NextResponse.json(
      { error: '생성 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
