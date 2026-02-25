import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_IMAGE_UPLOAD_BYTES,
  MAX_IMAGE_UPLOAD_COUNT,
} from '@/lib/shared/constants'

const STORAGE_BUCKET = 'product-images'

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const formData = await request.formData()
    const productId = formData.get('productId')?.toString()
    const file = formData.get('file')
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: '이미지 파일이 필요합니다.' }, { status: 400 })
    }

    const files: File[] = formData.getAll('file').filter((item): item is File => item instanceof File)
    if (files.length === 0 || files.length > MAX_IMAGE_UPLOAD_COUNT) {
      return NextResponse.json(
        { error: `이미지는 최대 ${MAX_IMAGE_UPLOAD_COUNT}개까지 업로드할 수 있습니다.` },
        { status: 400 }
      )
    }

    let existing: string[] = []
    if (productId) {
      const { data: product, error } = await supabase
        .from('products')
        .select('image_urls')
        .eq('id', productId)
        .eq('user_id', user.id)
        .single()

      if (error || !product) {
        return NextResponse.json({ error: '상품을 찾을 수 없습니다.' }, { status: 404 })
      }

      existing = Array.isArray(product.image_urls) ? product.image_urls : []
      if (existing.length + files.length > MAX_IMAGE_UPLOAD_COUNT) {
        return NextResponse.json(
          { error: `이미지는 최대 ${MAX_IMAGE_UPLOAD_COUNT}개까지 등록할 수 있습니다.` },
          { status: 400 }
        )
      }
    }

    const results: string[] = []
    const uploadedPaths: string[] = []

    for (const target of files) {
      if (target.size > MAX_IMAGE_UPLOAD_BYTES) {
        return NextResponse.json(
          { error: `이미지 크기는 최대 ${MAX_IMAGE_UPLOAD_BYTES / 1024 / 1024}MB 입니다.` },
          { status: 400 }
        )
      }

      if (!ALLOWED_IMAGE_MIME_TYPES.includes(target.type)) {
        return NextResponse.json(
          { error: '지원하지 않는 이미지 형식입니다. JPG, PNG, WEBP만 허용됩니다.' },
          { status: 400 }
        )
      }

      const buffer = Buffer.from(await target.arrayBuffer())
      const extension = target.name.split('.').pop()?.toLowerCase() || 'png'
      const path = `${user.id}/${Date.now()}-${randomUUID()}.${extension}`

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(path, buffer, {
          contentType: target.type,
          upsert: false,
        })

      if (uploadError) {
        if (uploadedPaths.length > 0) {
          await supabase.storage.from(STORAGE_BUCKET).remove(uploadedPaths)
        }
        return NextResponse.json(
          { error: '이미지 업로드에 실패했습니다.' },
          { status: 500 }
        )
      }

      uploadedPaths.push(path)

      const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path)
      results.push(data.publicUrl)
    }

    let image_urls = [...results]
    if (productId) {
      const merged = Array.from(new Set([...existing, ...image_urls]))
      const { error: updateError } = await supabase
        .from('products')
        .update({
          image_urls: merged,
          analysis_status: 'pending',
          updated_at: new Date().toISOString(),
        })
        .eq('id', productId)
        .eq('user_id', user.id)

      if (updateError) {
        await supabase.storage.from(STORAGE_BUCKET).remove(uploadedPaths)
        return NextResponse.json({ error: '이미지 저장 중 오류가 발생했습니다.' }, { status: 500 })
      }

      image_urls = merged
    }

    return NextResponse.json({ image_urls: image_urls })
  } catch (error) {
    console.error('Upload image error:', error)
    return NextResponse.json(
      { error: '이미지 업로드 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
