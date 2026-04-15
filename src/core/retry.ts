/**
 * Exponential backoff with full jitter and Retry-After header support.
 */

export interface RetryOptions {
  /** Maximum number of attempts (including the first). Default: 3 */
  maxAttempts?: number
  /** Base delay in milliseconds. Default: 250 */
  baseDelayMs?: number
  /** Maximum delay cap in milliseconds. Default: 30_000 */
  maxDelayMs?: number
}

const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504])
// POST is only retried on 429 with a Retry-After header (idempotency concern)
const POST_RETRYABLE_STATUS_CODES = new Set([429])

export interface RetryContext {
  method: string
  attempt: number
  response: Response
  options: Required<RetryOptions>
}

export function shouldRetry(ctx: RetryContext): boolean {
  const { method, attempt, response, options } = ctx
  if (attempt >= options.maxAttempts) return false

  const status = response.status
  if (method === 'GET' || method === 'HEAD') {
    return RETRYABLE_STATUS_CODES.has(status)
  }
  if (method === 'POST' && POST_RETRYABLE_STATUS_CODES.has(status)) {
    return response.headers.has('Retry-After')
  }
  return false
}

export function computeDelay(attempt: number, response: Response, options: Required<RetryOptions>): number {
  const retryAfterHeader = response.headers.get('Retry-After')
  if (retryAfterHeader) {
    const seconds = parseRetryAfterHeader(retryAfterHeader)
    if (seconds !== undefined) return seconds * 1000
  }

  // Exponential backoff with full jitter: random value in [0, min(maxDelay, base * 2^attempt)]
  const exponential = Math.min(options.maxDelayMs, options.baseDelayMs * Math.pow(2, attempt))
  return Math.random() * exponential
}

function parseRetryAfterHeader(header: string): number | undefined {
  const seconds = Number(header)
  if (!isNaN(seconds)) return seconds
  const date = new Date(header)
  if (!isNaN(date.getTime())) {
    return Math.max(0, Math.ceil((date.getTime() - Date.now()) / 1000))
  }
  return undefined
}

export function resolveRetryOptions(opts?: RetryOptions): Required<RetryOptions> {
  return {
    maxAttempts: opts?.maxAttempts ?? 3,
    baseDelayMs: opts?.baseDelayMs ?? 250,
    maxDelayMs: opts?.maxDelayMs ?? 30_000,
  }
}
