'use client'

import { useState } from 'react'
import Link from 'next/link'

type DemoResult = {
  title: string
  alternatives: string[]
  description: string
  bulletSpecs: string[]
  tags: string[]
  source: 'text' | 'combined'
  remainingQuota: number
}

export default function HomePage() {
  const [productName, setProductName] = useState('')
  const [category, setCategory] = useState('')
  const [brand, setBrand] = useState('')
  const [keywords, setKeywords] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<DemoResult | null>(null)

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const payload = imageFile
        ? (() => {
            const formData = new FormData()
            formData.append('productName', productName)
            formData.append('category', category)
            formData.append('brand', brand)
            formData.append('keywords', keywords)
            formData.append('image', imageFile)
            return { body: formData }
          })()
        : {
            body: JSON.stringify({
              productName,
              category,
              brand,
              keywords,
            }),
            headers: { 'Content-Type': 'application/json' },
          }

      const res = await fetch('/api/demo/generate', {
        method: 'POST',
        ...payload,
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || '체험 생성에 실패했습니다.')
      }

      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '체험 생성에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-6">
        <section className="bg-white border rounded-xl p-6">
          <h1 className="text-3xl font-bold mb-3">Naver SmartStore AI</h1>
          <p className="text-gray-600 mb-6">
            로그인 없이 주요 생성 기능을 체험할 수 있습니다. 저장과 결제, 상품 관리는 로그인 후 이용 가능합니다.
          </p>

          <form onSubmit={handleGenerate} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm">{error}</div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">상품명</label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="예: 무선 블루투스 이어폰"
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">카테고리</label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg"
                />
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
              <label className="block text-sm font-medium mb-1">키워드</label>
              <input
                type="text"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="쉼표(,)로 구분"
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">상품 이미지(선택)</label>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                className="w-full"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? '생성 중...' : '무료 체험 생성'}
            </button>
          </form>

          <div className="mt-6 flex gap-3">
            <Link href="/login" className="px-5 py-2.5 rounded-lg bg-gray-900 text-white">
              로그인
            </Link>
            <Link href="/signup" className="px-5 py-2.5 rounded-lg border">
              회원가입
            </Link>
          </div>
        </section>

        <section className="bg-white border rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4">체험 결과</h2>
          {result ? (
            <div className="space-y-4">
              <div className="text-sm text-gray-500">
                남은 무료 체험 횟수: <span className="font-semibold text-gray-700">{result.remainingQuota}</span>
              </div>
              <div>
                <div className="text-sm font-medium mb-1">제목</div>
                <div className="p-3 bg-gray-50 rounded-lg">{result.title || '-'}</div>
              </div>
              <div>
                <div className="text-sm font-medium mb-1">설명</div>
                <div className="p-3 bg-gray-50 rounded-lg" dangerouslySetInnerHTML={{ __html: result.description || '-' }} />
              </div>
              <div>
                <div className="text-sm font-medium mb-1">핵심 포인트</div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  {result.bulletSpecs.length ? result.bulletSpecs.map((item, idx) => <div key={idx}>• {item}</div>) : '-'}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium mb-1">태그</div>
                <div className="flex flex-wrap gap-2">
                  {result.tags.length ? result.tags.map((tag, idx) => (
                    <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">
                      {tag}
                    </span>
                  )) : '-'}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-gray-500 text-sm">
              왼쪽 폼에서 상품 정보를 입력하고 체험 생성을 실행하면 결과가 표시됩니다.
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
