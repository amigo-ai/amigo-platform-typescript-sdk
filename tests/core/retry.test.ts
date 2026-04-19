import { afterEach, describe, expect, it, vi } from 'vitest'
import { computeDelay, resolveRetryOptions } from '../../src/core/retry.js'

const originalCryptoDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto')
type GlobalWithCrypto = typeof globalThis & {
  crypto?: {
    getRandomValues<T extends Uint32Array>(array: T): T
  }
}

describe('retry utilities', () => {
  afterEach(() => {
    restoreCrypto()
    vi.useRealTimers()
  })

  it('uses Web Crypto when available for jitter', () => {
    const getRandomValues = vi.fn((value: Uint32Array) => {
      value[0] = 0x8000_0000
      return value
    })

    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: { getRandomValues },
    })

    const delay = computeDelay(1, new Response(), resolveRetryOptions())

    expect(getRandomValues).toHaveBeenCalledOnce()
    expect(delay).toBe(250)
  })

  it('falls back to a bounded deterministic spread when Web Crypto is unavailable', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-19T12:00:00Z'))

    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: undefined,
    })

    const delay = computeDelay(2, new Response(), resolveRetryOptions())

    expect(delay).toBeGreaterThanOrEqual(0)
    expect(delay).toBeLessThan(1_000)
  })

  it('prefers Retry-After headers over jitter', () => {
    const response = new Response(null, {
      headers: { 'Retry-After': '7' },
    })

    const delay = computeDelay(0, response, resolveRetryOptions())
    expect(delay).toBe(7_000)
  })
})

function restoreCrypto() {
  if (originalCryptoDescriptor) {
    Object.defineProperty(globalThis, 'crypto', originalCryptoDescriptor)
  } else {
    Object.defineProperty(globalThis as GlobalWithCrypto, 'crypto', {
      configurable: true,
      value: undefined,
    })
  }
}
