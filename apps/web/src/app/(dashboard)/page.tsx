import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  // Get stats
  const [{ data: products }, { data: credits }, { data: recentProducts }] = await Promise.all([
    supabase
      .from('products')
      .select('id', { count: 'exact' })
      .eq('user_id', user.id),
    supabase
      .from('user_credits')
      .select('balance, lifetime_usage')
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('products')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const productCount = products?.length || 0

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">환영합니다! 👋</h1>
        <p className="text-gray-600 mt-1">
          오늘도 네이버 스마트스토어 상품을 만들어보세요
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-6 rounded-lg border">
          <div className="text-3xl font-bold text-blue-600">
            {credits?.balance ?? 0}
          </div>
          <div className="text-gray-600 mt-1">사용 가능한 크레딧</div>
        </div>

        <div className="bg-white p-6 rounded-lg border">
          <div className="text-3xl font-bold text-green-600">
            {productCount}
          </div>
          <div className="text-gray-600 mt-1">생성한 상품</div>
        </div>

        <div className="bg-white p-6 rounded-lg border">
          <div className="text-3xl font-bold text-purple-600">
            {credits?.lifetime_usage ?? 0}
          </div>
          <div className="text-gray-600 mt-1">총 사용 횟수</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <Link
          href="/products/new"
          className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          + 새 상품 만들기
        </Link>
      </div>

      {/* Recent Products */}
      <div>
        <h2 className="text-lg font-semibold mb-4">최근 상품</h2>
        
        {recentProducts && recentProducts.length > 0 ? (
          <div className="bg-white rounded-lg border overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">상품명</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">카테고리</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">상태</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">생성일</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {recentProducts.map((product: any) => (
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white rounded-lg border p-8 text-center">
            <p className="text-gray-500 mb-4">아직 생성한 상품이 없습니다</p>
            <Link
              href="/products/new"
              className="text-blue-600 hover:underline"
            >
              첫 번째 상품 만들기 →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
