import { NextRequest, NextResponse } from 'next/server'

export const GUEST_QUOTA_COOKIE = 'guest_demo_usage'
export const GUEST_QUOTA_LIMIT_PER_DAY = 3

export type GuestQuotaState = {
  day: string
  count: number
}

export type GuestQuotaResult = {
  allowed: boolean
  remaining: number
  state: GuestQuotaState
}

function currentDayKey() {
  return new Date().toISOString().slice(0, 10)
}

function parseState(raw?: string): GuestQuotaState | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<GuestQuotaState>
    if (typeof parsed.day !== 'string' || typeof parsed.count !== 'number') {
      return null
    }
    return {
      day: parsed.day,
      count: Math.max(0, Math.floor(parsed.count)),
    }
  } catch {
    return null
  }
}

export function evaluateGuestQuota(state: GuestQuotaState | null, limit = GUEST_QUOTA_LIMIT_PER_DAY): GuestQuotaResult {
  const day = currentDayKey()
  const currentCount = state?.day === day ? state.count : 0

  if (currentCount >= limit) {
    return {
      allowed: false,
      remaining: 0,
      state: { day, count: currentCount },
    }
  }

  const nextCount = currentCount + 1
  return {
    allowed: true,
    remaining: Math.max(0, limit - nextCount),
    state: { day, count: nextCount },
  }
}

export function evaluateGuestQuotaFromRequest(request: NextRequest, limit = GUEST_QUOTA_LIMIT_PER_DAY) {
  const parsed = parseState(request.cookies.get(GUEST_QUOTA_COOKIE)?.value)
  return evaluateGuestQuota(parsed, limit)
}

export function applyGuestQuotaCookie(response: NextResponse, state: GuestQuotaState) {
  response.cookies.set({
    name: GUEST_QUOTA_COOKIE,
    value: JSON.stringify(state),
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 2,
  })
}
