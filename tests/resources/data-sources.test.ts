import { describe, it, expect } from 'vitest'
import { AmigoClient } from '../../src/index.js'
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  RateLimitError,
  ServiceUnavailableError,
} from '../../src/core/errors.js'

const TEST_API_KEY = 'test-api-key-abc123'
const TEST_WORKSPACE_ID = 'ws-00000000-0000-0000-0000-000000000001'
const DATA_SOURCE_ID = 'ds-00000000-0000-0000-0000-000000000001'

const BASE = `/v1/${TEST_WORKSPACE_ID}`

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
      const pPath = pPathParts.join(' ')
      if (pMethod === method && pathname === pPath) {
        return handler()
      }
    }
    return new Response(JSON.stringify({ detail: `No mock for ${method} ${pathname}` }), {
      status: 500,
    })
  }
}

describe('DataSourcesResource.triggerSync', () => {
  it('returns the queued-sync response on 202', async () => {
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      fetch: mockFetch({
        [`POST ${BASE}/data-sources/${DATA_SOURCE_ID}/sync`]: () =>
          Response.json(
            {
              status: 'started',
              data_source_id: DATA_SOURCE_ID,
              triggered_at: '2026-04-22T20:00:00Z',
            },
            { status: 202 },
          ),
      }),
    })

    const result = await client.dataSources.triggerSync(DATA_SOURCE_ID)
    expect(result.status).toBe('started')
    expect(result.data_source_id).toBe(DATA_SOURCE_ID)
    expect(result.triggered_at).toBe('2026-04-22T20:00:00Z')
  })

  it('throws ConflictError when the source is already syncing', async () => {
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      fetch: mockFetch({
        [`POST ${BASE}/data-sources/${DATA_SOURCE_ID}/sync`]: () =>
          Response.json(
            {
              detail: {
                message: 'Data source is already syncing',
                details: {
                  last_poll_at: '2026-04-22T19:58:00Z',
                  last_poll_duration_ms: 42_000,
                },
              },
            },
            { status: 409 },
          ),
      }),
    })

    const error = await client.dataSources.triggerSync(DATA_SOURCE_ID).catch((e) => e)
    expect(error).toBeInstanceOf(ConflictError)
    // The SDK's generic error normalizer stores the parsed body under
    // context.response — consumers can reach through to the structured
    // 409 payload (platform-api FastAPI wraps our response under `detail`).
    expect((error as ConflictError).context).toBeDefined()
    expect((error as ConflictError).context).toMatchObject({
      response: {
        detail: {
          message: 'Data source is already syncing',
          details: {
            last_poll_at: '2026-04-22T19:58:00Z',
            last_poll_duration_ms: 42_000,
          },
        },
      },
    })
  })

  it('throws ServiceUnavailableError when connector-runner is down', async () => {
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      fetch: mockFetch({
        [`POST ${BASE}/data-sources/${DATA_SOURCE_ID}/sync`]: () =>
          Response.json({ detail: 'Connector-runner is unreachable' }, { status: 503 }),
      }),
    })

    await expect(client.dataSources.triggerSync(DATA_SOURCE_ID)).rejects.toThrow(
      ServiceUnavailableError,
    )
  })

  it('throws NotFoundError when the data source does not exist', async () => {
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      fetch: mockFetch({
        [`POST ${BASE}/data-sources/${DATA_SOURCE_ID}/sync`]: () =>
          Response.json(
            { detail: 'Data source not found', error_code: 'not_found' },
            { status: 404 },
          ),
      }),
    })

    await expect(client.dataSources.triggerSync(DATA_SOURCE_ID)).rejects.toThrow(NotFoundError)
  })

  it('throws BadRequestError on a malformed data source id', async () => {
    const malformedId = 'not-a-uuid'
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      fetch: mockFetch({
        // Mock matches the SDK's constructed path with the malformed segment,
        // proving the bad ID flows through to the URL (not transformed away).
        [`POST ${BASE}/data-sources/${malformedId}/sync`]: () =>
          Response.json({ detail: 'Invalid data source ID format' }, { status: 400 }),
      }),
    })

    await expect(client.dataSources.triggerSync(malformedId)).rejects.toThrow(BadRequestError)
  })

  it('throws RateLimitError when the per-API-key write limit is exceeded', async () => {
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      // Disable retries so the 429 surfaces immediately instead of waiting
      // out the SDK's exponential-backoff Retry-After loop.
      maxRetries: 0,
      fetch: mockFetch({
        [`POST ${BASE}/data-sources/${DATA_SOURCE_ID}/sync`]: () =>
          new Response(JSON.stringify({ detail: 'Rate limit exceeded' }), {
            status: 429,
            headers: { 'Content-Type': 'application/json', 'Retry-After': '30' },
          }),
      }),
    })

    await expect(client.dataSources.triggerSync(DATA_SOURCE_ID)).rejects.toThrow(RateLimitError)
  })
})
