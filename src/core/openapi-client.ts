/**
 * Creates a configured openapi-fetch client with auth, error handling, and retry middleware.
 */

import createClient, { type Middleware } from 'openapi-fetch'
import type { paths } from '../types/api.js'
import { createAuthMiddleware } from './auth.js'
import { createApiError } from './errors.js'
import { shouldRetry, computeDelay, resolveRetryOptions, type RetryOptions } from './retry.js'

export type AmigoFetch = ReturnType<typeof createClient<paths>>

export interface ClientConfig {
  apiKey: string
  baseUrl: string
  retry?: RetryOptions
}

export function createAmigoClient(config: ClientConfig): AmigoFetch {
  const retryOptions = resolveRetryOptions(config.retry)

  const client = createClient<paths>({ baseUrl: config.baseUrl })

  // Auth middleware — attaches Bearer token and converts 401
  client.use(createAuthMiddleware({ apiKey: config.apiKey }))

  // Error middleware — converts HTTP error responses to typed errors
  const errorMiddleware: Middleware = {
    async onResponse({ response }) {
      if (response.status >= 400) {
        throw await createApiError(response)
      }
      return response
    },
  }
  client.use(errorMiddleware)

  // Retry middleware — exponential backoff with jitter
  const retryMiddleware: Middleware = {
    async onRequest({ request, schemaPath }) {
      // Store method for use in onResponse
      ;(request as Request & { _method?: string })._method =
        request.method.toUpperCase()
      void schemaPath
      return request
    },

    async onResponse({ request, response }) {
      const method = (request as Request & { _method?: string })._method ?? request.method.toUpperCase()
      let attempt = 0
      let currentResponse = response

      while (
        shouldRetry({
          method,
          attempt,
          response: currentResponse,
          options: retryOptions,
        })
      ) {
        const delayMs = computeDelay(attempt, currentResponse, retryOptions)
        await sleep(delayMs)
        attempt++
        try {
          const retried = await fetch(request.clone())
          currentResponse = retried
          if (currentResponse.status < 400) return currentResponse
        } catch {
          // Network error on retry — fall through to throw original
          break
        }
      }

      return currentResponse
    },
  }
  client.use(retryMiddleware)

  return client
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
