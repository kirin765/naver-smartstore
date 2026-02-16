import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get credit balance
  const { data: credits } = await supabase
    .from('user_credits')
    .select('balance')
    .eq('user_id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="text-xl font-bold">
              🛒 SmartStore AI
            </Link>
            
            <nav className="hidden md:flex gap-4">
              <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">
                대시보드
              </Link>
              <Link href="/products" className="text-gray-600 hover:text-gray-900">
                상품 목록
              </Link>
              <Link href="/settings" className="text-gray-600 hover:text-gray-900">
                설정
              </Link>
            </nav>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
              크레딧: {credits?.balance ?? 0}
            </div>
            
            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                className="text-gray-600 hover:text-gray-900"
              >
                로그아웃
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}
