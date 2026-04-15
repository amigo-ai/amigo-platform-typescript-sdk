/**
 * Shared utilities: response extraction and pagination helpers.
 */

import { ParseError } from './errors.js'

/**
 * Extracts the data payload from an openapi-fetch response,
 * throwing ParseError if the response is empty or unexpected.
 */
export function extractData<T>(result: { data?: T; error?: unknown }): T {
  if (result.data !== undefined) return result.data
  throw new ParseError(
    'Unexpected empty response from API',
    result.error !== undefined ? JSON.stringify(result.error) : undefined,
  )
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
