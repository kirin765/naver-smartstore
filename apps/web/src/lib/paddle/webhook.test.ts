import { describe, expect, it } from 'vitest'
import crypto from 'node:crypto'
import { extractPlanCode, extractUserId, parseSignature, verifySignature } from './webhook'

describe('Paddle webhook parsing helpers', () => {
  it('extractUserId supports multiple payload variants', () => {
    expect(
      extractUserId({
        data: { custom_data: { user_id: 'uid-data' } },
      } as any)
    ).toBe('uid-data')
    expect(
      extractUserId({
        custom_data: { userId: 'uid-custom' },
      } as any)
    ).toBe('uid-custom')
    expect(
      extractUserId({
        customer: { id: 'uid-customer' },
      } as any)
    ).toBe('uid-customer')
  })

  it('extractPlanCode supports multiple payload variants', () => {
    expect(
      extractPlanCode({
        custom_data: { plan_code: 'plan-a' },
      } as any)
    ).toBe('plan-a')
    expect(
      extractPlanCode({
        data: { custom_data: { planCode: 'plan-b' } },
      } as any)
    ).toBe('plan-b')
    expect(
      extractPlanCode({
        data: { custom_data: { plan_code: 'plan-c' } },
      } as any)
    ).toBe('plan-c')
  })

  it('parseSignature supports key=value and key=value,key2=value2 forms', () => {
    expect(parseSignature('hmac_sha256=abc123')).toBe('abc123')
    expect(parseSignature('hmac_sha256=abc123,other=zzz')).toBe('abc123')
    expect(parseSignature('other=zzz')).toBe('zzz')
  })

  it('verifySignature validates matching payload body', () => {
    const secret = 'secret'
    const body = '{"event_type":"payment_success"}'
    const signature = crypto.createHmac('sha256', secret).update(body).digest('hex')
    expect(verifySignature(secret, body, signature)).toBe(true)
    expect(verifySignature(secret, body, `hmac_sha256=${signature}`)).toBe(true)
    expect(verifySignature(secret, body, 'invalid')).toBe(false)
  })
})
