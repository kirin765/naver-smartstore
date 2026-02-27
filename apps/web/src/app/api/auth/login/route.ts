import { NextRequest, NextResponse } from 'next/server'
import { applyRouteCookies, createRouteClient, type RouteCookieMutation } from '@/lib/supabase/route'

function mapLoginError(errorMessage?: string) {
  const message = (errorMessage || '').toLowerCase()

  if (message.includes('email') && message.includes('confirm')) {
    return {
      error: '이메일 인증이 필요합니다. 메일함의 인증 링크를 클릭한 뒤 로그인해 주세요.',
      status: 401,
      code: 'EMAIL_NOT_CONFIRMED',
    }
  }

  if (message.includes('invalid login credentials')) {
    return {
      error: '이메일 또는 비밀번호가 올바르지 않습니다.',
      status: 401,
      code: 'INVALID_CREDENTIALS',
    }
  }

  return {
    error: '로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.',
    status: 401,
    code: 'LOGIN_FAILED',
  }
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: '이메일과 비밀번호를 입력해주세요.' },
        { status: 400 }
      )
    }

    const mutations: RouteCookieMutation[] = []
    const supabase = createRouteClient(request, mutations)

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      const mapped = mapLoginError(error.message)
      return NextResponse.json(
        { error: mapped.error, code: mapped.code },
        { status: mapped.status }
      )
    }

    const response = NextResponse.json({
      user: data.user,
      session: data.session,
    })
    applyRouteCookies(response, mutations)
    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: '로그인 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
