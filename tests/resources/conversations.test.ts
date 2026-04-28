import { describe, it, expect } from 'vitest'
import {
  AmigoClient,
  BadRequestError,
  ConfigurationError,
  textStreamAuthProtocols,
} from '../../src/index.js'
import type { SendMessageRequest, SendMessageResponse } from '../../src/index.js'

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
  it('sends a user-first text message through the generated endpoint', async () => {
    let requestBody: unknown
    let authorization: string | null = null
    const apiResponse: SendMessageResponse = {
      conversation_id: '00000000-0000-4000-8000-000000000001',
      status: 'active',
      messages: [{ role: 'agent', text: 'Hello, how can I help?' }],
    }
    const request: SendMessageRequest = {
      service_id: 'svc-00000000-0000-0000-0000-000000000001',
      message: 'Hello',
      conversation_id: '00000000-0000-4000-8000-000000000001',
      entity_id: 'ent-00000000-0000-0000-0000-000000000001',
    }
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      fetch: mockFetch({
        [`POST ${BASE}/conversations/messages`]: async (request) => {
          authorization = request.headers.get('authorization')
          requestBody = await request.json()
          return Response.json(apiResponse)
        },
      }),
    })

    const result = await client.conversations.sendMessage(request)

    expect(authorization).toBe(`Bearer ${TEST_API_KEY}`)
    expect(requestBody).toEqual({
      service_id: 'svc-00000000-0000-0000-0000-000000000001',
      message: 'Hello',
      conversation_id: '00000000-0000-4000-8000-000000000001',
      entity_id: 'ent-00000000-0000-0000-0000-000000000001',
    })
    expect(result.conversation_id).toBe('00000000-0000-4000-8000-000000000001')
    expect(result.status).toBe('active')
    expect(result.messages).toHaveLength(1)
    expect(result.messages[0]?.text).toBe('Hello, how can I help?')
    expect(result).toMatchObject(apiResponse)
  })

  it('routes sendMessage failures through the central error pipeline', async () => {
    let handlerCalls = 0
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      fetch: mockFetch({
        [`POST ${BASE}/conversations/messages`]: () => {
          handlerCalls += 1
          return Response.json({ detail: 'Invalid message' }, { status: 400 })
        },
      }),
    })

    await expect(
      client.conversations.sendMessage({
        service_id: 'svc-00000000-0000-0000-0000-000000000001',
        message: 'Hello',
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      detail: 'Invalid message',
    })
    await expect(
      client.conversations.sendMessage({
        service_id: 'svc-00000000-0000-0000-0000-000000000001',
        message: 'Hello',
      }),
    ).rejects.toBeInstanceOf(BadRequestError)
    expect(handlerCalls).toBe(2)
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
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      baseUrl: 'https://api.example.com',
      fetch: mockFetch({
        [`POST ${BASE}/conversations/messages`]: (request) => {
          scopedHeader = request.headers.get('x-request-scope')
          return Response.json({
            conversation_id: '00000000-0000-4000-8000-000000000001',
            status: 'active',
            messages: [],
          })
        },
      }),
    })

    const scoped = client.conversations.withOptions({
      headers: { 'x-request-scope': 'conversation' },
    })
    const url = new URL(scoped.textStreamUrl({ serviceId: 'svc-1' }))
    await scoped.sendMessage({ service_id: 'svc-1', message: 'Hello' })

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
