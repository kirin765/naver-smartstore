import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Naver SmartStore AI - 상품 등록 AI',
  description: 'AI로 네이버 스마트스토어 상품명을 자동 생성하세요',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
