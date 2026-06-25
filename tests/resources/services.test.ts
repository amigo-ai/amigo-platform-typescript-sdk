import { beforeEach, describe, expect, it } from 'vitest'
import { AmigoClient, TTS_PROVIDERS, VOICE_SESSION_PROVIDERS } from '../../src/index.js'
import { NotFoundError } from '../../src/core/errors.js'

const TEST_API_KEY = 'test-api-key-abc123'
const TEST_WORKSPACE_ID = 'ws-00000000-0000-0000-0000-000000000001'

const SERVICE_ID = 'svc-00000000-0000-0000-0000-000000000001'
let lastCreateBody: unknown
let lastUpdateBody: unknown

const SERVICE_FIXTURE = {
  id: SERVICE_ID,
  workspace_id: TEST_WORKSPACE_ID,
  name: 'Scheduling Service',
  description: 'External scheduling system integration',
  channel_type: 'voice',
  agent_id: 'agent-00000000-0000-0000-0000-000000000001',
  context_graph_id: 'cg-00000000-0000-0000-0000-000000000001',
  is_active: true,
  keyterms: [],
  tags: [],
  tool_capacity: 5,
  voice_config: {
    session_provider: 'inhouse',
    tts_provider: 'cartesia',
  },
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

type MockRouteContext = { body: unknown }
type MockRoute = (context: MockRouteContext) => Response | Promise<Response>

async function parseBody(input: string | URL | Request, init?: RequestInit): Promise<unknown> {
  if (input instanceof Request) {
    if (!input.body) return undefined
    return input.clone().json()
  }
  if (typeof init?.body !== 'string') return undefined
  return JSON.parse(init.body)
}

function mockFetch(routes: Record<string, MockRoute>): typeof globalThis.fetch {
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
    const body = await parseBody(input, init)
    for (const [pattern, handler] of Object.entries(routes)) {
      const [pMethod, ...pPathParts] = pattern.split(' ')
      if (pMethod === method && pPathParts.join(' ') === pathname) return handler({ body })
    }
    return new Response(JSON.stringify({ detail: `No mock for ${method} ${pathname}` }), {
      status: 500,
    })
  }
}

const BASE = `/v1/${TEST_WORKSPACE_ID}`

const client = new AmigoClient({
  apiKey: TEST_API_KEY,
  workspaceId: TEST_WORKSPACE_ID,
  fetch: mockFetch({
    [`POST ${BASE}/services`]: ({ body }) => {
      lastCreateBody = body
      return Response.json(SERVICE_FIXTURE, { status: 201 })
    },

    [`GET ${BASE}/services`]: () =>
      Response.json({ items: [SERVICE_FIXTURE], has_more: false, continuation_token: null }),

    [`GET ${BASE}/services/${SERVICE_ID}`]: () => Response.json(SERVICE_FIXTURE),

    [`GET ${BASE}/services/not-found`]: () =>
      Response.json({ detail: 'Service not found', error_code: 'not_found' }, { status: 404 }),

    [`PUT ${BASE}/services/${SERVICE_ID}`]: ({ body }) => {
      lastUpdateBody = body
      return Response.json({
        ...SERVICE_FIXTURE,
        name: 'Updated Service',
        is_active: false,
        voice_config: { session_provider: 'atlas', tts_provider: 'groq' },
      })
    },

    [`DELETE ${BASE}/services/${SERVICE_ID}`]: () => new Response(null, { status: 204 }),
  }),
})

describe('ServicesResource', () => {
  beforeEach(() => {
    lastCreateBody = undefined
    lastUpdateBody = undefined
  })

  it('creates a service', async () => {
    const body = {
      name: 'Scheduling Service',
      channel_type: 'voice',
      context_graph_id: 'cg-00000000-0000-0000-0000-000000000001',
      voice_config: {
        session_provider: VOICE_SESSION_PROVIDERS[0],
        tts_provider: TTS_PROVIDERS[0],
      },
    } as Parameters<typeof client.services.create>[0]
    const result = await client.services.create(body)
    expect(result.id).toBe(SERVICE_ID)
    expect(result.name).toBe('Scheduling Service')
    expect(lastCreateBody).toMatchObject({
      voice_config: {
        session_provider: VOICE_SESSION_PROVIDERS[0],
        tts_provider: TTS_PROVIDERS[0],
      },
    })
  })

  it('lists services', async () => {
    const result = await client.services.list()
    expect(result.items).toHaveLength(1)
    expect(result.items[0]?.name).toBe('Scheduling Service')
    expect(result.has_more).toBe(false)
  })

  it('gets a service by id', async () => {
    const result = await client.services.get(SERVICE_ID)
    expect(result.id).toBe(SERVICE_ID)
    expect(result.channel_type).toBe('voice')
  })

  it('throws NotFoundError for missing service', async () => {
    await expect(client.services.get('not-found')).rejects.toThrow(NotFoundError)
  })

  it('updates a service', async () => {
    const body = {
      name: 'Updated Service',
      is_active: false,
      voice_config: {
        session_provider: VOICE_SESSION_PROVIDERS[2],
        tts_provider: TTS_PROVIDERS[2],
      },
    } as Parameters<typeof client.services.update>[1]
    const result = await client.services.update(SERVICE_ID, body)
    expect(result.name).toBe('Updated Service')
    expect(result.is_active).toBe(false)
    expect(result.voice_config?.session_provider).toBe('atlas')
    expect(lastUpdateBody).toMatchObject({
      voice_config: {
        session_provider: VOICE_SESSION_PROVIDERS[2],
        tts_provider: TTS_PROVIDERS[2],
      },
    })
  })

  it('deletes a service', async () => {
    await expect(client.services.delete(SERVICE_ID)).resolves.toBeUndefined()
  })
})
