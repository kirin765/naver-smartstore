import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { MAX_IMAGE_UPLOAD_COUNT } from '@/lib/shared/constants'

type Params = { params: { id: string } }

export async function GET(
  request: Request,
  { params }: Params
) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('products')
      .select('image_urls, analysis_status')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    return NextResponse.json({ image_urls: data.image_urls || [], analysis_status: data.analysis_status || null })
  } catch (error) {
    console.error('Get images error:', error)
    return NextResponse.json({ error: 'Error fetching images' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: Params
) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const image_urls = Array.isArray(body.image_urls)
      ? Array.from(new Set(body.image_urls.filter((url: unknown) => typeof url === 'string')))
      : null

    if (!image_urls) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    if (image_urls.length > MAX_IMAGE_UPLOAD_COUNT) {
      return NextResponse.json(
        { error: `이미지는 최대 ${MAX_IMAGE_UPLOAD_COUNT}개까지만 저장 가능합니다.` },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('products')
      .update({
        image_urls,
        analysis_status: 'pending',
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .eq('user_id', user.id)
      .select('image_urls')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ image_urls: data?.image_urls || [] })
  } catch (error) {
    console.error('Update images error:', error)
    return NextResponse.json({ error: 'Error updating images' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: Params
) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const targetUrl = typeof body.imageUrl === 'string' ? body.imageUrl : ''
    if (!targetUrl) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

  const { data: product, error } = await supabase
        .from('products')
        .select('image_urls')
        .eq('id', params.id)
        .eq('user_id', user.id)
        .single()

    if (error || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const existing: string[] = Array.isArray(product.image_urls) ? product.image_urls : []
    const next = existing.filter(url => url !== targetUrl)
    if (next.length === existing.length) {
      return NextResponse.json({ image_urls: existing })
    }

    const { data: updated, error: saveError } = await supabase
      .from('products')
      .update({
        image_urls: next,
        analysis_status: 'pending',
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .eq('user_id', user.id)
      .select('image_urls')
      .single()

    if (saveError) {
      return NextResponse.json({ error: saveError.message }, { status: 500 })
    }

    return NextResponse.json({ image_urls: updated?.image_urls || [] })
  } catch (error) {
    console.error('Delete image error:', error)
    return NextResponse.json({ error: 'Error deleting image' }, { status: 500 })
  }
}
