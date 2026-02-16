'use client'

import { useEffect, useState } from 'react'

export default function SettingsPage() {
  const [credits, setCredits] = useState({ balance: 0, lifetimeUsage: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCredits()
  }, [])

  const loadCredits = async () => {
    try {
      const res = await fetch('/api/credits')
      const data = await res.json()
      if (res.ok) {
        setCredits({
          balance: data.balance || 0,
          lifetimeUsage: data.lifetimeUsage || 0,
        })
      }
    } catch (error) {
      console.error('Load credits error:', error)
    } finally {
      setLoading(false)
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

          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              💳 크레딧 구매는 현재 준비 중입니다. 기다려주세요!
            </p>
          </div>
        </div>

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
