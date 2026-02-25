'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

const CATEGORIES = [
  '패션의류', '패션잡화', '화장품/미용', '디지털가전', '가정용품',
  '육아', '식품', '스포츠', '도서', '여행', '기타',
]

type Product = {
  id: string
  product_name: string
  category: string
  brand: string
  price: number | null
  keywords: string[]
  image_urls: string[]
  image_analysis: any
  analysis_status: 'pending' | 'done' | 'failed' | null
  generated_title: string
  generated_description: string
  generated_bullet_specs: string[]
  generated_tags: string[]
  status: string
}

type ImageSuggestion = {
  candidate_product_name?: string
  category_guess?: string
  brand?: string
  price_guess?: number
  features?: string[]
  selling_points?: string[]
  search_tags?: string[]
  description_html?: string
}

export default function ProductPage() {
  const router = useRouter()
  const params = useParams()
  const productId = Array.isArray(params.id) ? params.id[0] : params.id

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [copied, setCopied] = useState('')
  const [product, setProduct] = useState<Product | null>(null)
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [suggestion, setSuggestion] = useState<ImageSuggestion | null>(null)

  // Form fields
  const [productName, setProductName] = useState('')
  const [category, setCategory] = useState('')
  const [brand, setBrand] = useState('')
  const [price, setPrice] = useState('')
  const [keywords, setKeywords] = useState('')

  useEffect(() => {
    loadProduct()
  }, [productId])

  const loadProduct = async () => {
    if (!productId) {
      router.push('/dashboard')
      return
    }
    try {
      const res = await fetch(`/api/products/${productId}`)
      const data = await res.json()

      if (!res.ok) {
        alert(data.error || '상품을 찾을 수 없습니다.')
        router.push('/dashboard')
        return
      }

      const current: Product = data.product
      setProduct(current)
      setProductName(current.product_name || '')
      setCategory(current.category || '')
      setBrand(current.brand || '')
      setPrice(current.price ? String(current.price) : '')
      setKeywords(Array.isArray(current.keywords) ? current.keywords.join(', ') : '')
      setImageUrls(Array.isArray(current.image_urls) ? current.image_urls : [])
      setSuggestion(current.image_analysis || null)
    } catch (error) {
      alert('상품 로드 중 오류')
      router.push('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  const updateProduct = async () => {
    if (!productId) return
    setSaving(true)
    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_name: productName,
          category,
          brand,
          price: price ? parseInt(price) : null,
          keywords: keywords.split(',').map((k) => k.trim()).filter(Boolean),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || '저장 실패')
        return
      }
      setProduct(data.product)
      alert('저장되었습니다.')
    } catch (error) {
      alert('저장 중 오류')
    } finally {
      setSaving(false)
    }
  }

  const uploadFromFiles = async (files: File[]) => {
    if (!productId || !files.length) return
    setUploading(true)
    try {
      const urls: string[] = [...imageUrls]
      for (const file of files) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('productId', productId)
        const res = await fetch('/api/upload/product-image', {
          method: 'POST',
          body: formData,
        })
        const data = await res.json()
        if (!res.ok) {
          alert(data.error || '이미지 업로드 실패')
          return
        }
        for (const url of data.image_urls || []) {
          if (!urls.includes(url)) urls.push(url)
        }
      }

      setImageUrls(urls)
      await loadProduct()
    } catch (error) {
      alert('이미지 업로드 중 오류')
    } finally {
      setUploading(false)
    }
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return
    await uploadFromFiles(Array.from(event.target.files))
    event.target.value = ''
  }

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
    if (!event.dataTransfer.files?.length) return
    await uploadFromFiles(Array.from(event.dataTransfer.files))
  }

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const removeImage = async (target: string) => {
    if (!productId) return
    const next = imageUrls.filter((url) => url !== target)
    setImageUrls(next)
    try {
      const res = await fetch(`/api/products/${productId}/images`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: target }),
      })
      if (!res.ok) {
        await loadProduct()
      }
    } catch (error) {
      await loadProduct()
    }
  }

  const runImageAnalysis = async () => {
    if (!productId) return
    if (!imageUrls.length) {
      alert('이미지를 먼저 업로드해 주세요.')
      return
    }
    setAnalyzing(true)
    try {
      const res = await fetch('/api/analyze/product-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, language: 'ko' }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || '분석 실패')
        return
      }
      setSuggestion(data.suggestion)
      alert('분석이 완료되었습니다.')
    } catch (error) {
      alert('이미지 분석 중 오류')
    } finally {
      setAnalyzing(false)
    }
  }

  const applySuggestion = () => {
    if (!suggestion) return
    if (suggestion.candidate_product_name) setProductName(suggestion.candidate_product_name)
    if (suggestion.category_guess) setCategory(suggestion.category_guess)
    if (suggestion.brand) setBrand(suggestion.brand)
    if (suggestion.price_guess) setPrice(String(suggestion.price_guess))
    setProduct((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        generated_title: suggestion.candidate_product_name || prev.generated_title || '',
        generated_description: suggestion.description_html || prev.generated_description || '',
        generated_bullet_specs: suggestion.selling_points || prev.generated_bullet_specs || [],
        generated_tags: suggestion.search_tags || prev.generated_tags || [],
      }
    })
    if (suggestion.search_tags?.length) {
      setKeywords(prev => {
        const existing = prev ? prev.split(',').map((v) => v.trim()).filter(Boolean) : []
        const merged = Array.from(new Set([...existing, ...suggestion.search_tags!]))
        return merged.join(', ')
      })
    }
  }

  const generateFull = async () => {
    if (!productId || !productName) return
    setGenerating(true)
    try {
      const res = await fetch('/api/generate/full', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          productName,
          category,
          brand,
          price: price ? parseInt(price) : null,
          keywords: keywords.split(',').map((k) => k.trim()).filter(Boolean),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || '생성 실패')
        return
      }

      const updateRes = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          generated_title: data.title,
          generated_description: data.description,
          generated_bullet_specs: data.bulletSpecs,
          generated_tags: data.tags,
        }),
      })
      const updateData = await updateRes.json()
      if (!updateRes.ok) {
        alert(updateData.error || '결과 저장 실패')
        return
      }
      setProduct(updateData.product)
    } catch (error) {
      alert('생성 중 오류')
    } finally {
      setGenerating(false)
    }
  }

  const copyToClipboard = async (value: string, key: string) => {
    await navigator.clipboard.writeText(value)
    setCopied(key)
    setTimeout(() => setCopied(''), 2000)
  }

  if (loading) {
    return <div className="text-center py-8">로딩 중...</div>
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/dashboard" className="text-blue-600 hover:underline">
          ← 대시보드로 돌아가기
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg border space-y-4">
          <h2 className="text-lg font-semibold mb-1">📝 상품 정보</h2>
          <div className="text-sm text-gray-600">상품명은 50자 이내가 권장됩니다.</div>

          <div>
            <label className="block text-sm font-medium mb-1">상품명</label>
            <input
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg"
            />
            <div className="text-xs text-gray-500 mt-1">현재 글자 수: {productName.length}</div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">카테고리</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
              >
                <option value="">선택하세요</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">브랜드</label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">가격</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">키워드</label>
            <input
              type="text"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="쉼표로 구분"
            />
          </div>

          <div className="pt-2">
            <label className="block text-sm font-medium mb-2">이미지 업로드</label>
            <div
              className={`border-2 border-dashed rounded-lg p-4 text-center ${isDragging ? 'border-blue-600 bg-blue-50' : 'border-gray-300'}`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <div className="text-sm text-gray-600 mb-2">
                이미지를 여기에 끌어다 놓거나 클릭해서 선택하세요.
              </div>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                onChange={handleImageUpload}
                className="block mx-auto"
              />
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {uploading ? '업로드 중...' : `${imageUrls.length}개 첨부됨`}
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            {imageUrls.map((url) => (
              <div key={url} className="relative w-24 h-24 border rounded overflow-hidden">
                <img src={url} alt="상품 이미지" className="w-full h-full object-cover" />
                <button
                  className="absolute top-1 right-1 bg-black/70 text-white text-xs px-1.5 py-1 rounded"
                  onClick={() => removeImage(url)}
                  type="button"
                >
                  삭제
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={runImageAnalysis}
              disabled={analyzing || !imageUrls.length}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {analyzing ? '분석 중...' : '이미지 분석'}
            </button>
            <button
              type="button"
              onClick={applySuggestion}
              disabled={!suggestion}
              className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50"
            >
              분석 결과 반영
            </button>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={updateProduct}
              disabled={saving}
              className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50"
            >
              {saving ? '저장 중...' : '저장'}
            </button>
            <button
              onClick={generateFull}
              disabled={generating || !productName}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {generating ? '생성 중...' : '🎨 전체 생성'}
            </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border">
          <h2 className="text-lg font-semibold mb-4">✨ 생성 결과</h2>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-sm font-medium">상품명</label>
                {product?.generated_title && (
                  <button
                    onClick={() => copyToClipboard(product?.generated_title || '', 'title')}
                    className="text-xs text-blue-600"
                  >
                    {copied === 'title' ? '복사됨!' : '복사'}
                  </button>
                )}
              </div>
              <div className="p-3 bg-gray-50 rounded-lg min-h-[60px]">
                {product?.generated_title || suggestion?.candidate_product_name || '생성된 상품명이 여기에 표시됩니다'}
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-sm font-medium">상품 설명</label>
                {product?.generated_description && (
                  <button
                    onClick={() => copyToClipboard(product?.generated_description || '', 'desc')}
                    className="text-xs text-blue-600"
                  >
                    {copied === 'desc' ? '복사됨!' : '복사'}
                  </button>
                )}
              </div>
              <div
                className="p-3 bg-gray-50 rounded-lg min-h-[100px]"
                dangerouslySetInnerHTML={{
                  __html:
                    product?.generated_description || suggestion?.description_html || '생성된 상품 설명이 여기에 표시됩니다',
                }}
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-sm font-medium">핵심 사양</label>
                {product?.generated_bullet_specs && (
                  <button
                    onClick={() => copyToClipboard(product.generated_bullet_specs.join('\n'), 'bullet')}
                    className="text-xs text-blue-600"
                  >
                    {copied === 'bullet' ? '복사됨!' : '복사'}
                  </button>
                )}
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                {product?.generated_bullet_specs?.length
                  ? product.generated_bullet_specs.map((bullet, i) => <div key={i} className="mb-1">• {bullet}</div>)
                  : suggestion?.selling_points?.map((bullet, i) => <div key={i} className="mb-1">• {bullet}</div>) || '생성된 핵심 사양이 여기에 표시됩니다'}
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-sm font-medium">검색 태그</label>
                {product?.generated_tags && (
                  <button
                    onClick={() => copyToClipboard(product.generated_tags.join(', '), 'tags')}
                    className="text-xs text-blue-600"
                  >
                    {copied === 'tags' ? '복사됨!' : '복사'}
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {(product?.generated_tags || suggestion?.search_tags || []).map((tag, i) => (
                  <span key={i} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">
                    {tag}
                  </span>
                ))}
                {!product?.generated_tags?.length && !suggestion?.search_tags?.length
                  ? '생성된 검색 태그가 여기에 표시됩니다'
                  : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
