import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { IMAGE_ANALYSIS_PROMPT_VERSION } from '@naver-smartstore/shared/constants'
import { MAX_IMAGE_UPLOAD_COUNT } from '@naver-smartstore/shared/constants'
import { getOpenAIClient } from '@/lib/openai/client'

type AnalyzeBody = {
  productId?: string
  imageUrls?: string[]
  language?: 'ko' | 'en'
  options?: {
    preferText?: boolean
    tone?: 'professional' | 'friendly' | 'expert'
  }
}

export async function POST(request: Request) {
  let targetProductId: string | null = null
  let targetUserId: string | null = null
  let supabaseClient: ReturnType<typeof createClient> | null = null

  try {
    const supabase = createClient()
    supabaseClient = supabase
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }
    targetUserId = user.id

    const { productId, imageUrls = [], language = 'ko', options = {} } = (await request.json()) as AnalyzeBody
    targetProductId = productId ?? null

    let urls: string[] = imageUrls
    if (productId) {
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('image_urls')
        .eq('id', productId)
        .eq('user_id', user.id)
        .single()

      if (productError || !product) {
        return NextResponse.json({ error: '상품을 찾을 수 없습니다.' }, { status: 404 })
      }

      if (!urls.length) {
        urls = Array.isArray(product.image_urls) ? product.image_urls : []
      }
    }

    if (urls.length > MAX_IMAGE_UPLOAD_COUNT) {
      return NextResponse.json({ error: `이미지 분석은 최대 ${MAX_IMAGE_UPLOAD_COUNT}개까지 가능합니다.` }, { status: 400 })
    }

    if (!urls.length) {
      return NextResponse.json({ error: '분석할 이미지 URL이 없습니다.' }, { status: 400 })
    }

    const imageBlocks = urls.map(url => ({
      type: 'image_url' as const,
      image_url: { url, detail: 'low' },
    }))

    const prompt = language === 'ko'
      ? `이미지로부터 네이버 스마트스토어에 등록할 수 있는 상품 정보를 추출해 주세요.`
      : `Extract product registration data from images.`

    const systemPrompt = `
당신은 네이버 스마트스토어 상품 등록 전문 분석가입니다.
다음 JSON 형식으로만 응답하세요:
{
  "candidate_product_name": "핵심 상품명",
  "category_guess": "카테고리 추정",
  "brand": "브랜드명",
  "materials": ["재질", "재료"],
  "features": ["외형/기능/사이즈/중요 규격"],
  "selling_points": ["핵심 판매 포인트"],
  "search_tags": ["태그1", "태그2"],
  "description_html": "<p>상품 설명 초안</p>",
  "price_guess": 0
}
`

    const openai = getOpenAIClient()
    const completion = await openai.chat.completions.create({
      model: options.preferText ? 'gpt-4o-mini' : 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [{ type: 'text', text: prompt }, ...imageBlocks],
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    })

    let parsed: Record<string, unknown> = {}
    try {
      parsed = JSON.parse(completion.choices[0].message.content || '{}')
    } catch (error) {
      parsed = {}
    }
    const suggestion = {
      candidate_product_name: parsed.candidate_product_name || '',
      category_guess: parsed.category_guess || '',
      brand: parsed.brand || '',
      materials: Array.isArray(parsed.materials) ? parsed.materials : [],
      features: Array.isArray(parsed.features) ? parsed.features : [],
      selling_points: Array.isArray(parsed.selling_points) ? parsed.selling_points : [],
      search_tags: Array.isArray(parsed.search_tags) ? parsed.search_tags : [],
      description_html: parsed.description_html || '',
      price_guess:
        typeof parsed.price_guess === 'number'
          ? parsed.price_guess
          : Number(parsed.price_guess || 0) || 0,
      confidence: 0.87,
      source: 'image',
      language,
    }

    const success = async (analysis = suggestion) => {
      if (!productId) {
        return
      }

      await supabase
        .from('products')
        .update({
          image_analysis: analysis,
          analysis_status: 'done',
          analysis_prompt_version: IMAGE_ANALYSIS_PROMPT_VERSION,
          updated_at: new Date().toISOString(),
        })
        .eq('id', productId)
        .eq('user_id', user.id)
    }

    if (productId) {
      await success()
    }

    await supabase
      .from('generation_logs')
      .insert({
        user_id: user.id,
        product_id: productId || null,
        generation_type: 'analysis',
        credits_used: 0,
        input_tokens: completion.usage?.prompt_tokens ?? null,
        output_tokens: completion.usage?.completion_tokens ?? null,
      })

    return NextResponse.json({
      analysisId: productId || 'direct-upload',
      status: 'done',
      suggestion,
    })
  } catch (error) {
    console.error('Image analysis error:', error)

    if (targetProductId && targetUserId && supabaseClient) {
      await supabaseClient
        .from('products')
        .update({
          analysis_status: 'failed',
          image_analysis: {
            error: 'analysis_failed',
            message: error instanceof Error ? error.message : 'analysis error',
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', targetProductId)
        .eq('user_id', targetUserId)
    }

    return NextResponse.json(
      { error: '이미지 분석 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
