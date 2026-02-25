import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'
import { checkGenerationAccess, consumeCredits } from '@/lib/generation-access'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

type Body = {
  productId?: string
  imageUrls?: string[]
  productName?: string
}

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const { productId, imageUrls = [], productName } = (await request.json()) as Body

    if (!productId && !imageUrls.length) {
      return NextResponse.json({ error: '이미지 URL 또는 productId가 필요합니다.' }, { status: 400 })
    }

    const access = await checkGenerationAccess(supabase, user.id, 'full')
    if (!access.ok) {
      return NextResponse.json(
        { error: access.message, code: access.errorCode },
        { status: access.status }
      )
    }

    let urls = imageUrls
    let titleHint = productName || ''
    let analysisText = ''

    if (productId) {
      const { data: product } = await supabase
        .from('products')
        .select('product_name, image_urls, image_analysis')
        .eq('id', productId)
        .eq('user_id', user.id)
        .single()

      if (product) {
        titleHint = titleHint || product.product_name
        if (!urls.length && Array.isArray(product.image_urls)) {
          urls = product.image_urls
        }
        if (product.image_analysis) {
          analysisText = `\n이미지 분석 기반 제안:\n${JSON.stringify(product.image_analysis)}`
        }
      }
    }

    if (!urls.length) {
      return NextResponse.json({ error: '이미지 URL이 없습니다.' }, { status: 400 })
    }

    const imagePayload = urls.map((url) => ({
      type: 'image_url' as const,
      image_url: { url, detail: 'low' },
    }))

    const prompt = `
당신은 네이버 스마트스토어용 상품 등록 카피라이터입니다.
상품명을 바탕으로 다음 JSON 형식으로만 응답하세요.
{
  "title": "generated title",
  "alternatives": ["alt1"],
  "description": "<p>...</p><ul><li>...</li></ul>",
  "bulletSpecs": ["point1", "point2"],
  "tags": ["tag1", "tag2"]
}
`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a Korean e-commerce copywriter. Output only valid JSON.' },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `${prompt}\n상품명: ${titleHint || '이미지 기반 상품'}${analysisText}`,
            },
            ...imagePayload,
          ],
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.4,
    })

    const raw = completion.choices[0].message.content || '{}'
    let data: {
      title?: string
      alternatives?: string[]
      description?: string
      bulletSpecs?: string[]
      tags?: string[]
    } = {}

    try {
      data = JSON.parse(raw)
    } catch {
      data = {}
    }

    const consumeResult = await consumeCredits(
      supabase,
      user.id,
      access.cost,
      `extension generation${productId ? ` (product:${productId})` : ''}`
    )

    if (!consumeResult.ok) {
      return NextResponse.json(
        { error: consumeResult.message || '크레딧 차감 실패' },
        { status: 409 }
      )
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
      title: data.title || '',
      alternatives: data.alternatives || [],
      description: data.description || '',
      bulletSpecs: data.bulletSpecs || [],
      tags: data.tags || [],
      source: analysisText ? 'combined' : 'image',
      confidence: 0.86,
    })
  } catch (error) {
    console.error('Extension generation error:', error)
    return NextResponse.json({ error: '확장 기능 생성 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
