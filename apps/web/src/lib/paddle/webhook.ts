import crypto from 'crypto'

export function parseSignature(headerValue: string | null): string | null {
  if (!headerValue) return null
  if (headerValue.includes(',')) {
    const pairs = headerValue.split(',')
    for (const pair of pairs) {
      const [key, value] = pair.split('=')
      if (key?.trim() === 'hmac_sha256' && value) {
        return value.trim()
      }
    }
  }
  if (headerValue.includes('=')) {
    const parts = headerValue.split('=')
    return (parts[1] || '').trim() || null
  }
  return headerValue.trim() || null
}

export function verifySignature(secret: string, body: string, signatureHeader: string | null) {
  if (!secret || !signatureHeader) return false
  const signature = parseSignature(signatureHeader)
  if (!signature) return false
  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex')
  if (expected.length !== signature.length) return false
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
}

export function extractUserId(payload: Record<string, unknown>): string | null {
  return (
    (payload as any)?.data?.custom_data?.user_id ||
    (payload as any)?.custom_data?.user_id ||
    (payload as any)?.user?.user_id ||
    (payload as any)?.user_id ||
    (payload as any)?.data?.custom_data?.userId ||
    (payload as any)?.custom_data?.userId ||
    (payload as any)?.user?.id ||
    (payload as any)?.customer?.id ||
    (payload as any)?.subscription?.custom_data?.user_id ||
    null
  )
}

export function extractPlanCode(payload: Record<string, unknown>): string | null {
  return (
    (payload as any)?.data?.custom_data?.plan_code ||
    (payload as any)?.custom_data?.plan_code ||
    (payload as any)?.custom_data?.planCode ||
    (payload as any)?.data?.planCode ||
    (payload as any)?.data?.plan_code ||
    (payload as any)?.plan_code ||
    null
  )
}
