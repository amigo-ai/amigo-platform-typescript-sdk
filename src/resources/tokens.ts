import type { Middleware } from 'openapi-fetch'
import type { IdentityTokenResponse } from '../core/device-code.js'
import { WorkspaceScopedResource, extractData } from './base.js'

export interface ApiKeyTokenExchangeRequest {
  /** API key to exchange for an identity-issued JWT. */
  apiKey: string
  /** Optional space-delimited OAuth scope restriction. */
  scope?: string
}

export type ApiKeyTokenExchangeResponse = IdentityTokenResponse

const omitAuthorizationHeader: Middleware = {
  onRequest({ request }) {
    request.headers.delete('Authorization')
    return request
  },
}

/**
 * Identity token operations exposed through the platform API base URL.
 *
 * The identity service's token endpoint is mounted at `POST /token` on the
 * same base URL used for the platform API.
 */
export class TokensResource extends WorkspaceScopedResource {
  /** Exchange an API key for an identity-issued JWT access token. */
  async exchangeApiKey(request: ApiKeyTokenExchangeRequest): Promise<ApiKeyTokenExchangeResponse> {
    const body: Record<string, string> = {
      grant_type: 'api_key',
      api_key: request.apiKey,
    }

    if (request.scope) {
      body.scope = request.scope
    }

    return extractData(
      await this.client.POST(
        '/token' as never,
        {
          body,
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          middleware: [omitAuthorizationHeader],
        } as never,
      ),
    ) as ApiKeyTokenExchangeResponse
  }
}
