import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export type RouteCookieMutation = {
  name: string
  value: string
  options: CookieOptions
}

export function createRouteClient(request: NextRequest, mutations: RouteCookieMutation[]) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          mutations.push({
            name,
            value,
            options,
          })
        },
        remove(name: string, options: CookieOptions) {
          mutations.push({
            name,
            value: '',
            options,
          })
        },
      },
    }
  )
}

export function applyRouteCookies(response: NextResponse, mutations: RouteCookieMutation[]) {
  for (const mutation of mutations) {
    response.cookies.set({
      name: mutation.name,
      value: mutation.value,
      ...mutation.options,
    })
  }
}
