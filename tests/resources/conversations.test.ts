import { describe, it, expect } from 'vitest'
import {
  AmigoClient,
  BadRequestError,
  ConfigurationError,
  NotFoundError,
  ValidationError,
  textStreamAuthProtocols,
} from '../../src/index.js'
import type {
  ConversationDetail,
  ConversationListResponse,
  CreateConversationRequest,
  TurnRequest,
  TurnResponse,
} from '../../src/index.js'

const TEST_API_KEY = 'test-api-key-abc123'
const TEST_WORKSPACE_ID = 'ws-00000000-0000-0000-0000-000000000001'
const BASE = `/v1/${TEST_WORKSPACE_ID}`

function mockFetch(
  routes: Record<string, (request: Request) => Response | Promise<Response>>,
): typeof globalThis.fetch {
  return async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const request = input instanceof Request ? input : new Request(input, init)
    const pathname = new URL(request.url).pathname
    const key = `${request.method.toUpperCase()} ${pathname}`
    const handler = routes[key]
    if (handler) return await handler(request)
    return Response.json({ detail: `No mock for ${key}` }, { status: 500 })
  }
}

describe('ConversationsResource', () => {
  it('lists conversations with optional status filter', async () => {
    const apiResponse: ConversationListResponse = {
      items: [
        {
          channel_kind: 'web',
          created_at: '2026-01-01T00:00:00Z',
          id: '00000000-0000-4000-8000-000000000001',
          status: 'active',
          turn_count: 3,
          updated_at: '2026-01-01T00:01:00Z',
        },
      ],
      has_more: false,
      total: 1,
    }
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      fetch: mockFetch({
        [`GET ${BASE}/conversations`]: () => Response.json(apiResponse),
      }),
    })

    const result = await client.conversations.list({ status: 'active' })

    expect(result.items).toHaveLength(1)
    expect(result.items[0]?.status).toBe('active')
    expect(result.total).toBe(1)
  })

  it('creates a new conversation and forwards auth header', async () => {
    let requestBody: unknown
    let authorization: string | null = null
    const apiResponse: ConversationDetail = {
      id: '00000000-0000-4000-8000-000000000001',
      channel_kind: 'web',
      status: 'active',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    }
    const request: CreateConversationRequest = {
      service_id: 'svc-00000000-0000-0000-0000-000000000001',
      entity_id: 'ent-00000000-0000-0000-0000-000000000001',
    }
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      fetch: mockFetch({
        [`POST ${BASE}/conversations`]: async (req) => {
          authorization = req.headers.get('authorization')
          requestBody = await req.json()
          return Response.json(apiResponse, { status: 201 })
        },
      }),
    })

    const result = await client.conversations.create(request)

    expect(authorization).toBe(`Bearer ${TEST_API_KEY}`)
    expect(requestBody).toEqual(request)
    expect(result.id).toBe('00000000-0000-4000-8000-000000000001')
    expect(result.status).toBe('active')
  })

  it('gets a conversation by ID', async () => {
    const conversationId = '00000000-0000-4000-8000-000000000001'
    const apiResponse: ConversationDetail = {
      id: conversationId,
      channel_kind: 'web',
      status: 'active',
      turn_count: 2,
      turns: [],
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:01:00Z',
    }
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      fetch: mockFetch({
        [`GET ${BASE}/conversations/${conversationId}`]: () => Response.json(apiResponse),
      }),
    })

    const result = await client.conversations.get(conversationId)

    expect(result.id).toBe(conversationId)
    expect(result.turn_count).toBe(2)
  })

  it('closes a conversation', async () => {
    const conversationId = '00000000-0000-4000-8000-000000000001'
    let deleteCalled = false
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      fetch: mockFetch({
        [`DELETE ${BASE}/conversations/${conversationId}`]: () => {
          deleteCalled = true
          return new Response(null, { status: 204 })
        },
      }),
    })

    const result = await client.conversations.close(conversationId)

    expect(deleteCalled).toBe(true)
    expect(result).toBeUndefined()
  })

  it('creates a turn in a conversation', async () => {
    const conversationId = '00000000-0000-4000-8000-000000000001'
    let requestBody: unknown
    const turnRequest: TurnRequest = { message: 'Hello' }
    const apiResponse: TurnResponse = {
      turn_id: 'turn-001',
      conversation: {
        id: conversationId,
        status: 'active',
        turn_count: 1,
        updated_at: '2026-01-01T00:00:01Z',
      },
      input: { role: 'user', text: 'Hello', timestamp: '2026-01-01T00:00:00Z' },
      output: [{ role: 'agent', text: 'How can I help?', timestamp: '2026-01-01T00:00:01Z' }],
    }
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      fetch: mockFetch({
        [`POST ${BASE}/conversations/${conversationId}/turns`]: async (req) => {
          requestBody = await req.json()
          return Response.json(apiResponse)
        },
      }),
    })

    const result = await client.conversations.createTurn(conversationId, turnRequest)

    expect(requestBody).toEqual({ message: 'Hello' })
    expect(result.turn_id).toBe('turn-001')
    expect(result.output).toHaveLength(1)
  })

  it('routes GET failures through the central error pipeline', async () => {
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      fetch: mockFetch({
        [`GET ${BASE}/conversations/nonexistent`]: () =>
          Response.json({ detail: 'Not found' }, { status: 404 }),
      }),
    })

    await expect(client.conversations.get('nonexistent')).rejects.toBeInstanceOf(NotFoundError)
  })

  it('routes POST failures through the central error pipeline', async () => {
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      fetch: mockFetch({
        [`POST ${BASE}/conversations`]: () =>
          Response.json({ detail: [{ msg: 'service_id required' }] }, { status: 422 }),
      }),
    })

    await expect(client.conversations.create({ service_id: '' })).rejects.toBeInstanceOf(
      ValidationError,
    )
  })

  it('routes DELETE failures through the central error pipeline', async () => {
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      fetch: mockFetch({
        [`DELETE ${BASE}/conversations/nonexistent`]: () =>
          Response.json({ detail: 'Not found' }, { status: 404 }),
      }),
    })

    await expect(client.conversations.close('nonexistent')).rejects.toBeInstanceOf(NotFoundError)
  })

  it('routes createTurn failures through the central error pipeline', async () => {
    const conversationId = '00000000-0000-4000-8000-000000000001'
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      fetch: mockFetch({
        [`POST ${BASE}/conversations/${conversationId}/turns`]: () =>
          Response.json({ detail: 'Bad request' }, { status: 400 }),
      }),
    })

    await expect(
      client.conversations.createTurn(conversationId, { message: '' }),
    ).rejects.toBeInstanceOf(BadRequestError)
  })

  it('builds a text-stream URL from the client baseUrl', () => {
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      baseUrl: 'https://api.example.com',
    })

    const url = new URL(
      client.conversations.textStreamUrl({
        serviceId: 'svc-1',
        conversationId: '00000000-0000-4000-8000-000000000001',
        entityId: 'ent-1',
      }),
    )

    expect(url.protocol).toBe('wss:')
    expect(url.host).toBe('api.example.com')
    expect(url.pathname).toBe('/agent/text-stream')
    expect(url.searchParams.get('workspace_id')).toBe(TEST_WORKSPACE_ID)
    expect(url.searchParams.get('service_id')).toBe('svc-1')
    expect(url.searchParams.get('conversation_id')).toBe('00000000-0000-4000-8000-000000000001')
    expect(url.searchParams.get('entity_id')).toBe('ent-1')
    // Query key order is deliberate API behavior so downstream tests can assert
    // exact URLs without incidental reordering.
    expect([...url.searchParams.keys()]).toEqual([
      'workspace_id',
      'service_id',
      'conversation_id',
      'entity_id',
    ])
  })

  it('maps non-TLS REST base URLs to ws text-stream URLs', () => {
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      baseUrl: 'http://localhost:8000',
    })

    const url = new URL(client.conversations.textStreamUrl({ serviceId: 'svc-1' }))

    expect(url.protocol).toBe('ws:')
    expect(url.host).toBe('localhost:8000')
    expect(url.pathname).toBe('/agent/text-stream')
  })

  it('supports preview/custom text-stream URL overrides', () => {
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      baseUrl: '/api/platform',
    })

    const url = new URL(
      client.conversations.textStreamUrl({
        serviceId: 'svc-1',
        textStreamUrl: 'wss://preview-123.platform.example.com/agent/text-stream',
      }),
    )

    expect(url.host).toBe('preview-123.platform.example.com')
    expect(url.searchParams.get('workspace_id')).toBe(TEST_WORKSPACE_ID)
    expect(url.searchParams.get('service_id')).toBe('svc-1')
    expect(url.searchParams.has('conversation_id')).toBe(false)
    expect(url.searchParams.has('entity_id')).toBe(false)
    // Query key order is deliberate API behavior so downstream tests can assert
    // exact URLs without incidental reordering.
    expect([...url.searchParams.keys()]).toEqual(['workspace_id', 'service_id'])
  })

  it('applies scoped request options while preserving text-stream URL derivation', async () => {
    let scopedHeader: string | null = null
    const conversationId = '00000000-0000-4000-8000-000000000001'
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      baseUrl: 'https://api.example.com',
      fetch: mockFetch({
        [`GET ${BASE}/conversations/${conversationId}`]: (request) => {
          scopedHeader = request.headers.get('x-request-scope')
          return Response.json({
            id: conversationId,
            channel_kind: 'web',
            status: 'active',
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
          })
        },
      }),
    })

    const scoped = client.conversations.withOptions({
      headers: { 'x-request-scope': 'conversation' },
    })
    const url = new URL(scoped.textStreamUrl({ serviceId: 'svc-1' }))
    await scoped.get(conversationId)

    expect(scopedHeader).toBe('conversation')
    expect(url.protocol).toBe('wss:')
    expect(url.host).toBe('api.example.com')
    expect(url.pathname).toBe('/agent/text-stream')
  })

  it('supports token query auth fallback for non-subprotocol-safe keys', () => {
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      baseUrl: 'https://api.example.com',
    })

    const url = new URL(
      client.conversations.textStreamUrl({
        serviceId: 'svc-1',
        token: 'workspace:secret/with=base64+chars',
      }),
    )

    expect(url.searchParams.get('token')).toBe('workspace:secret/with=base64+chars')
    // Query key order is deliberate API behavior so downstream tests can assert
    // exact URLs without incidental reordering.
    expect([...url.searchParams.keys()]).toEqual(['workspace_id', 'service_id', 'token'])
  })

  it('rejects caller-supplied query parameters on text-stream URL overrides', () => {
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      baseUrl: '/api/platform',
    })

    expect(() =>
      client.conversations.textStreamUrl({
        serviceId: 'svc-1',
        textStreamUrl:
          'wss://preview-123.platform.example.com/agent/text-stream?workspace_id=wrong&service_id=wrong&conversation_id=wrong#frag',
      }),
    ).toThrow(ConfigurationError)
  })

  it('rejects non-WebSocket text-stream URL overrides', () => {
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      baseUrl: '/api/platform',
    })

    expect(() =>
      client.conversations.textStreamUrl({
        serviceId: 'svc-1',
        textStreamUrl: 'https://preview-123.platform.example.com/agent/text-stream',
      }),
    ).toThrow(ConfigurationError)
  })

  it('fails clearly when deriving a text-stream URL from a relative baseUrl', () => {
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      baseUrl: '/api/platform',
    })

    expect(() => client.conversations.textStreamUrl({ serviceId: 'svc-1' })).toThrow(
      ConfigurationError,
    )
  })

  it('fails clearly when a text-stream URL override is malformed', () => {
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      baseUrl: '/api/platform',
    })

    expect(() =>
      client.conversations.textStreamUrl({
        serviceId: 'svc-1',
        textStreamUrl: '/agent/text-stream',
      }),
    ).toThrow(ConfigurationError)
  })

  it('fails clearly when deriving a text-stream URL from a non-http baseUrl', () => {
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      baseUrl: 'http+unix://socket/api',
    })

    expect(() => client.conversations.textStreamUrl({ serviceId: 'svc-1' })).toThrow(
      ConfigurationError,
    )
  })

  it('fails clearly when deriving a text-stream URL from a path-prefixed baseUrl', () => {
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      baseUrl: 'https://api.example.com/v1/platform',
    })

    expect(() => client.conversations.textStreamUrl({ serviceId: 'svc-1' })).toThrow(
      ConfigurationError,
    )
  })

  it('returns browser WebSocket subprotocols for auth', () => {
    expect(textStreamAuthProtocols(TEST_API_KEY)).toEqual(['auth', TEST_API_KEY])
    expect(textStreamAuthProtocols('test+api.key')).toEqual(['auth', 'test+api.key'])
    expect(() => textStreamAuthProtocols('')).toThrow(/apiKey is required/)
    expect(() => textStreamAuthProtocols('   ')).toThrow(/apiKey is required/)
    expect(() => textStreamAuthProtocols('workspace:secret')).toThrow(/":"/)
    expect(() => textStreamAuthProtocols('base64/with=padding')).toThrow(/"\/", "="/)
  })

  it('rejects invalid text-stream token query values before building URLs', () => {
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      baseUrl: 'https://api.example.com',
    })

    expect(() => client.conversations.textStreamUrl({ serviceId: 'svc-1', token: '' })).toThrow(
      ConfigurationError,
    )
    expect(() => client.conversations.textStreamUrl({ serviceId: 'svc-1', token: '   ' })).toThrow(
      ConfigurationError,
    )
    expect(() =>
      client.conversations.textStreamUrl({ serviceId: 'svc-1', token: 'abc\r\nx-evil: y' }),
    ).toThrow(ConfigurationError)
  })
})
