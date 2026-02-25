import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOpenAIClient } from '@/lib/openai/client'
import { checkGenerationAccess, consumeCredits } from '@/lib/generation-access'

type GenerateBody = {
  productName: string
  category?: string
  brand?: string
  price?: number | null
  keywords?: string[]
  tone?: 'professional' | 'friendly' | 'expert'
  productId?: string
}

function parseSuggestions(raw: string) {
  try {
    const parsed = JSON.parse(raw)
    return {
      title: parsed.title || '',
      alternatives: parsed.alternatives || [],
      description: parsed.description || '',
      bulletSpecs: parsed.bulletSpecs || parsed.bullets || [],
      tags: parsed.tags || [],
      source: parsed.source || 'text',
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : undefined,
    }
  } catch (error) {
    return {
      title: '',
      alternatives: [],
      description: '',
      bulletSpecs: [],
      tags: [],
      source: 'text',
      confidence: 0.0,
    }
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const body = (await request.json()) as GenerateBody
    const {
      productName,
      category,
      brand,
      price,
      keywords,
      tone = 'professional',
      productId,
    } = body

    if (!productName) {
      return NextResponse.json({ error: '상품명을 입력해주세요.' }, { status: 400 })
    }

    const access = await checkGenerationAccess(supabase, user.id, 'full')
    if (!access.ok) {
      return NextResponse.json(
        { error: access.message, code: access.errorCode },
        { status: access.status }
      )
    }

    const keywordText = keywords?.length ? `\n핵심 키워드: ${keywords.join(', ')}` : ''
    const brandText = brand ? `\n브랜드: ${brand}` : ''
    const categoryText = category ? `\n카테고리: ${category}` : ''
    const priceText = price ? `\n가격: ${price}원` : ''

    let analysisText = ''
    let source: 'text' | 'image' | 'combined' = 'text'
    if (productId) {
      const { data: product } = await supabase
        .from('products')
        .select('image_analysis')
        .eq('id', productId)
        .eq('user_id', user.id)
        .single()

      if (product?.image_analysis) {
        source = 'image'
        analysisText = `\n이미지 분석 기반 제안(참조): ${JSON.stringify(product.image_analysis)}`
      }
    }

    const finalSource = analysisText ? 'combined' : source
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
- Tone: ${tone}

Output JSON format:
{
  "title": "generated title",
  "alternatives": ["alt1", "alt2"],
  "description": "<p>...</p><ul><li>...</li></ul>",
  "bulletSpecs": ["point 1", "point 2", "point 3", "point 4", "point 5"],
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}

상품명: ${productName}${categoryText}${brandText}${priceText}${keywordText}
${analysisText}
`

    const openai = getOpenAIClient()
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are an expert product listing copywriter. Output ONLY valid JSON.' },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    })

    const parsed = parseSuggestions(completion.choices[0].message.content || '{}')

    const consumeResult = await consumeCredits(
      supabase,
      user.id,
      access.cost,
      `full generation${productId ? ` (product:${productId})` : ''}`
    )
    if (!consumeResult.ok) {
      return NextResponse.json({ error: consumeResult.message || '크레딧 차감 실패' }, { status: 409 })
    }

    await supabase
      .from('generation_logs')
      .insert({
        user_id: user.id,
        product_id: productId || null,
        generation_type: 'full',
        credits_used: access.cost,
        input_tokens: completion.usage?.prompt_tokens ?? null,
        output_tokens: completion.usage?.completion_tokens ?? null,
      })

    return NextResponse.json({
      title: parsed.title,
      alternatives: parsed.alternatives,
      description: parsed.description,
      bulletSpecs: parsed.bulletSpecs,
      tags: parsed.tags,
      creditsUsed: access.cost,
      source: finalSource,
      confidence: parsed.confidence ?? (analysisText ? 0.9 : 0.8),
    })
  } catch (error) {
    console.error('Full generation error:', error)
    return NextResponse.json(
      { error: '생성 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
