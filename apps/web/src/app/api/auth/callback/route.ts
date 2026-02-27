import { NextRequest, NextResponse } from 'next/server'
import { applyRouteCookies, createRouteClient, type RouteCookieMutation } from '@/lib/supabase/route'

function getAppBaseUrl(request: NextRequest) {
  return process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin
}

function buildLoginNoticeUrl(request: NextRequest, notice: string) {
  const baseUrl = getAppBaseUrl(request)
  const url = new URL('/login', baseUrl)
  url.searchParams.set('notice', notice)
  return url
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const nextPath = request.nextUrl.searchParams.get('next')

  if (!code) {
    return NextResponse.redirect(
      buildLoginNoticeUrl(request, '인증 코드가 없습니다. 로그인부터 다시 진행해 주세요.')
    )
  }

  const mutations: RouteCookieMutation[] = []
  const supabase = createRouteClient(request, mutations)
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    const failed = NextResponse.redirect(
      buildLoginNoticeUrl(request, '이메일 인증에 실패했습니다. 로그인 화면에서 다시 시도해 주세요.')
    )
    applyRouteCookies(failed, mutations)
    return failed
  }

  const destination = new URL(
    nextPath && nextPath.startsWith('/') ? nextPath : '/products',
    getAppBaseUrl(request)
  )
  const success = NextResponse.redirect(destination)
  applyRouteCookies(success, mutations)
  return success
}
