import { describe, expect, it } from 'vitest'
import { evaluateGuestQuota, GUEST_QUOTA_LIMIT_PER_DAY } from './guest-quota'

function today() {
  return new Date().toISOString().slice(0, 10)
}

describe('guest quota', () => {
  it('allows first request and decreases remaining quota', () => {
    const result = evaluateGuestQuota(null)
    expect(result.allowed).toBe(true)
    expect(result.state.count).toBe(1)
    expect(result.remaining).toBe(GUEST_QUOTA_LIMIT_PER_DAY - 1)
  })

  it('blocks request when quota already exhausted for current day', () => {
    const result = evaluateGuestQuota({
      day: today(),
      count: GUEST_QUOTA_LIMIT_PER_DAY,
    })

    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
    expect(result.state.count).toBe(GUEST_QUOTA_LIMIT_PER_DAY)
  })

  it('resets quota when a new day starts', () => {
    const result = evaluateGuestQuota({
      day: '1999-01-01',
      count: GUEST_QUOTA_LIMIT_PER_DAY,
    })

    expect(result.allowed).toBe(true)
    expect(result.state.count).toBe(1)
    expect(result.remaining).toBe(GUEST_QUOTA_LIMIT_PER_DAY - 1)
  })
})
