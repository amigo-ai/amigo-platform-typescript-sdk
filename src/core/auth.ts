/**
 * Auth middleware for the Amigo Platform SDK.
 *
 * The platform-api accepts Bearer tokens in two forms:
 *   1. RS256 JWT issued by the Identity service
 *   2. Legacy API keys (created via POST /v1/{workspace_id}/api-keys)
 *
 * This SDK accepts an API key string and attaches it directly as
 * `Authorization: Bearer {apiKey}`. No token exchange is required.
 */

import type { Middleware } from 'openapi-fetch'
import { AuthenticationError } from './errors.js'

export interface AuthConfig {
  apiKey: string
}

/**
 * Creates openapi-fetch middleware that attaches the Bearer token
 * to every outgoing request and converts 401 responses to AuthenticationError.
 */
export function createAuthMiddleware(config: AuthConfig): Middleware {
  return {
    async onRequest({ request }) {
      request.headers.set('Authorization', `Bearer ${config.apiKey}`)
      return request
    },

    async onResponse({ response }) {
      if (response.status === 401) {
        throw new AuthenticationError('Invalid or expired API key. Check your credentials.', {
          statusCode: 401,
        })
      }
      return response
    },
  }
}
