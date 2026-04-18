/**
 * Creates a configured openapi-fetch client with auth, error handling,
 * and retry middleware.
 *
 * Supports custom `fetch` for BFF proxy patterns (e.g., developer-console
 * routing through Next.js API routes).
 */

import createClientImport, { type Middleware } from 'openapi-fetch'
import type { paths } from '../generated/api.js'
import { createAuthMiddleware } from './auth.js'
import { createApiError, NetworkError } from './errors.js'
import { shouldRetry, computeDelay, resolveRetryOptions, type RetryOptions } from './retry.js'

// Handle ESM/CJS interop for openapi-fetch (esbuild __toESM wrapper)
const createClient: typeof createClientImport =
  typeof createClientImport === 'function'
    ? createClientImport
    : (createClientImport as unknown as { default: typeof createClientImport }).default

export type PlatformFetch = ReturnType<typeof createClient<paths>>

export interface ClientConfig {
  apiKey: string
  baseUrl: string
  retry?: RetryOptions
  /** Custom fetch implementation — use for BFF proxy routing or test mocking. */
  fetch?: typeof globalThis.fetch
}

export function createPlatformClient(config: ClientConfig): PlatformFetch {
  const retryOpts = resolveRetryOptions(config.retry)
  const baseFetch = config.fetch ?? globalThis.fetch

  // Wrap fetch with retry logic
  const retryingFetch: typeof globalThis.fetch = async (input, init) => {
    const method = ((init?.method ?? 'GET') as string).toUpperCase()
    const signal = init?.signal
    const isIdempotent = method === 'GET' || method === 'HEAD' || method === 'OPTIONS'

    for (let attempt = 0; attempt < retryOpts.maxAttempts; attempt++) {
      let response: Response | undefined
      let error: unknown

      try {
        response = await baseFetch(input, init)
      } catch (err) {
        error = err
      }

      if (!error && response && response.ok) return response

      const ctx = { method, attempt, response: response!, options: retryOpts }
      const attemptsRemain = attempt + 1 < retryOpts.maxAttempts

      if (error) {
        if (isIdempotent && attemptsRemain) {
          await sleep(computeDelay(attempt, new Response(), retryOpts))
          continue
        }
        throw new NetworkError(
          `Network error: ${error instanceof Error ? error.message : String(error)}`,
          error,
        )
      }

      if (response && attemptsRemain && shouldRetry(ctx)) {
        const delay = computeDelay(attempt, response, retryOpts)
        if (signal?.aborted) return response
        await sleep(delay)
        continue
      }

      return response!
    }

    throw new NetworkError('Retry loop exhausted')
  }

  const client = createClient<paths>({
    baseUrl: config.baseUrl,
    fetch: retryingFetch,
  })

  // Error middleware — convert HTTP errors to typed AmigoError subclasses
  const errorMiddleware: Middleware = {
    async onResponse({ response }) {
      if (!response.ok) {
        throw await createApiError(response)
      }
      return response
    },
  }

  // Auth middleware — attach Bearer token
  const authMiddleware = createAuthMiddleware({ apiKey: config.apiKey })

  // Order: auth first (adds header), then error (converts failures)
  client.use(authMiddleware)
  client.use(errorMiddleware)

  return client
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
