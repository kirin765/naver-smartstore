'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

const CATEGORIES = [
  '패션의류', '패션잡화', '화장품/미용', '디지털가전', '가정용품',
  '육아', '식품', '스포츠', '도서', '여행', '기타'
]

interface Product {
  id: string
  product_name: string
  category: string
  brand: string
  price: number
  keywords: string[]
  generated_title: string
  generated_description: string
  generated_bullet_specs: string[]
  generated_tags: string[]
  status: string
}

export default function ProductPage() {
  const router = useRouter()
  const params = useParams()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState('')
  const [product, setProduct] = useState<Product | null>(null)
  const [copied, setCopied] = useState('')

  // Form state
  const [productName, setProductName] = useState('')
  const [category, setCategory] = useState('')
  const [brand, setBrand] = useState('')
  const [price, setPrice] = useState('')
  const [keywords, setKeywords] = useState('')

  useEffect(() => {
    loadProduct()
  }, [params.id])

  const loadProduct = async () => {
    try {
      const res = await fetch(`/api/products/${params.id}`)
      const data = await res.json()

      if (!res.ok) {
        '상품을 찾을 수 없습니다')
        router.push('/dashboard')
        return
      }

      alert(data.error || setProduct(data.product)
      setProductName(data.product.product_name || '')
      setCategory(data.product.category || '')
      setBrand(data.product.brand || '')
      setPrice(data.product.price?.toString() || '')
      setKeywords(data.product.keywords?.join(', ') || '')
    } catch (error) {
      alert('상품 로드 중 오류')
      router.push('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/products/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_name: productName,
          category,
          brand,
          price: price ? parseInt(price) : null,
          keywords: keywords.split(',').map(k => k.trim()).filter(Boolean),
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        alert(data.error || '저장 실패')
        return
      }

      setProduct(data.product)
      alert('저장되었습니다!')
    } catch (error) {
      alert('저장 중 오류')
    } finally {
      setSaving(false)
    }
  }

  const generateContent = async (type: string) => {
    setGenerating(type)
    try {
      const res = await fetch('/api/generate/title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName,
          category,
          brand,
          keywords: keywords.split(',').map(k => k.trim()).filter(Boolean),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        alert(data.error || '생성 실패')
        return
      }

      // Update product with generated content
      const updateRes = await fetch(`/api/products/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          generated_title: data.title,
        }),
      })

      const updateData = await updateRes.json()
      if (updateRes.ok) {
        setProduct(updateData.product)
      }
    } catch (error) {
      alert('생성 중 오류')
    } finally {
      setGenerating('')
    }
  }

  const generateFull = async () => {
    setGenerating('full')
    try {
      const res = await fetch('/api/generate/full', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName,
          category,
          brand,
          price: price ? parseInt(price) : null,
          keywords: keywords.split(',').map(k => k.trim()).filter(Boolean),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        alert(data.error || '생성 실패')
        return
      }

      const updateRes = await fetch(`/api/products/${params.id}`, {
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
      if (updateRes.ok) {
        setProduct(updateData.product)
      }
    } catch (error) {
      alert('생성 중 오류')
    } finally {
      setGenerating('')
    }
  }

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopied(field)
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
        {/* Left: Input Form */}
        <div className="bg-white p-6 rounded-lg border">
          <h2 className="text-lg font-semibold mb-4">📝 상품 정보</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">상품명</label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
              />
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
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
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

            <div className="flex gap-2 pt-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50"
              >
                {saving ? '저장 중...' : '저장'}
              </button>
              <button
                onClick={generateFull}
                disabled={generating || !productName}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {generating ? '생성 중...' : '🎨 전체 생성'}
              </button>
            </div>
          </div>
        </div>

        {/* Right: Generated Output */}
        <div className="bg-white p-6 rounded-lg border">
          <h2 className="text-lg font-semibold mb-4">✨ 생성 결과</h2>

          <div className="space-y-4">
            {/* Title */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-sm font-medium">상품명</label>
                {product?.generated_title && (
                  <button
                    onClick={() => copyToClipboard(product.generated_title, 'title')}
                    className="text-xs text-blue-600"
                  >
                    {copied === 'title' ? '복사됨!' : '복사'}
                  </button>
                )}
              </div>
              <div className="p-3 bg-gray-50 rounded-lg min-h-[60px]">
                {product?.generated_title || '생성된 상품명이 여기에 표시됩니다'}
              </div>
            </div>

            {/* Description */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-sm font-medium">상품 설명</label>
                {product?.generated_description && (
                  <button
                    onClick={() => copyToClipboard(product.generated_description, 'desc')}
                    className="text-xs text-blue-600"
                  >
                    {copied === 'desc' ? '복사됨!' : '복사'}
                  </button>
                )}
              </div>
              <div 
                className="p-3 bg-gray-50 rounded-lg min-h-[100px]"
                dangerouslySetInnerHTML={{ __html: product?.generated_description || '생성된 상품 설명이 여기에 표시됩니다' }}
              />
            </div>

            {/* Bullet Specs */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-sm font-medium">핵심 사양</label>
                {product?.generated_bullet_specs && (
                  <button
                    onClick={() => copyToClipboard(product.generated_bullet_specs?.join('\n') || '', 'bullet')}
                    className="text-xs text-blue-600"
                  >
                    {copied === 'bullet' ? '복사됨!' : '복사'}
                  </button>
                )}
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                {product?.generated_bullet_specs?.map((bullet, i) => (
                  <div key={i} className="mb-1">• {bullet}</div>
                )) || '생성된 핵심 사양이 여기에 표시됩니다'}
              </div>
            </div>

            {/* Tags */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-sm font-medium">검색 태그</label>
                {product?.generated_tags && (
                  <button
                    onClick={() => copyToClipboard(product.generated_tags?.join(', ') || '', 'tags')}
                    className="text-xs text-blue-600"
                  >
                    {copied === 'tags' ? '복사됨!' : '복사'}
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {product?.generated_tags?.map((tag, i) => (
                  <span key={i} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">
                    {tag}
                  </span>
                )) || '생성된 태그가 여기에 표시됩니다'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
