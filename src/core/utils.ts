/**
 * Shared utilities: response extraction and pagination helpers.
 */

import { ParseError } from './errors.js'
import { parseRateLimitHeaders, type RateLimitInfo } from './rate-limit.js'

export interface LastResponseInfo {
  requestId: string | null
  statusCode: number
  headers: Headers
  rateLimit: RateLimitInfo
}

export interface ResponseMetadata {
  _request_id: string | null
  lastResponse: LastResponseInfo
}

export interface AmigoResponse<T> {
  data: WithResponseMetadata<T>
  response: Response
  requestId: string | null
  rateLimit: RateLimitInfo
}

export type WithResponseMetadata<T> = T extends object ? T & ResponseMetadata : T

export function extractRequestId(response: Response): string | null {
  return response.headers.get('x-request-id')
}

export function buildLastResponse(response: Response): LastResponseInfo {
  return {
    requestId: extractRequestId(response),
    statusCode: response.status,
    headers: response.headers,
    rateLimit: parseRateLimitHeaders(response.headers),
  }
}

interface OpenApiResult<T> {
  data?: T
  error?: unknown
  response?: Response
}

interface ExtractDataOptions {
  allowEmptyBody?: boolean
}

/**
 * Extracts the data payload from an openapi-fetch response.
 * Empty-body success responses return undefined; other empty responses throw.
 */
export function extractData<T>(
  result: OpenApiResult<T>,
  options: ExtractDataOptions = {},
): WithResponseMetadata<T> {
  if (result.data !== undefined) {
    return attachResponseMetadata(result.data, result.response) as WithResponseMetadata<T>
  }

  if (isEmptyBodySuccess(result.response) || options.allowEmptyBody) {
    return undefined as WithResponseMetadata<T>
  }

  // Degenerate openapi-fetch results with both data and error keep the SDK's
  // original data-first behavior; without data, errors stay fatal.
  if (result.error !== undefined) {
    throw new ParseError('Unexpected error response from API', JSON.stringify(result.error))
  }

  throw new ParseError(
    'Unexpected empty response from API',
    result.response ? `status=${result.response.status}` : undefined,
  )
}

export function withResponse<T>(
  result: OpenApiResult<T> & { response: Response },
  options: ExtractDataOptions = {},
): AmigoResponse<T> {
  const data = extractData(result, options)
  const lastResponse = buildLastResponse(result.response)

  return {
    data,
    response: result.response,
    requestId: lastResponse.requestId,
    rateLimit: lastResponse.rateLimit,
  }
}

/**
 * Standard paginated list response shape.
 */
export interface PaginatedList<T> {
  items: T[]
  has_more: boolean
  continuation_token: number | null
}

/**
 * Standard query params for paginated list endpoints.
 */
export interface ListParams {
  /** Max items per page. Default varies by endpoint. */
  limit?: number
  /** Opaque token from previous response for next page. */
  continuation_token?: number
}

/**
 * Async iterator that auto-paginates through all pages.
 * Yields one item at a time.
 *
 * @example
 * for await (const agent of paginate((token) => client.agents.list({ continuation_token: token }))) {
 *   console.log(agent)
 * }
 */
export async function* paginate<T>(
  fetcher: (continuationToken?: number) => Promise<PaginatedList<T>>,
): AsyncGenerator<T> {
  let token: number | undefined = undefined
  while (true) {
    const page = await fetcher(token)
    for (const item of page.items) {
      yield item
    }
    if (!page.has_more || page.continuation_token === null) break
    token = page.continuation_token
  }
}

function attachResponseMetadata<T>(data: T, response?: Response): WithResponseMetadata<T> {
  if (!response || typeof data !== 'object' || data === null) {
    return data as WithResponseMetadata<T>
  }

  const target = data as T & Partial<ResponseMetadata>
  const lastResponse = buildLastResponse(response)

  defineHiddenMetadata(target, '_request_id', lastResponse.requestId)
  defineHiddenMetadata(target, 'lastResponse', lastResponse)

  return target as WithResponseMetadata<T>
}

function isEmptyBodySuccess(response?: Response): boolean {
  return response?.status === 204 || response?.status === 205
}

function defineHiddenMetadata<T extends object, K extends keyof ResponseMetadata>(
  target: T,
  key: K,
  value: ResponseMetadata[K],
): void {
  try {
    Object.defineProperty(target, key, {
      value,
      enumerable: false,
      configurable: true,
      writable: false,
    })
  } catch {
    // Ignore non-extensible return values.
  }
}
