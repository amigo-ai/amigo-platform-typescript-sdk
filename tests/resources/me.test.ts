import { describe, expect, it } from 'vitest'
import { AmigoClient } from '../../src/index.js'

const TEST_API_KEY = 'test-api-key-abc123'
const TEST_WORKSPACE_ID = 'ws-00000000-0000-0000-0000-000000000001'

const WORKSPACE_FIXTURE = {
  id: TEST_WORKSPACE_ID,
  name: 'Acme Health',
  slug: 'acme-health',
  status: 'active',
  environment: 'staging',
  region: 'us-east-1',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

function mockFetch(
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

describe('MeResource', () => {
  it('creates a workspace via POST /v1/me/workspaces', async () => {
    let capturedBody: unknown
    const recordingFetch: typeof globalThis.fetch = async (input, init) => {
      // openapi-fetch passes a Request object when a body is supplied.
      if (input instanceof Request && input.body) {
        capturedBody = await input.clone().json()
      } else if (init?.body) {
        capturedBody = JSON.parse(init.body as string)
      }
      return mockFetch({
        [`POST /v1/me/workspaces`]: () => Response.json(WORKSPACE_FIXTURE, { status: 201 }),
      })(input, init)
    }

    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      fetch: recordingFetch,
    })

    const result = await client.me.createWorkspace({
      slug: 'acme-health',
      name: 'Acme Health',
    } as never)

    expect(result.id).toBe(TEST_WORKSPACE_ID)
    expect(result.name).toBe('Acme Health')
    // Body shape unchanged from the legacy ``createSelfService`` call
    // — only the URL moved. Pin the request body to catch a future
    // accidental shape change.
    expect(capturedBody).toEqual({ slug: 'acme-health', name: 'Acme Health' })
  })

  it('does not expose createSelfService on client.workspaces (regression)', () => {
    // The legacy method was removed in SDK 0.27.0 (platform-api PR #2472
    // deleted the underlying ``POST /v1/workspaces/self-service`` route).
    // SDK consumers must migrate to ``client.me.createWorkspace``.
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      fetch: mockFetch({}),
    })
    expect(
      (client.workspaces as unknown as { createSelfService?: unknown }).createSelfService,
    ).toBeUndefined()
  })
})
