import { describe, expect, it, vi, expectTypeOf } from 'vitest'
import { AmigoClient } from '../../src/index.js'
import type { components } from '../../src/generated/api.js'
import { TEST_API_KEY, fixtures } from '../test-helpers.js'

describe('AmigoClient.defineRoute()', () => {
  it('binds a GET route literal and dispatches with workspace auto-injection', async () => {
    const mockFetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const request = input instanceof Request ? input : new Request(input, init)
      // workspace_id is auto-injected from the AmigoClient config
      expect(request.url).toBe('https://api.example.com/v1/ws-001/agents?limit=5')
      return Response.json(fixtures.paginatedList([fixtures.agent()]))
    })

    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: 'ws-001',
      baseUrl: 'https://api.example.com',
      fetch: mockFetch as typeof fetch,
    })

    const listAgents = client.defineRoute('GET', '/v1/{workspace_id}/agents')
    const result = await listAgents({ params: { query: { limit: 5 } } })

    expect(mockFetch).toHaveBeenCalledOnce()
    expect(result.data?.items).toHaveLength(1)
  })

  it('binds a route with multi-segment path params', async () => {
    const mockFetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const request = input instanceof Request ? input : new Request(input, init)
      expect(request.url).toBe('https://api.example.com/v1/ws-001/calls/call-xyz')
      return Response.json({
        id: 'call-xyz',
        status: 'completed',
      })
    })

    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: 'ws-001',
      baseUrl: 'https://api.example.com',
      fetch: mockFetch as typeof fetch,
    })

    const getCall = client.defineRoute('GET', '/v1/{workspace_id}/calls/{call_id}')
    const result = await getCall({ params: { path: { call_id: 'call-xyz' } } })

    expect(mockFetch).toHaveBeenCalledOnce()
    expect(result.data).toBeDefined()
  })

  it('preserves a typed POST route', async () => {
    const mockFetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const request = input instanceof Request ? input : new Request(input, init)
      expect(request.url).toBe('https://api.example.com/v1/ws-001/agents')
      expect(request.method).toBe('POST')
      const body = (await request.json()) as { name: string }
      expect(body.name).toBe('My Agent')
      return Response.json(fixtures.agent(), { status: 201 })
    })

    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: 'ws-001',
      baseUrl: 'https://api.example.com',
      fetch: mockFetch as typeof fetch,
    })

    const createAgent = client.defineRoute('POST', '/v1/{workspace_id}/agents')
    const result = await createAgent({
      body: { name: 'My Agent', description: 'desc' },
    })

    expect(result.data?.id).toBeDefined()
  })

  it('routes work after being passed across modules / functions', async () => {
    const mockFetch = vi.fn(async () => Response.json(fixtures.paginatedList([fixtures.agent()])))

    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: 'ws-001',
      baseUrl: 'https://api.example.com',
      fetch: mockFetch as typeof fetch,
    })

    const listAgents = client.defineRoute('GET', '/v1/{workspace_id}/agents')
    // Simulate handing the bound route to a helper or module
    const wrapper = async (
      route: (init?: { params?: { query?: { limit?: number } } }) => Promise<unknown>,
    ) => route({ params: { query: { limit: 10 } } })

    const result = (await wrapper(listAgents as never)) as { data?: { items?: unknown[] } }
    expect(result.data?.items).toHaveLength(1)
  })
})

// --- Type-level assertions ---

describe('AmigoClient.defineRoute() — type inference', () => {
  it('GET return type carries the path operation data shape', () => {
    const client = new AmigoClient({ apiKey: 'k', workspaceId: 'ws' })

    const getCall = client.defineRoute('GET', '/v1/{workspace_id}/calls/{call_id}')
    expectTypeOf(getCall).toBeFunction()
    type GetCallReturn = Awaited<ReturnType<typeof getCall>>
    type GetCallData = NonNullable<GetCallReturn['data']>

    // The inferred .data is the success-response schema. We assert one
    // representative field is present and typed — drift in the schema would
    // break compilation here.
    expectTypeOf<GetCallData>().toHaveProperty('id')
    expectTypeOf<GetCallData>().toHaveProperty('workspace_id')
    type IdField = GetCallData['id']
    type CallDetail = components['schemas']['CallDetailResponse']
    type CallDetailIdField = CallDetail['id']
    expectTypeOf<IdField>().toEqualTypeOf<CallDetailIdField>()
  })

  it('POST return type carries the response schema shape', () => {
    const client = new AmigoClient({ apiKey: 'k', workspaceId: 'ws' })

    const createAgent = client.defineRoute('POST', '/v1/{workspace_id}/agents')
    expectTypeOf(createAgent).toBeFunction()
    type CreateAgentReturn = Awaited<ReturnType<typeof createAgent>>
    type CreateAgentData = NonNullable<CreateAgentReturn['data']>

    expectTypeOf<CreateAgentData>().toHaveProperty('id')
    expectTypeOf<CreateAgentData>().toHaveProperty('name')
    type AgentResp = components['schemas']['AgentResponse']
    type CreateNameField = CreateAgentData['name']
    type AgentRespNameField = AgentResp['name']
    expectTypeOf<CreateNameField>().toEqualTypeOf<AgentRespNameField>()
  })

  it('rejects non-literal path strings at compile time', () => {
    const client = new AmigoClient({ apiKey: 'k', workspaceId: 'ws' })
    const path: string = '/v1/{workspace_id}/agents'
    // @ts-expect-error — a `string` (non-literal) is not assignable to PathForMethod<'get'>
    client.defineRoute('GET', path)
  })

  it('rejects unknown HTTP methods at compile time', () => {
    const client = new AmigoClient({ apiKey: 'k', workspaceId: 'ws' })
    // @ts-expect-error — TRACE is not in the public method union for defineRoute
    client.defineRoute('TRACE', '/v1/{workspace_id}/agents')
  })

  it('rejects path/method mismatches at compile time', () => {
    const client = new AmigoClient({ apiKey: 'k', workspaceId: 'ws' })
    // @ts-expect-error — calls list endpoint has no DELETE method
    client.defineRoute('DELETE', '/v1/{workspace_id}/calls')
  })
})
