/**
 * Test helper: route-based mock fetch.
 *
 * Pass a record of `'METHOD /path/segment'` keys to handlers; any request
 * whose method + pathname matches is routed to the handler. Unmatched
 * requests resolve with HTTP 500 carrying the unmatched route in the body
 * so test failures surface the missing mock immediately.
 *
 * Pathname matching is exact — `'GET /foo'` does not match `/foo/`. If your
 * resource builds a URL with a trailing slash (some FastAPI list endpoints
 * do), include the slash in the route key.
 */
export function mockFetch(
  routes: Record<string, () => Response | Promise<Response>>,
): typeof globalThis.fetch {
  return async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    let url: string
    let method: string
    if (input instanceof Request) {
      url = input.url
      method = input.method.toUpperCase()
    } else {
      url = typeof input === 'string' ? input : input.toString()
      method = (init?.method ?? 'GET').toUpperCase()
    }
    const pathname = new URL(url).pathname
    for (const [pattern, handler] of Object.entries(routes)) {
      const [pMethod, ...pPathParts] = pattern.split(' ')
      if (pMethod === method && pPathParts.join(' ') === pathname) return handler()
    }
    return new Response(JSON.stringify({ detail: `No mock for ${method} ${pathname}` }), {
      status: 500,
    })
  }
}
