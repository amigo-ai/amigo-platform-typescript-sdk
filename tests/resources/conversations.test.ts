import { describe, it, expect, vi } from 'vitest'
import {
  AmigoClient,
  BadRequestError,
  ConfigurationError,
  NotFoundError,
  ValidationError,
  createIdempotencyKey,
  sessionConnectAuthProtocols,
  textStreamAuthProtocols,
} from '../../src/index.js'
import type {
  ChannelKind,
  ConversationDetail,
  ConversationListResponse,
  ConversationTurnAvailableAction,
  ConversationTurnStateTransition,
  CreateConversationRequest,
  SwitchChannelRequest,
  TurnConversationSnapshot,
  TurnDelivery,
  TurnRequest,
  TurnResponse,
} from '../../src/index.js'

const TEST_API_KEY = 'test-api-key-abc123'
const TEST_WORKSPACE_ID = 'ws-00000000-0000-0000-0000-000000000001'
const BASE = `/v1/${TEST_WORKSPACE_ID}`
const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

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
  it('routes legacy conversation listing through the unified Runs contract', async () => {
    const apiResponse: ConversationListResponse = {
      items: [
        {
          run_id: '10000000-0000-4000-8000-000000000001',
          workspace_id: TEST_WORKSPACE_ID,
          kind: 'conversation',
          channel: 'web',
          source_conversation_id: '00000000-0000-4000-8000-000000000001',
          status: 'running',
          started_at: '2026-01-01T00:00:00Z',
          turn_count: 3,
          takeover: { eligible: false, reason: 'channel not yet supported' },
        },
      ],
      has_more: false,
      continuation_token: null,
    }
    let requestUrl: string | null = null
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      fetch: mockFetch({
        [`GET ${BASE}/runs`]: (request) => {
          requestUrl = request.url
          return Response.json(apiResponse)
        },
      }),
    })

    const result = await client.conversations.list({
      status: 'active',
      channel_kind: 'web',
      offset: 20,
    })

    expect(result.items).toHaveLength(1)
    expect(result.items[0]?.kind).toBe('conversation')
    expect(result.items[0]?.source_conversation_id).toBe('00000000-0000-4000-8000-000000000001')
    expect(requestUrl).not.toBeNull()
    const query = new URL(requestUrl!).searchParams
    expect(query.getAll('kind')).toEqual(['conversation'])
    expect(query.getAll('status')).toEqual(['running'])
    expect(query.getAll('channel')).toEqual(['web'])
    expect(query.get('continuation_token')).toBe('20')
  })

  it('rejects legacy channels that the unified Runs contract cannot represent', async () => {
    const fetchSpy = vi.fn<typeof globalThis.fetch>()
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      fetch: fetchSpy,
    })

    await expect(client.conversations.list({ channel_kind: 'whatsapp' })).rejects.toThrow(
      ConfigurationError,
    )
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('creates a new conversation and forwards auth header', async () => {
    let requestBody: unknown
    let authorization: string | null = null
    const apiResponse: ConversationDetail = {
      id: '00000000-0000-4000-8000-000000000001',
      channel_kind: 'web',
      status: 'active',
      lifecycle: 'active',
      turn_count: 0,
      turns: [],
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
    const availableActions: ConversationTurnAvailableAction[] = [
      { description: 'Confirm appointment time' },
    ]
    const stateTransition: ConversationTurnStateTransition = {
      from: 'collecting_preferences',
      to: 'confirming_appointment',
    }
    const stateTransitions: ConversationTurnStateTransition[] = [
      {
        from: 'collecting_preferences',
        to: 'selecting_slot',
      },
      {
        from: 'selecting_slot',
        to: 'confirming_appointment',
      },
    ]
    const apiResponse: ConversationDetail = {
      id: conversationId,
      channel_kind: 'web',
      status: 'active',
      lifecycle: 'active',
      turn_count: 2,
      turns: [
        {
          role: 'agent',
          text: 'Does 3 PM work?',
          timestamp: '2026-01-01T00:01:00Z',
          content: [{ type: 'text', text: 'Does 3 PM work?' }],
          available_actions: availableActions,
          selected_action_description: 'Ask the user to confirm the proposed time',
          state_transition: stateTransition,
          state_transitions: stateTransitions,
        },
      ],
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
    expect(result.turns?.[0]?.available_actions).toEqual(availableActions)
    expect(result.turns?.[0]?.selected_action_description).toBe(
      'Ask the user to confirm the proposed time',
    )
    expect(result.turns?.[0]?.state_transition).toEqual(stateTransition)
    expect(result.turns?.[0]?.state_transitions).toEqual(stateTransitions)
  })

  it.each([
    { lifecycle: 'active' as const, status: 'active' as const },
    { lifecycle: 'dormant' as const, status: 'completed' as const },
    { lifecycle: 'closed' as const, status: 'closed' as const },
  ])(
    'preserves lifecycle=$lifecycle on ConversationDetail responses',
    async ({ lifecycle, status }) => {
      // Separate parametrized coverage for the detail-response decoder
      // path catches lifecycle regressions independently of the list
      // path above. If a separate decoder ever collapsed non-active
      // values to ``"active"`` on detail responses, the list-level
      // coverage would still pass — this test would not.
      const conversationId = '00000000-0000-4000-8000-000000000099'
      const apiResponse: ConversationDetail = {
        id: conversationId,
        channel_kind: 'web',
        status,
        lifecycle,
        turn_count: 4,
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

      expect(result.lifecycle).toBe(lifecycle)
      expect(result.status).toBe(status)
    },
  )

  it('forwards include_tool_calls on conversation detail fetches', async () => {
    const conversationId = '00000000-0000-4000-8000-000000000001'
    let requestUrl: string | undefined
    const apiResponse: ConversationDetail = {
      id: conversationId,
      channel_kind: 'web',
      status: 'active',
      lifecycle: 'active',
      turn_count: 0,
      turns: [],
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:01:00Z',
    }
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      fetch: mockFetch({
        [`GET ${BASE}/conversations/${conversationId}`]: (req) => {
          requestUrl = req.url
          return Response.json(apiResponse)
        },
      }),
    })

    await client.conversations.get(conversationId, { includeToolCalls: true })

    expect(requestUrl).toBeDefined()
    const url = new URL(requestUrl as string)
    // Server defaults `include_tool_calls` to `false`; the SDK MUST forward
    // the opt-in or per-turn `tool_calls` arrays stay empty even when the
    // agent invoked tools. Caller-visible regression if dropped.
    expect(url.searchParams.get('include_tool_calls')).toBe('true')
  })

  it('omits include_tool_calls from detail fetches when the option is not provided', async () => {
    const conversationId = '00000000-0000-4000-8000-000000000001'
    let requestUrl: string | undefined
    const apiResponse: ConversationDetail = {
      id: conversationId,
      channel_kind: 'web',
      status: 'active',
      lifecycle: 'active',
      turn_count: 0,
      turns: [],
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:01:00Z',
    }
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      fetch: mockFetch({
        [`GET ${BASE}/conversations/${conversationId}`]: (req) => {
          requestUrl = req.url
          return Response.json(apiResponse)
        },
      }),
    })

    await client.conversations.get(conversationId)

    expect(requestUrl).toBeDefined()
    expect(new URL(requestUrl as string).searchParams.has('include_tool_calls')).toBe(false)
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

  it('switches a conversation channel', async () => {
    const conversationId = '00000000-0000-4000-8000-000000000001'
    let requestBody: unknown
    // Typed against the exported ChannelKind alias so a drift between the
    // named export and the generated schema fails compilation here.
    const targetChannel: ChannelKind = 'imessage'
    const request: SwitchChannelRequest = {
      channel: targetChannel,
      reason: 'customer_request',
      recipient: '+15555550123',
      use_case_id: '00000000-0000-4000-8000-0000000000aa',
      dispatch_opener: true,
      instruction: 'Confirm the Tuesday slot over text',
    }
    const apiResponse: ConversationDetail = {
      id: conversationId,
      channel_kind: 'imessage',
      status: 'active',
      lifecycle: 'active',
      turn_count: 3,
      turns: [],
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:05:00Z',
    }
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      fetch: mockFetch({
        [`POST ${BASE}/conversations/${conversationId}/channel`]: async (req) => {
          requestBody = await req.json()
          return Response.json(apiResponse)
        },
      }),
    })

    const result = await client.conversations.switchChannel(conversationId, request)

    // The SDK forwards the request body verbatim — no renamed keys, no
    // dropped optional fields.
    expect(requestBody).toEqual({
      channel: 'imessage',
      reason: 'customer_request',
      recipient: '+15555550123',
      use_case_id: '00000000-0000-4000-8000-0000000000aa',
      dispatch_opener: true,
      instruction: 'Confirm the Tuesday slot over text',
    })
    expect(result.id).toBe(conversationId)
    expect(result.channel_kind).toBe('imessage')
  })

  it('routes switchChannel failures through the central error pipeline', async () => {
    const conversationId = '00000000-0000-4000-8000-000000000001'
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      fetch: mockFetch({
        [`POST ${BASE}/conversations/${conversationId}/channel`]: () =>
          Response.json({ detail: 'recipient required for imessage' }, { status: 422 }),
      }),
    })

    await expect(
      client.conversations.switchChannel(conversationId, {
        channel: 'imessage',
        reason: 'customer_request',
      }),
    ).rejects.toBeInstanceOf(ValidationError)
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
      input: {
        role: 'user',
        text: 'Hello',
        timestamp: '2026-01-01T00:00:00Z',
        content: [{ type: 'text', text: 'Hello' }],
      },
      output: [
        {
          role: 'agent',
          text: 'How can I help?',
          timestamp: '2026-01-01T00:00:01Z',
          content: [{ type: 'text', text: 'How can I help?' }],
        },
      ],
      tool_calls: [],
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

  it('exposes context graph state on non-streaming turn responses', async () => {
    const conversationId = '00000000-0000-4000-8000-000000000001'
    const conversation: TurnConversationSnapshot = {
      id: conversationId,
      status: 'active',
      turn_count: 1,
      updated_at: '2026-01-01T00:00:01Z',
      context_graph_state: {
        type: 'annotation',
        name: 'collect_intake',
        inner_thought: 'Collect the missing intake details.',
        next_state: 'confirm_intake',
      },
    }
    const apiResponse: TurnResponse = {
      turn_id: 'turn-001',
      conversation,
      input: {
        role: 'user',
        text: 'Hello',
        timestamp: '2026-01-01T00:00:00Z',
        content: [{ type: 'text', text: 'Hello' }],
      },
      output: [],
      tool_calls: [],
    }
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      fetch: mockFetch({
        [`POST ${BASE}/conversations/${conversationId}/turns`]: () => Response.json(apiResponse),
      }),
    })

    const result = await client.conversations.createTurn(conversationId, { message: 'Hello' })

    expect(result.conversation.context_graph_state).toEqual(conversation.context_graph_state)
  })

  it('forwards include_tool_calls when requested via createTurn options', async () => {
    const conversationId = '00000000-0000-4000-8000-000000000001'
    let requestUrl: string | undefined
    const apiResponse: TurnResponse = {
      turn_id: 'turn-001',
      conversation: {
        id: conversationId,
        status: 'active',
        turn_count: 1,
        updated_at: '2026-01-01T00:00:01Z',
      },
      input: {
        role: 'user',
        text: 'Hello',
        timestamp: '2026-01-01T00:00:00Z',
        content: [{ type: 'text', text: 'Hello' }],
      },
      output: [
        {
          role: 'agent',
          text: 'How can I help?',
          timestamp: '2026-01-01T00:00:01Z',
          content: [{ type: 'text', text: 'How can I help?' }],
        },
      ],
      tool_calls: [],
    }
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      fetch: mockFetch({
        [`POST ${BASE}/conversations/${conversationId}/turns`]: (req) => {
          requestUrl = req.url
          return Response.json(apiResponse)
        },
      }),
    })

    await client.conversations.createTurn(
      conversationId,
      { message: 'Hello' },
      { includeToolCalls: true },
    )

    expect(requestUrl).toBeDefined()
    const url = new URL(requestUrl as string)
    // Server defaults `include_tool_calls` to `false`; the SDK MUST forward
    // the opt-in or the response's `tool_calls` array stays empty even when
    // the agent invoked tools. Caller-visible regression if dropped.
    expect(url.searchParams.get('include_tool_calls')).toBe('true')
  })

  it('omits include_tool_calls from the URL when the option is not provided', async () => {
    const conversationId = '00000000-0000-4000-8000-000000000001'
    let requestUrl: string | undefined
    const apiResponse: TurnResponse = {
      turn_id: 'turn-001',
      conversation: {
        id: conversationId,
        status: 'active',
        turn_count: 1,
        updated_at: '2026-01-01T00:00:01Z',
      },
      input: {
        role: 'user',
        text: 'Hello',
        timestamp: '2026-01-01T00:00:00Z',
        content: [{ type: 'text', text: 'Hello' }],
      },
      output: [],
      tool_calls: [],
    }
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      fetch: mockFetch({
        [`POST ${BASE}/conversations/${conversationId}/turns`]: (req) => {
          requestUrl = req.url
          return Response.json(apiResponse)
        },
      }),
    })

    await client.conversations.createTurn(conversationId, { message: 'Hello' })

    expect(requestUrl).toBeDefined()
    const url = new URL(requestUrl as string)
    expect(url.searchParams.has('include_tool_calls')).toBe(false)
  })

  it('pollTurn sends poll=true with an empty body and forwards include_tool_calls', async () => {
    const conversationId = '00000000-0000-4000-8000-000000000001'
    let requestUrl: string | undefined
    let requestBody: unknown
    const apiResponse: TurnResponse = {
      turn_id: 'turn-poll',
      conversation: {
        id: conversationId,
        status: 'active',
        turn_count: 1,
        updated_at: '2026-01-01T00:00:01Z',
      },
      input: { role: 'user', text: '', content: [] },
      // Idle poll: nothing pending → empty output + tool_calls.
      output: [],
      tool_calls: [],
    }
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      fetch: mockFetch({
        [`POST ${BASE}/conversations/${conversationId}/turns`]: async (req) => {
          requestUrl = req.url
          requestBody = await req.json()
          return Response.json(apiResponse)
        },
      }),
    })

    await client.conversations.pollTurn(conversationId, { includeToolCalls: true })

    expect(requestUrl).toBeDefined()
    const url = new URL(requestUrl as string)
    // poll is a no-message drain — both query params must be forwarded and the
    // body must carry no message (the server rejects poll + message with 422).
    expect(url.searchParams.get('poll')).toBe('true')
    expect(url.searchParams.get('include_tool_calls')).toBe('true')
    expect(requestBody).toEqual({})
  })

  it('pollTurn without options sends poll=true, empty body, and omits include_tool_calls', async () => {
    const conversationId = '00000000-0000-4000-8000-000000000001'
    let requestUrl: string | undefined
    let requestBody: unknown
    const apiResponse: TurnResponse = {
      turn_id: 'turn-poll',
      conversation: {
        id: conversationId,
        status: 'active',
        turn_count: 1,
        updated_at: '2026-01-01T00:00:01Z',
      },
      input: { role: 'user', text: '', content: [] },
      output: [],
      tool_calls: [],
    }
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      fetch: mockFetch({
        [`POST ${BASE}/conversations/${conversationId}/turns`]: async (req) => {
          requestUrl = req.url
          requestBody = await req.json()
          return Response.json(apiResponse)
        },
      }),
    })

    await client.conversations.pollTurn(conversationId)

    expect(requestUrl).toBeDefined()
    const url = new URL(requestUrl as string)
    expect(url.searchParams.get('poll')).toBe('true')
    expect(url.searchParams.has('include_tool_calls')).toBe(false)
    expect(requestBody).toEqual({})
  })

  it('sends a generated UUID idempotency key on message turns', async () => {
    const conversationId = '00000000-0000-4000-8000-000000000001'
    let idempotencyKey: string | null = null
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      fetch: mockFetch({
        [`POST ${BASE}/conversations/${conversationId}/turns`]: (request) => {
          idempotencyKey = request.headers.get('idempotency-key')
          return Response.json({
            turn_id: 'turn-001',
            conversation: {
              id: conversationId,
              status: 'active',
              turn_count: 1,
              updated_at: '2026-01-01T00:00:01Z',
            },
            input: { role: 'user', text: 'Hello', content: [] },
            output: [],
            tool_calls: [],
            delivery_protocol_version: 2,
          } satisfies TurnResponse)
        },
      }),
    })

    await client.conversations.createTurn(conversationId, { message: 'Hello' })

    expect(idempotencyKey).toMatch(UUID_V4_RE)
  })

  it('exports canonical UUID idempotency keys for application-managed retries', () => {
    expect(createIdempotencyKey()).toMatch(UUID_V4_RE)
  })

  it('generates a canonical UUID v4 with the getRandomValues fallback', () => {
    const originalCrypto = Object.getOwnPropertyDescriptor(globalThis, 'crypto')
    const getRandomValues = vi.fn((bytes: Uint8Array) => {
      bytes.forEach((_, index) => {
        bytes[index] = index
      })
      return bytes
    })
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: { getRandomValues },
    })

    try {
      expect(createIdempotencyKey()).toBe('00010203-0405-4607-8809-0a0b0c0d0e0f')
      expect(getRandomValues).toHaveBeenCalledOnce()
      expect(getRandomValues.mock.calls[0]?.[0]).toBeInstanceOf(Uint8Array)
      expect(getRandomValues.mock.calls[0]?.[0]).toHaveLength(16)
    } finally {
      if (originalCrypto) {
        Object.defineProperty(globalThis, 'crypto', originalCrypto)
      } else {
        Reflect.deleteProperty(globalThis, 'crypto')
      }
    }
  })

  it('forwards an explicit idempotency key and rejects malformed keys before sending', async () => {
    const conversationId = '00000000-0000-4000-8000-000000000001'
    const explicitKey = 'AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAA099'
    let requestCount = 0
    let observedKey: string | null = null
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      fetch: mockFetch({
        [`POST ${BASE}/conversations/${conversationId}/turns`]: (request) => {
          requestCount++
          observedKey = request.headers.get('idempotency-key')
          return Response.json({
            turn_id: 'turn-001',
            conversation: {
              id: conversationId,
              status: 'active',
              turn_count: 1,
              updated_at: '2026-01-01T00:00:01Z',
            },
            input: { role: 'user', text: 'Hello', content: [] },
            output: [],
            tool_calls: [],
          } satisfies TurnResponse)
        },
      }),
    })

    await client.conversations.createTurn(
      conversationId,
      { message: 'Hello' },
      { idempotencyKey: explicitKey },
    )
    await expect(
      client.conversations.createTurn(
        conversationId,
        { message: 'Again' },
        { idempotencyKey: 'not-a-uuid' },
      ),
    ).rejects.toBeInstanceOf(ConfigurationError)

    expect(observedKey).toBe(explicitKey.toLowerCase())
    expect(requestCount).toBe(1)
  })

  it('forwards an explicit idempotency key on an empty greeting kickoff', async () => {
    const conversationId = '00000000-0000-4000-8000-000000000001'
    const kickoffKey = 'AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAA098'
    let observedKey: string | null = null
    let observedBody: unknown
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      fetch: mockFetch({
        [`POST ${BASE}/conversations/${conversationId}/turns`]: async (request) => {
          observedKey = request.headers.get('idempotency-key')
          observedBody = await request.json()
          return Response.json({
            turn_id: null,
            conversation: {
              id: conversationId,
              status: 'active',
              turn_count: 0,
              updated_at: '2026-01-01T00:00:01Z',
            },
            input: { role: 'user', text: '', content: [] },
            output: [],
            tool_calls: [],
          } satisfies TurnResponse)
        },
      }),
    })

    await client.conversations.createTurn(
      conversationId,
      { message: '' },
      { idempotencyKey: kickoffKey },
    )

    expect(observedKey).toBe(kickoffKey.toLowerCase())
    expect(observedBody).toEqual({ message: '' })
  })

  it('does not retry an ambiguous poll before protocol v2 is observed', async () => {
    const conversationId = '00000000-0000-4000-8000-000000000001'
    const idempotencyKey = '00000000-0000-4000-8000-000000000091'
    let requestCount = 0
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      retry: { maxAttempts: 3, baseDelayMs: 0, maxDelayMs: 0 },
      fetch: mockFetch({
        [`POST ${BASE}/conversations/${conversationId}/turns`]: () => {
          requestCount++
          throw new Error('connection reset after request')
        },
      }),
    })

    await expect(client.conversations.pollTurn(conversationId, { idempotencyKey })).rejects.toThrow(
      /connection reset after request/,
    )
    expect(requestCount).toBe(1)
  })

  it('retries protocol-v2 polls with the same key and returns a receipt-backed delivery', async () => {
    const conversationId = '00000000-0000-4000-8000-000000000001'
    const sendKey = '00000000-0000-4000-8000-000000000092'
    const pollKey = 'AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAA093'
    const normalizedPollKey = pollKey.toLowerCase()
    const delivery: TurnDelivery = {
      delivery_id: '00000000-0000-4000-8000-000000000094',
      request_id: normalizedPollKey,
      receipt: '00000000-0000-4000-8000-000000000095',
    }
    const observedPollKeys: string[] = []
    let pollCount = 0
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      retry: { maxAttempts: 2, baseDelayMs: 0, maxDelayMs: 0 },
      fetch: mockFetch({
        [`POST ${BASE}/conversations/${conversationId}/turns`]: (request) => {
          const url = new URL(request.url)
          if (url.searchParams.get('poll') !== 'true') {
            return Response.json({
              turn_id: 'turn-001',
              conversation: {
                id: conversationId,
                status: 'active',
                turn_count: 1,
                updated_at: '2026-01-01T00:00:01Z',
              },
              input: { role: 'user', text: 'Hello', content: [] },
              output: [],
              tool_calls: [],
              background_pending: true,
              delivery_protocol_version: 2,
            } satisfies TurnResponse)
          }
          pollCount++
          observedPollKeys.push(request.headers.get('idempotency-key') ?? '')
          expect(request.headers.has('x-amigo-sdk-retry-safe')).toBe(false)
          if (pollCount === 1) {
            return Response.json({ detail: 'retry' }, { status: 503 })
          }
          return Response.json({
            turn_id: 'turn-001',
            conversation: {
              id: conversationId,
              status: 'active',
              turn_count: 1,
              updated_at: '2026-01-01T00:00:02Z',
            },
            input: { role: 'user', text: '', content: [] },
            output: [{ role: 'agent', text: 'Done', content: [] }],
            tool_calls: [],
            delivery_protocol_version: 2,
            delivery,
          } satisfies TurnResponse)
        },
      }),
    })

    await client.conversations.createTurn(
      conversationId,
      { message: 'Hello' },
      { idempotencyKey: sendKey },
    )
    const response = await client.conversations.pollTurn(conversationId, {
      idempotencyKey: pollKey,
    })

    expect(observedPollKeys).toEqual([normalizedPollKey, normalizedPollKey])
    expect(response.delivery).toEqual(delivery)
    expect(response.turn_id).toBe('turn-001')
  })

  it('retries a timed-out protocol-v2 poll through scoped retry controls', async () => {
    const conversationId = '00000000-0000-4000-8000-000000000001'
    const pollKey = 'AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAA096'
    const normalizedPollKey = pollKey.toLowerCase()
    const observedPollKeys: string[] = []
    let pollCount = 0
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      retry: { maxAttempts: 2, baseDelayMs: 0, maxDelayMs: 0 },
      fetch: mockFetch({
        [`POST ${BASE}/conversations/${conversationId}/turns`]: async (request) => {
          const isPoll = new URL(request.url).searchParams.get('poll') === 'true'
          if (!isPoll) {
            return Response.json({
              turn_id: 'turn-001',
              conversation: {
                id: conversationId,
                status: 'active',
                turn_count: 1,
                updated_at: '2026-01-01T00:00:01Z',
              },
              input: { role: 'user', text: 'Hello', content: [] },
              output: [],
              tool_calls: [],
              background_pending: true,
              delivery_protocol_version: 2,
            } satisfies TurnResponse)
          }

          pollCount++
          observedPollKeys.push(request.headers.get('idempotency-key') ?? '')
          expect(request.headers.has('x-amigo-sdk-retry-safe')).toBe(false)
          if (pollCount === 1) {
            return await new Promise<Response>((_, reject) => {
              const rejectOnAbort = () => reject(request.signal.reason ?? new Error('aborted'))
              if (request.signal.aborted) {
                rejectOnAbort()
              } else {
                request.signal.addEventListener('abort', rejectOnAbort, { once: true })
              }
            })
          }

          return Response.json({
            turn_id: 'turn-001',
            conversation: {
              id: conversationId,
              status: 'active',
              turn_count: 1,
              updated_at: '2026-01-01T00:00:02Z',
            },
            input: { role: 'user', text: '', content: [] },
            output: [],
            tool_calls: [],
            background_pending: true,
            delivery_protocol_version: 2,
          } satisfies TurnResponse)
        },
      }),
    })

    await client.conversations.createTurn(
      conversationId,
      { message: 'Hello' },
      { idempotencyKey: '00000000-0000-4000-8000-000000000092' },
    )
    const response = await client.conversations
      .withOptions({ timeout: 5 })
      .pollTurn(conversationId, { idempotencyKey: pollKey })

    expect(observedPollKeys).toEqual([normalizedPollKey, normalizedPollKey])
    expect(response.delivery_protocol_version).toBe(2)
    expect(pollCount).toBe(2)
  })

  it.each([
    [
      {
        output: [{ role: 'agent', text: 'Done', content: [] }],
        delivery_protocol_version: 2,
      },
      /requires a delivery receipt/,
    ],
    [
      {
        output: [{ role: 'agent', text: 'Done', content: [] }],
        delivery_protocol_version: 2,
        delivery: {
          delivery_id: '00000000-0000-4000-8000-000000000094',
          request_id: '00000000-0000-4000-8000-000000000099',
          receipt: '00000000-0000-4000-8000-000000000095',
        },
      },
      /does not match/,
    ],
    [
      {
        output: [],
        delivery_protocol_version: 2,
        delivery: {
          delivery_id: '00000000-0000-4000-8000-000000000094',
          request_id: '00000000-0000-4000-8000-000000000093',
          receipt: '00000000-0000-4000-8000-000000000095',
        },
      },
      /requires renderable agent output/,
    ],
  ])('rejects malformed protocol-v2 poll responses %#', async (extra, expected) => {
    const conversationId = '00000000-0000-4000-8000-000000000001'
    const pollKey = '00000000-0000-4000-8000-000000000093'
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      fetch: mockFetch({
        [`POST ${BASE}/conversations/${conversationId}/turns`]: () =>
          Response.json({
            turn_id: 'turn-001',
            conversation: {
              id: conversationId,
              status: 'active',
              turn_count: 1,
              updated_at: '2026-01-01T00:00:02Z',
            },
            input: { role: 'user', text: '', content: [] },
            tool_calls: [],
            ...extra,
          }),
      }),
    })

    await expect(
      client.conversations.pollTurn(conversationId, { idempotencyKey: pollKey }),
    ).rejects.toThrow(expected)
  })

  it('revokes poll retries when a response no longer advertises protocol v2', async () => {
    const conversationId = '00000000-0000-4000-8000-000000000001'
    let requestCount = 0
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      retry: { maxAttempts: 2, baseDelayMs: 0, maxDelayMs: 0 },
      fetch: mockFetch({
        [`POST ${BASE}/conversations/${conversationId}/turns`]: (request) => {
          requestCount++
          if (requestCount === 1) {
            return Response.json({
              turn_id: 'turn-001',
              conversation: {
                id: conversationId,
                status: 'active',
                turn_count: 1,
                updated_at: '2026-01-01T00:00:01Z',
              },
              input: { role: 'user', text: 'Hello', content: [] },
              output: [],
              tool_calls: [],
              delivery_protocol_version: 2,
            } satisfies TurnResponse)
          }
          if (requestCount === 2) {
            return Response.json({
              turn_id: 'turn-001',
              conversation: {
                id: conversationId,
                status: 'active',
                turn_count: 1,
                updated_at: '2026-01-01T00:00:02Z',
              },
              input: { role: 'user', text: '', content: [] },
              output: [],
              tool_calls: [],
              delivery_protocol_version: null,
            } satisfies TurnResponse)
          }
          expect(new URL(request.url).searchParams.get('poll')).toBe('true')
          return Response.json({ detail: 'claim may have committed' }, { status: 503 })
        },
      }),
    })

    await client.conversations.createTurn(
      conversationId,
      { message: 'Hello' },
      { idempotencyKey: '00000000-0000-4000-8000-000000000081' },
    )
    const downgradedPoll = await client.conversations.pollTurn(conversationId, {
      idempotencyKey: '00000000-0000-4000-8000-000000000082',
    })
    expect(downgradedPoll).toMatchObject({ delivery_protocol_version: null, output: [] })
    await expect(
      client.conversations.pollTurn(conversationId, {
        idempotencyKey: '00000000-0000-4000-8000-000000000083',
      }),
    ).rejects.toThrow(/claim may have committed/)

    expect(requestCount).toBe(3)
  })

  it('acknowledges a rendered delivery, strips retry controls, and safely retries response loss', async () => {
    const conversationId = '00000000-0000-4000-8000-000000000001'
    const delivery: TurnDelivery = {
      delivery_id: '00000000-0000-4000-8000-000000000071',
      request_id: '00000000-0000-4000-8000-000000000072',
      receipt: '00000000-0000-4000-8000-000000000073',
    }
    const requestBodies: unknown[] = []
    let requestCount = 0
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      retry: { maxAttempts: 2, baseDelayMs: 0, maxDelayMs: 0 },
      fetch: mockFetch({
        [`POST ${BASE}/conversations/${conversationId}/turns/${delivery.delivery_id}/ack`]: async (
          request,
        ) => {
          requestCount++
          requestBodies.push(await request.json())
          expect(request.headers.has('x-amigo-sdk-retry-safe')).toBe(false)
          if (requestCount === 1) {
            throw new Error('connection reset after acknowledgement committed')
          }
          return new Response(null, { status: 204 })
        },
      }),
    })

    await client.conversations.acknowledgeTurnDelivery(conversationId, delivery)

    expect(requestCount).toBe(2)
    expect(requestBodies).toEqual([
      { request_id: delivery.request_id, receipt: delivery.receipt },
      { request_id: delivery.request_id, receipt: delivery.receipt },
    ])
  })

  it('rejects malformed delivery receipts before acknowledgement', async () => {
    let requestCount = 0
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      fetch: async () => {
        requestCount++
        return new Response(null, { status: 204 })
      },
    })

    await expect(
      client.conversations.acknowledgeTurnDelivery('00000000-0000-4000-8000-000000000001', {
        delivery_id: '00000000-0000-4000-8000-000000000071',
        request_id: '00000000-0000-4000-8000-000000000072',
        receipt: '00000000-0000-0000-0000-000000000000',
      }),
    ).rejects.toBeInstanceOf(ConfigurationError)
    expect(requestCount).toBe(0)
  })

  it('createTurn rejects poll combined with a message (fail fast, no server round-trip)', async () => {
    const conversationId = '00000000-0000-4000-8000-000000000001'
    let called = false
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      fetch: mockFetch({
        [`POST ${BASE}/conversations/${conversationId}/turns`]: () => {
          called = true
          return Response.json({})
        },
      }),
    })

    await expect(
      client.conversations.createTurn(conversationId, { message: 'book it' }, { poll: true }),
    ).rejects.toThrow(/poll cannot be combined with a message/)
    expect(called).toBe(false)
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
            lifecycle: 'active',
            turn_count: 0,
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

  it('includes tool_events=true when toolEvents is enabled', () => {
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      baseUrl: 'https://api.example.com',
    })

    const url = new URL(
      client.conversations.textStreamUrl({
        serviceId: 'svc-1',
        toolEvents: true,
      }),
    )

    expect(url.searchParams.get('tool_events')).toBe('true')
    expect([...url.searchParams.keys()]).toEqual(['workspace_id', 'service_id', 'tool_events'])
  })

  it('omits tool_events when toolEvents is false or undefined', () => {
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      baseUrl: 'https://api.example.com',
    })

    const urlFalse = new URL(
      client.conversations.textStreamUrl({ serviceId: 'svc-1', toolEvents: false }),
    )
    const urlUndefined = new URL(client.conversations.textStreamUrl({ serviceId: 'svc-1' }))

    expect(urlFalse.searchParams.has('tool_events')).toBe(false)
    expect(urlUndefined.searchParams.has('tool_events')).toBe(false)
  })

  it('places tool_events before token in query parameter order', () => {
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      baseUrl: 'https://api.example.com',
    })

    const url = new URL(
      client.conversations.textStreamUrl({
        serviceId: 'svc-1',
        conversationId: '00000000-0000-4000-8000-000000000001',
        toolEvents: true,
        token: 'test-key',
      }),
    )

    expect([...url.searchParams.keys()]).toEqual([
      'workspace_id',
      'service_id',
      'conversation_id',
      'tool_events',
      'token',
    ])
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

  it('builds a session-connect URL from the client baseUrl', () => {
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      baseUrl: 'https://api.example.com',
    })

    const url = new URL(
      client.conversations.sessionConnectUrl({
        serviceId: 'svc-1',
        entityId: '00000000-0000-4000-8000-000000000010',
        conversationId: '00000000-0000-4000-8000-000000000001',
      }),
    )

    expect(url.protocol).toBe('wss:')
    expect(url.host).toBe('api.example.com')
    expect(url.pathname).toBe(`/v1/${TEST_WORKSPACE_ID}/sessions/connect`)
    expect(url.searchParams.get('service_id')).toBe('svc-1')
    expect(url.searchParams.get('entity_id')).toBe('00000000-0000-4000-8000-000000000010')
    expect(url.searchParams.get('conversation_id')).toBe('00000000-0000-4000-8000-000000000001')
    // tool_events param is omitted on default (server defaults to true)
    expect(url.searchParams.has('tool_events')).toBe(false)
    // Query key order is deliberate so callers can assert exact URLs.
    expect([...url.searchParams.keys()]).toEqual(['service_id', 'entity_id', 'conversation_id'])
  })

  it('maps non-TLS REST base URLs to ws session-connect URLs', () => {
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      baseUrl: 'http://localhost:8000',
    })

    const url = new URL(
      client.conversations.sessionConnectUrl({ serviceId: 'svc-1', entityId: 'ent-1' }),
    )

    expect(url.protocol).toBe('ws:')
    expect(url.host).toBe('localhost:8000')
    expect(url.pathname).toBe(`/v1/${TEST_WORKSPACE_ID}/sessions/connect`)
  })

  it('emits tool_events=false only when explicitly disabled', () => {
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      baseUrl: 'https://api.example.com',
    })

    const enabled = new URL(
      client.conversations.sessionConnectUrl({ serviceId: 's', entityId: 'e', toolEvents: true }),
    )
    expect(enabled.searchParams.has('tool_events')).toBe(false)

    const disabled = new URL(
      client.conversations.sessionConnectUrl({ serviceId: 's', entityId: 'e', toolEvents: false }),
    )
    expect(disabled.searchParams.get('tool_events')).toBe('false')
  })

  it('supports preview/custom session-connect URL overrides', () => {
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      baseUrl: '/api/platform',
    })

    const url = new URL(
      client.conversations.sessionConnectUrl({
        serviceId: 'svc-1',
        entityId: 'ent-1',
        sessionConnectUrl: `wss://preview-123.platform.example.com/v1/${TEST_WORKSPACE_ID}/sessions/connect`,
      }),
    )

    expect(url.host).toBe('preview-123.platform.example.com')
    expect(url.pathname).toBe(`/v1/${TEST_WORKSPACE_ID}/sessions/connect`)
    expect(url.searchParams.get('service_id')).toBe('svc-1')
    expect(url.searchParams.get('entity_id')).toBe('ent-1')
  })

  it('rejects session-connect URL overrides with query strings or fragments', () => {
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      baseUrl: 'https://api.example.com',
    })

    expect(() =>
      client.conversations.sessionConnectUrl({
        serviceId: 'svc-1',
        entityId: 'ent-1',
        sessionConnectUrl: 'wss://example.com/v1/x/sessions/connect?leak=1',
      }),
    ).toThrow(ConfigurationError)
  })

  it('rejects relative baseUrl when no session-connect URL override is provided', () => {
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      baseUrl: '/api/platform',
    })

    expect(() =>
      client.conversations.sessionConnectUrl({ serviceId: 'svc-1', entityId: 'ent-1' }),
    ).toThrow(ConfigurationError)
  })

  it('sessionConnectAuthProtocols mirrors textStreamAuthProtocols', () => {
    expect(sessionConnectAuthProtocols(TEST_API_KEY)).toEqual(['auth', TEST_API_KEY])
    expect(() => sessionConnectAuthProtocols('')).toThrow(/apiKey is required/)
    expect(() => sessionConnectAuthProtocols('workspace:secret')).toThrow(/":"/)
  })

  // Helpers shared across the streamTurn tests.
  function sseStream(frames: string[]): ReadableStream<Uint8Array> {
    const encoder = new TextEncoder()
    return new ReadableStream({
      start(controller) {
        for (const frame of frames) controller.enqueue(encoder.encode(frame))
        controller.close()
      },
    })
  }

  it('streamTurn yields typed TurnStreamEvents end-to-end', async () => {
    // Cover every variant of the discriminated union so a future SDK regen
    // that adds a new event type breaks the exhaustive switch in the
    // consumer (per `TurnStreamEvent['event']`).
    const conversationId = '00000000-0000-4000-8000-000000000001'
    const stream = sseStream([
      'event: token\ndata: {"text":"Hello"}\n\n',
      'event: token\ndata: {"text":" "}\n\n',
      'event: token\ndata: {"text":"world"}\n\n',
      'event: thinking\ndata: {"tier":1,"tier_name":"fast"}\n\n',
      'event: tool_call_started\ndata: {"tool_name":"lookup","call_id":"call-1","input":"{}"}\n\n',
      'event: tool_call_completed\ndata: {"tool_name":"lookup","call_id":"call-1","result":"ok","succeeded":true}\n\n',
      'event: message\ndata: {"role":"agent","text":"Hello world"}\n\n',
      'event: done\ndata: {"conversation_id":"00000000-0000-4000-8000-000000000001","status":"active","turn_count":2}\n\n',
    ])
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      fetch: mockFetch({
        [`POST ${BASE}/conversations/${conversationId}/turns/stream`]: () =>
          new Response(stream, {
            headers: { 'content-type': 'text/event-stream' },
          }),
      }),
    })

    const events = []
    for await (const event of client.conversations.streamTurn(conversationId, {
      message: 'hi',
    })) {
      events.push(event)
    }

    expect(events.map((e) => e.event)).toEqual([
      'token',
      'token',
      'token',
      'thinking',
      'tool_call_started',
      'tool_call_completed',
      'message',
      'done',
    ])
    // Spot-check payloads to confirm the JSON body's fields land on the
    // typed union member alongside the discriminator.
    const tokens = events.filter((e) => e.event === 'token')
    expect(tokens.map((e) => (e as { event: 'token'; text: string }).text)).toEqual([
      'Hello',
      ' ',
      'world',
    ])
  })

  it('streamTurn forwards include_tool_calls=true on the stream URL', async () => {
    const conversationId = '00000000-0000-4000-8000-000000000001'
    let requestUrl: string | undefined
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      fetch: mockFetch({
        [`POST ${BASE}/conversations/${conversationId}/turns/stream`]: (req) => {
          requestUrl = req.url
          return new Response(
            sseStream([
              'event: done\ndata: {"conversation_id":"x","status":"active","turn_count":1}\n\n',
            ]),
            {
              headers: { 'content-type': 'text/event-stream' },
            },
          )
        },
      }),
    })

    // Drain the generator so the underlying request is issued and the URL
    // captured by the mock fetch above. We don't read the events themselves —
    // the assertion is on the request URL's `include_tool_calls` query param.
    for await (const _ of client.conversations.streamTurn(
      conversationId,
      { message: 'hi' },
      { includeToolCalls: true },
    )) {
      void _
    }

    expect(requestUrl).toBeDefined()
    expect(new URL(requestUrl as string).searchParams.get('include_tool_calls')).toBe('true')
  })

  it('streamTurn forwards a stable idempotency key', async () => {
    const conversationId = '00000000-0000-4000-8000-000000000001'
    const idempotencyKey = 'AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAA061'
    let observedKey: string | null = null
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      fetch: mockFetch({
        [`POST ${BASE}/conversations/${conversationId}/turns/stream`]: (request) => {
          observedKey = request.headers.get('idempotency-key')
          return new Response(
            sseStream([
              'event: done\ndata: {"conversation_id":"x","status":"active","turn_count":1}\n\n',
            ]),
            { headers: { 'content-type': 'text/event-stream' } },
          )
        },
      }),
    })

    for await (const event of client.conversations.streamTurn(
      conversationId,
      { message: 'hi' },
      { idempotencyKey },
    )) {
      void event
    }

    expect(observedKey).toBe(idempotencyKey.toLowerCase())
  })

  it('remembers protocol v2 from a stream done frame for retry-safe polling', async () => {
    const conversationId = '00000000-0000-4000-8000-000000000001'
    const pollKey = '00000000-0000-4000-8000-000000000062'
    let pollCount = 0
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      retry: { maxAttempts: 2, baseDelayMs: 0, maxDelayMs: 0 },
      fetch: mockFetch({
        [`POST ${BASE}/conversations/${conversationId}/turns/stream`]: () =>
          new Response(
            sseStream([
              `event: done\ndata: {"conversation_id":"${conversationId}","status":"active","turn_count":1,"background_pending":true,"delivery_protocol_version":2}\n\n`,
            ]),
            { headers: { 'content-type': 'text/event-stream' } },
          ),
        [`POST ${BASE}/conversations/${conversationId}/turns`]: () => {
          pollCount++
          if (pollCount === 1) {
            return Response.json({ detail: 'retry the same claim' }, { status: 503 })
          }
          return Response.json({
            turn_id: 'turn-001',
            conversation: {
              id: conversationId,
              status: 'active',
              turn_count: 1,
              updated_at: '2026-01-01T00:00:02Z',
            },
            input: { role: 'user', text: '', content: [] },
            output: [],
            tool_calls: [],
            background_pending: true,
            delivery_protocol_version: 2,
          } satisfies TurnResponse)
        },
      }),
    })

    for await (const event of client.conversations.streamTurn(conversationId, {
      message: 'hi',
    })) {
      void event
    }
    await client.conversations.pollTurn(conversationId, { idempotencyKey: pollKey })

    expect(pollCount).toBe(2)
  })

  it('streamTurn drops malformed and unknown frames silently', async () => {
    const conversationId = '00000000-0000-4000-8000-000000000001'
    const stream = sseStream([
      // Unknown event discriminator — drift-tolerant skip.
      'event: future_variant\ndata: {"foo":"bar"}\n\n',
      // Bad JSON — drop, do not throw.
      'event: token\ndata: not-json\n\n',
      // No `data:` field — drop.
      'event: token\n\n',
      // Comment line is ignored, valid frame after.
      ': keep-alive\nevent: token\ndata: {"text":"ok"}\n\n',
    ])
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      fetch: mockFetch({
        [`POST ${BASE}/conversations/${conversationId}/turns/stream`]: () =>
          new Response(stream, {
            headers: { 'content-type': 'text/event-stream' },
          }),
      }),
    })

    const events = []
    for await (const event of client.conversations.streamTurn(conversationId, {
      message: 'hi',
    })) {
      events.push(event)
    }

    // Only the well-formed token frame survives.
    expect(events).toHaveLength(1)
    expect(events[0]?.event).toBe('token')
  })

  it('streamTurn surfaces the structured error frame with code + retryable', async () => {
    const conversationId = '00000000-0000-4000-8000-000000000001'
    // platform-api emits this exact shape on upstream failure.
    const stream = sseStream([
      'event: error\ndata: {"code":"upstream_error","message":"agent unreachable","status_code":503,"retryable":true}\n\n',
    ])
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      fetch: mockFetch({
        [`POST ${BASE}/conversations/${conversationId}/turns/stream`]: () =>
          new Response(stream, {
            headers: { 'content-type': 'text/event-stream' },
          }),
      }),
    })

    const events = []
    for await (const event of client.conversations.streamTurn(conversationId, {
      message: 'hi',
    })) {
      events.push(event)
    }

    expect(events).toHaveLength(1)
    const event = events[0]!
    expect(event.event).toBe('error')
    if (event.event === 'error') {
      // PR #152 regenerated openapi types dropped these fields from the
      // SDK-typed shape; the wire format still carries them on real upstream
      // failures. Cast to access the parsed-but-untyped properties.
      const wire = event as typeof event & {
        code?: string
        retryable?: boolean
        status_code?: number
      }
      expect(wire.code).toBe('upstream_error')
      expect(wire.retryable).toBe(true)
      expect(wire.status_code).toBe(503)
      expect(event.message).toBe('agent unreachable')
    }
  })

  it('streamTurn defaults code/retryable for legacy error frames', async () => {
    // Old platform-api versions emit only ``message``. The SDK's openapi
    // schema gives ``code`` a default of "unknown" and ``retryable`` a
    // default of false. Those defaults are static-type defaults; on the
    // wire the fields are simply absent and pass through the parser.
    const conversationId = '00000000-0000-4000-8000-000000000001'
    const stream = sseStream(['event: error\ndata: {"message":"legacy"}\n\n'])
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      fetch: mockFetch({
        [`POST ${BASE}/conversations/${conversationId}/turns/stream`]: () =>
          new Response(stream, {
            headers: { 'content-type': 'text/event-stream' },
          }),
      }),
    })

    const events = []
    for await (const event of client.conversations.streamTurn(conversationId, {
      message: 'hi',
    })) {
      events.push(event)
    }

    expect(events).toHaveLength(1)
    const event = events[0]!
    expect(event.event).toBe('error')
    if (event.event === 'error') {
      expect(event.message).toBe('legacy')
      // code/retryable absent on legacy frames; consumers must defensively
      // ?? them. Asserting the underlying shape rather than a default-
      // injected value keeps the contract honest. Cast since PR #152 dropped
      // these fields from the typed shape.
      const wire = event as typeof event & {
        code?: string
        retryable?: boolean
      }
      expect(wire.code).toBeUndefined()
      expect(wire.retryable).toBeUndefined()
    }
  })

  it('streamTurn parses frames split across chunk boundaries', async () => {
    // Real streams arrive in network-sized chunks that often split a frame
    // mid-data. The internal buffer must concatenate decoded text until a
    // blank-line terminator before yielding.
    const conversationId = '00000000-0000-4000-8000-000000000001'
    const stream = sseStream([
      'event: tok',
      'en\ndata: {"te',
      'xt":"streamed"}\n\n',
      'event: done\nda',
      'ta: {"conversation_id":"x","status":"active","turn_count":1}\n\n',
    ])
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      fetch: mockFetch({
        [`POST ${BASE}/conversations/${conversationId}/turns/stream`]: () =>
          new Response(stream, {
            headers: { 'content-type': 'text/event-stream' },
          }),
      }),
    })

    const events = []
    for await (const event of client.conversations.streamTurn(conversationId, {
      message: 'hi',
    })) {
      events.push(event)
    }

    expect(events).toHaveLength(2)
    expect(events[0]).toMatchObject({ event: 'token', text: 'streamed' })
    expect(events[1]).toMatchObject({ event: 'done', conversation_id: 'x' })
  })
})
