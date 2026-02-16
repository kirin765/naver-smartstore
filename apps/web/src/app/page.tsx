export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="text-center max-w-2xl">
        <h1 className="text-4xl font-bold mb-4">
          🛒 Naver SmartStore AI
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          AI로 네이버 스마트스토어 상품명을 자동 생성하세요
        </p>
        <div className="flex gap-4 justify-center">
          <a
            href="/login"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            로그인
          </a>
          <a
            href="/signup"
            className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
          >
            회원가입
          </a>
        </div>
      </div>
    </main>
  )
}
