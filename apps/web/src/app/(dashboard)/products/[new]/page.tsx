'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const CATEGORIES = [
  '패션의류', '패션잡화', '화장품/미용', '디지털가전', '가정용품',
  '육아', '식품', '스포츠', '도서', '여행', '기타'
]

export default function NewProductPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [productName, setProductName] = useState('')
  const [category, setCategory] = useState('')
  const [brand, setBrand] = useState('')
  const [price, setPrice] = useState('')
  const [keywords, setKeywords] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
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
        alert(data.error || '상품 생성 실패')
        return
      }

      router.push(`/products/${data.product.id}`)
    } catch (error) {
      alert('상품 생성 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/dashboard" className="text-blue-600 hover:underline">
          ← 대시보드로 돌아가기
        </Link>
      </div>

      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">새 상품 만들기</h1>

        <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg border">
          <div>
            <label className="block text-sm font-medium mb-2">
              상품명 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="예: 무선 블루투스 이어폰"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">카테고리</label>
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
              <label className="block text-sm font-medium mb-2">브랜드</label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="브랜드명"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">가격 (원)</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="예: 45000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              키워드 <span className="text-gray-500">(쉼표로 구분)</span>
            </label>
            <input
              type="text"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="예: 블루투스, 무선, 이어폰, 음질"
            />
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? '생성 중...' : '상품 생성하기'}
            </button>
            <Link
              href="/dashboard"
              className="px-6 py-3 border rounded-lg hover:bg-gray-50"
            >
              취소
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
