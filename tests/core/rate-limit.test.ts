import { describe, it, expect } from 'vitest'
import { parseRateLimitHeaders } from '../../src/core/rate-limit.js'

describe('parseRateLimitHeaders', () => {
  it('parses all headers', () => {
    const headers = new Headers({
      'x-ratelimit-limit': '100',
      'x-ratelimit-remaining': '42',
      'x-ratelimit-reset': '1700000000',
      'retry-after': '30',
    })
    const info = parseRateLimitHeaders(headers)
    expect(info.limit).toBe(100)
    expect(info.remaining).toBe(42)
    expect(info.reset).toEqual(new Date(1700000000 * 1000))
    expect(info.retryAfter).toBe(30)
  })

  it('returns null for missing headers', () => {
    const info = parseRateLimitHeaders(new Headers())
    expect(info.limit).toBeNull()
    expect(info.remaining).toBeNull()
    expect(info.reset).toBeNull()
    expect(info.retryAfter).toBeNull()
  })
})
