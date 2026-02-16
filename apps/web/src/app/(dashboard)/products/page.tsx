'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Product {
  id: string
  product_name: string
  category: string
  status: string
  created_at: string
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    try {
      const res = await fetch('/api/products')
      const data = await res.json()
      if (res.ok) {
        setProducts(data.products || [])
      }
    } catch (error) {
      console.error('Load products error:', error)
    } finally {
      setLoading(false)
    }
  }

  const deleteProduct = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setProducts(products.filter(p => p.id !== id))
      }
    } catch (error) {
      alert('삭제 중 오류')
    }
  }

  if (loading) {
    return <div className="text-center py-8">로딩 중...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">상품 목록</h1>
        <Link
          href="/products/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + 새 상품
        </Link>
      </div>

      {products.length > 0 ? (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">상품명</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">카테고리</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">상태</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">생성일</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {products.map(product => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/products/${product.id}`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {product.product_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {product.category || '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      product.status === 'published'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {product.status === 'published' ? '완료' : '임시저장'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-sm">
                    {new Date(product.created_at).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => deleteProduct(product.id)}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-lg border p-8 text-center">
          <p className="text-gray-500 mb-4">아직 상품이 없습니다</p>
          <Link
            href="/products/new"
            className="text-blue-600 hover:underline"
          >
            첫 번째 상품 만들기 →
          </Link>
        </div>
      )}
    </div>
  )
}
