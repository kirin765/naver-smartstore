import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'
import { checkGenerationAccess, consumeCredits } from '@/lib/generation-access'

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
    const {
      productName,
      category,
      brand,
      keywords,
      tone = 'professional',
      productId,
    } = body as {
      productName: string
      category?: string
      brand?: string
      keywords?: string[]
      tone?: string
      productId?: string
    }

    if (!productName) {
      return NextResponse.json({ error: '상품명을 입력해주세요.' }, { status: 400 })
    }

    const access = await checkGenerationAccess(supabase, user.id, 'title')
    if (!access.ok) {
      return NextResponse.json(
        { error: access.message, code: access.errorCode },
        { status: access.status }
      )
    }

    let analysisText = ''
    if (productId) {
      const { data: product } = await supabase
        .from('products')
        .select('image_analysis')
        .eq('id', productId)
        .eq('user_id', user.id)
        .single()

      if (product?.image_analysis) {
        analysisText = `\n이미지 분석 기반 제안:\n${JSON.stringify(product.image_analysis)}`
      }
    }
    // Build prompt
    const keywordText = keywords?.length ? `\n핵심 키워드: ${keywords.join(', ')}` : ''
    const brandText = brand ? `\n브랜드: ${brand}` : ''
    const categoryText = category ? `\n카테고리: ${category}` : ''

    const prompt = `
You are an expert Naver SmartStore product listing copywriter.
Generate compelling, SEO-optimized product titles for Korean e-commerce.
Use the following image analysis (if available):
${analysisText}

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

    const parsed = completion.choices[0].message.content || '{}'
    const result = (() => {
      try {
        return JSON.parse(parsed)
      } catch {
        return { title: '', alternatives: [] }
      }
    })()

    const consumeResult = await consumeCredits(supabase, user.id, access.cost, `title generation${productId ? ` (product:${productId})` : ''}`)
    if (!consumeResult.ok) {
      return NextResponse.json({ error: consumeResult.message || '크레딧 차감 실패' }, { status: 409 })
    }

    // Log generation
    await supabase
      .from('generation_logs')
      .insert({
        user_id: user.id,
        generation_type: 'title',
        product_id: productId || null,
        credits_used: access.cost,
        input_tokens: completion.usage?.prompt_tokens ?? null,
        output_tokens: completion.usage?.completion_tokens ?? null,
      })

    const source = analysisText ? 'combined' : 'text'

    return NextResponse.json({
      title: result.title,
      alternatives: result.alternatives,
      creditsUsed: access.cost,
      source,
      confidence: analysisText ? 0.92 : 0.8,
    })
  } catch (error) {
    console.error('Title generation error:', error)
    return NextResponse.json(
      { error: '제목 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
