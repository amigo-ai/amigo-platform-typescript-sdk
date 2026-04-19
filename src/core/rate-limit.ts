export interface RateLimitInfo {
  limit: number | null
  remaining: number | null
  reset: Date | null
  retryAfter: number | null
}

export function parseRateLimitHeaders(headers: Headers): RateLimitInfo {
  const limit = headers.get('x-ratelimit-limit')
  const remaining = headers.get('x-ratelimit-remaining')
  const reset = headers.get('x-ratelimit-reset')
  const retryAfter = headers.get('retry-after')

  return {
    limit: limit ? parseInt(limit, 10) : null,
    remaining: remaining ? parseInt(remaining, 10) : null,
    reset: reset ? new Date(parseInt(reset, 10) * 1000) : null,
    retryAfter: retryAfter ? parseInt(retryAfter, 10) : null,
  }
}
