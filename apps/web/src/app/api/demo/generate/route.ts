import { Buffer } from 'node:buffer'
import { NextRequest, NextResponse } from 'next/server'
import { getOpenAIClient } from '@/lib/openai/client'
import { ALLOWED_IMAGE_MIME_TYPES, MAX_IMAGE_UPLOAD_BYTES } from '@/lib/shared/constants'
import { applyGuestQuotaCookie, evaluateGuestQuotaFromRequest } from '@/lib/guest-quota'

type DemoGenerateInput = {
  productName: string
  category?: string
  brand?: string
  keywords: string[]
  imageDataUrl?: string
}

class DemoInputError extends Error {
  status: number

  constructor(message: string, status = 400) {
    super(message)
    this.status = status
  }
}

function normalizeKeywords(raw?: string | string[]) {
  if (Array.isArray(raw)) {
    return raw.map((item) => item.trim()).filter(Boolean)
  }
  if (!raw) return []
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

async function parseInput(request: NextRequest): Promise<DemoGenerateInput> {
  const contentType = request.headers.get('content-type') || ''

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData()
    const file = formData.get('image')
    let imageDataUrl: string | undefined

    if (file instanceof File) {
      if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
        throw new DemoInputError(`이미지 크기는 최대 ${MAX_IMAGE_UPLOAD_BYTES / 1024 / 1024}MB 입니다.`)
      }
      if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.type)) {
        throw new DemoInputError('지원하지 않는 이미지 형식입니다. JPG, PNG, WEBP만 허용됩니다.')
      }

      const bytes = Buffer.from(await file.arrayBuffer())
      imageDataUrl = `data:${file.type};base64,${bytes.toString('base64')}`
    }

    return {
      productName: String(formData.get('productName') || '').trim(),
      category: String(formData.get('category') || '').trim() || undefined,
      brand: String(formData.get('brand') || '').trim() || undefined,
      keywords: normalizeKeywords(String(formData.get('keywords') || '')),
      imageDataUrl,
    }
  }

  const body = (await request.json()) as {
    productName?: string
    category?: string
    brand?: string
    keywords?: string[] | string
  }

  return {
    productName: (body.productName || '').trim(),
    category: body.category?.trim() || undefined,
    brand: body.brand?.trim() || undefined,
    keywords: normalizeKeywords(body.keywords),
  }
}

export async function POST(request: NextRequest) {
  const quota = evaluateGuestQuotaFromRequest(request)
  if (!quota.allowed) {
    const limited = NextResponse.json(
      {
        error: '체험 횟수를 모두 사용했습니다. 내일 다시 시도하거나 로그인해서 계속 이용해 주세요.',
        code: 'GUEST_QUOTA_EXCEEDED',
        remainingQuota: 0,
      },
      { status: 429 }
    )
    applyGuestQuotaCookie(limited, quota.state)
    return limited
  }

  try {
    const input = await parseInput(request)
    if (!input.productName && !input.imageDataUrl) {
      const invalid = NextResponse.json(
        { error: '상품명 또는 이미지를 입력해 주세요.' },
        { status: 400 }
      )
      applyGuestQuotaCookie(invalid, quota.state)
      return invalid
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey || apiKey === 'placeholder-openai-api-key') {
      const unavailable = NextResponse.json(
        { error: '체험 기능이 아직 준비되지 않았습니다. 잠시 후 다시 시도해 주세요.' },
        { status: 503 }
      )
      applyGuestQuotaCookie(unavailable, quota.state)
      return unavailable
    }

    const keywordText = input.keywords.length ? `\n핵심 키워드: ${input.keywords.join(', ')}` : ''
    const categoryText = input.category ? `\n카테고리: ${input.category}` : ''
    const brandText = input.brand ? `\n브랜드: ${input.brand}` : ''

    const prompt = `
당신은 네이버 스마트스토어 상품 등록 카피 전문가입니다.
아래 입력을 기반으로 반드시 JSON만 반환하세요.
{
  "title": "상품명",
  "alternatives": ["대체 제목1", "대체 제목2"],
  "description": "<p>설명</p><ul><li>포인트</li></ul>",
  "bulletSpecs": ["핵심포인트 1", "핵심포인트 2", "핵심포인트 3", "핵심포인트 4", "핵심포인트 5"],
  "tags": ["태그1", "태그2", "태그3", "태그4", "태그5"]
}

조건:
- 제목은 50자 이내
- 설명은 한국어, 구매 유도형
- 태그는 검색어 위주

상품명: ${input.productName || '이미지 기반 추천 상품'}
${categoryText}${brandText}${keywordText}
`

    const content = input.imageDataUrl
      ? [
          { type: 'text' as const, text: prompt },
          { type: 'image_url' as const, image_url: { url: input.imageDataUrl, detail: 'low' as const } },
        ]
      : prompt

    const openai = getOpenAIClient(apiKey)
    const completion = await openai.chat.completions.create({
      model: input.imageDataUrl ? 'gpt-4o' : 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a Korean ecommerce copywriter. Output only valid JSON.' },
        { role: 'user', content },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.5,
    })

    let parsed: {
      title?: string
      alternatives?: string[]
      description?: string
      bulletSpecs?: string[]
      tags?: string[]
    } = {}

    try {
      parsed = JSON.parse(completion.choices[0].message.content || '{}')
    } catch {
      parsed = {}
    }

    const response = NextResponse.json({
      title: parsed.title || '',
      alternatives: Array.isArray(parsed.alternatives) ? parsed.alternatives : [],
      description: parsed.description || '',
      bulletSpecs: Array.isArray(parsed.bulletSpecs) ? parsed.bulletSpecs : [],
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
      source: input.imageDataUrl ? 'combined' : 'text',
      remainingQuota: quota.remaining,
    })
    applyGuestQuotaCookie(response, quota.state)
    return response
  } catch (error) {
    const message = error instanceof Error ? error.message : '체험 생성 중 오류가 발생했습니다.'
    const failed = NextResponse.json(
      { error: message },
      { status: error instanceof DemoInputError ? error.status : 500 }
    )
    applyGuestQuotaCookie(failed, quota.state)
    return failed
  }
}
