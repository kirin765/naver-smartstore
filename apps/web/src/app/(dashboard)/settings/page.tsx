'use client'

import { useEffect, useState } from 'react'

type PlanPackage = {
  plan_code: string
  name: string
  credits: number
  price_krw: number
}

type CreditState = {
  balance: number
  lifetimeUsage: number
  subscriptionStatus: string
  planCode: string | null
  subscriptionExpiresAt: string | null
}

export default function SettingsPage() {
  const [credits, setCredits] = useState<CreditState>({
    balance: 0,
    lifetimeUsage: 0,
    subscriptionStatus: 'none',
    planCode: null,
    subscriptionExpiresAt: null,
  })
  const [plans, setPlans] = useState<PlanPackage[]>([])
  const [processingPlan, setProcessingPlan] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCredits()
    loadPlans()
  }, [])

  const loadCredits = async () => {
    try {
      const res = await fetch('/api/credits')
      const data = await res.json()
      if (res.ok) {
        setCredits({
          balance: data.balance || 0,
          lifetimeUsage: data.lifetimeUsage || 0,
          subscriptionStatus: data.subscriptionStatus || 'none',
          planCode: data.planCode || null,
          subscriptionExpiresAt: data.subscriptionExpiresAt || null,
        })
      }
    } catch (error) {
      console.error('Load credits error:', error)
    }
  }

  const loadPlans = async () => {
    try {
      const res = await fetch('/api/billing/paddle/plans')
      const data = await res.json()
      if (res.ok) {
        setPlans(data.packages || [])
      }
    } catch (error) {
      console.error('Load plans error:', error)
    } finally {
      setLoading(false)
    }
  }

  const startCheckout = async (planCode: string) => {
    setProcessingPlan(planCode)
    try {
      const res = await fetch('/api/billing/paddle/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planCode }),
      })

      const data = await res.json()
      if (!res.ok) {
        alert(data.error || '결제 준비에 실패했습니다.')
        return
      }

      window.location.href = data.checkoutUrl
    } catch (error) {
      alert('결제 페이지 이동 중 오류가 발생했습니다.')
    } finally {
      setProcessingPlan('')
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">설정</h1>

      <div className="max-w-2xl space-y-6">
        {/* Credit Section */}
        <div className="bg-white p-6 rounded-lg border">
          <h2 className="text-lg font-semibold mb-4">크레딧</h2>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {credits.balance}
              </div>
              <div className="text-sm text-gray-600">사용 가능</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-600">
                {credits.lifetimeUsage}
              </div>
              <div className="text-sm text-gray-600">총 사용</div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border">
          <h2 className="text-lg font-semibold mb-4">구독 상태</h2>
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="mb-2">상태: {credits.subscriptionStatus}</div>
            <div className="text-sm text-gray-600">
              현재 플랜: {credits.planCode || '미적용'}
            </div>
            <div className="text-sm text-gray-600">
              만료일: {credits.subscriptionExpiresAt ? new Date(credits.subscriptionExpiresAt).toLocaleString('ko-KR') : '-'}
            </div>
          </div>
        </div>

        {plans.length > 0 ? (
          <div className="bg-white p-6 rounded-lg border">
            <h2 className="text-lg font-semibold mb-4">구독 플랜</h2>
            <div className="grid gap-3">
              {plans.map(plan => (
                <div key={plan.plan_code} className="p-4 border rounded-lg flex items-center justify-between">
                  <div>
                    <div className="font-medium">{plan.name}</div>
                    <div className="text-sm text-gray-600">
                      월 {plan.credits}크레딧 | {plan.price_krw.toLocaleString('ko-KR')}원
                    </div>
                  </div>
                  <button
                    onClick={() => startCheckout(plan.plan_code)}
                    disabled={processingPlan === plan.plan_code}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {processingPlan === plan.plan_code ? '이동 중...' : '구독/구매'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* Usage Guide */}
        <div className="bg-white p-6 rounded-lg border">
          <h2 className="text-lg font-semibold mb-4">크레딧 사용량</h2>
          
          <div className="space-y-2">
            <div className="flex justify-between py-2 border-b">
              <span>제목 생성</span>
              <span className="font-medium">1 크레딧</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span>전체 생성 (제목+설명+사양+태그)</span>
              <span className="font-medium">5 크레딧</span>
            </div>
            <div className="flex justify-between py-2">
              <span>신규 가입 시 제공</span>
              <span className="font-medium text-green-600">10 크레딧</span>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="bg-white p-6 rounded-lg border">
          <h2 className="text-lg font-semibold mb-4">정보</h2>
          <p className="text-gray-600 text-sm">
            Naver SmartStore AI - 상품 등록 자동화 도구
          </p>
          <p className="text-gray-500 text-sm mt-2">
            © 2026 All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}
