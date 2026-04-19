import { describe, it, expect } from 'vitest'
import { createPlatformClient } from '../../src/core/openapi-client.js'
import { OperatorsResource } from '../../src/resources/operators.js'
import { NotFoundError } from '../../src/core/errors.js'

const TEST_API_KEY = 'test-api-key-abc123'
const TEST_WORKSPACE_ID = 'ws-00000000-0000-0000-0000-000000000001'

const OPERATOR_ID = 'op-00000000-0000-0000-0000-000000000001'
const CALL_SID = 'CA1234567890abcdef1234567890abcdef'

const OPERATOR_FIXTURE = {
  id: OPERATOR_ID,
  workspace_id: TEST_WORKSPACE_ID,
  name: 'Dr. Smith',
  email: 'smith@clinic.example.com',
  role: 'physician',
  status: 'available',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

const DASHBOARD_FIXTURE = {
  total_operators: 12,
  available: 8,
  on_call: 3,
  offline: 1,
  active_escalations: 2,
  avg_response_time_seconds: 45,
}

const JOIN_CALL_FIXTURE = {
  operator_id: OPERATOR_ID,
  call_sid: CALL_SID,
  status: 'connected',
  joined_at: '2026-01-15T10:32:00Z',
}

function mockFetch(routes: Record<string, () => Response | Promise<Response>>): typeof globalThis.fetch {
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
    return new Response(JSON.stringify({ detail: `No mock for ${method} ${pathname}` }), { status: 500 })
  }
}

const BASE = `/v1/${TEST_WORKSPACE_ID}`

const platformClient = createPlatformClient({
  apiKey: TEST_API_KEY,
  baseUrl: 'https://api.platform.amigo.ai',
  fetch: mockFetch({
    [`GET ${BASE}/operators`]: () =>
      Response.json({ items: [OPERATOR_FIXTURE], has_more: false, continuation_token: null }),

    [`POST ${BASE}/operators`]: () =>
      Response.json(OPERATOR_FIXTURE, { status: 201 }),

    [`GET ${BASE}/operators/${OPERATOR_ID}`]: () =>
      Response.json(OPERATOR_FIXTURE),

    [`GET ${BASE}/operators/not-found`]: () =>
      Response.json({ detail: 'Operator not found', error_code: 'not_found' }, { status: 404 }),

    [`GET ${BASE}/operators/dashboard`]: () =>
      Response.json(DASHBOARD_FIXTURE),

    [`GET ${BASE}/operators/queue`]: () =>
      Response.json({ queue: [{ call_sid: CALL_SID, priority: 'high', wait_seconds: 30 }] }),

    [`POST ${BASE}/operators/${OPERATOR_ID}/join-call`]: () =>
      Response.json(JOIN_CALL_FIXTURE),

    [`POST ${BASE}/operators/${OPERATOR_ID}/leave-call`]: () =>
      Response.json({ operator_id: OPERATOR_ID, call_sid: CALL_SID, status: 'disconnected' }),

    [`POST ${BASE}/operators/${OPERATOR_ID}/access-token`]: () =>
      Response.json({ token: 'eyJhbGciOiJSUzI1NiJ9.test', expires_in: 3600 }),

    [`GET ${BASE}/operators/escalations`]: () =>
      Response.json({ items: [], has_more: false, continuation_token: null }),

    [`GET ${BASE}/operators/escalations/active`]: () =>
      Response.json({ escalations: [] }),
  }),
})

const operators = new OperatorsResource(platformClient, TEST_WORKSPACE_ID)

describe('OperatorsResource', () => {
  it('lists operators', async () => {
    const result = await operators.list()
    expect(result.items).toHaveLength(1)
    expect(result.items[0]?.name).toBe('Dr. Smith')
  })

  it('creates an operator', async () => {
    const result = await operators.create({
      name: 'Dr. Smith',
      email: 'smith@clinic.example.com',
    } as never)
    expect(result.id).toBe(OPERATOR_ID)
    expect(result.name).toBe('Dr. Smith')
  })

  it('gets an operator by id', async () => {
    const result = await operators.get(OPERATOR_ID)
    expect(result.id).toBe(OPERATOR_ID)
    expect(result.status).toBe('available')
  })

  it('throws NotFoundError for missing operator', async () => {
    await expect(operators.get('not-found')).rejects.toThrow(NotFoundError)
  })

  it('gets the operator dashboard', async () => {
    const result = await operators.getDashboard()
    expect(result.total_operators).toBe(12)
    expect(result.available).toBe(8)
    expect(result.active_escalations).toBe(2)
  })

  it('gets the operator queue', async () => {
    const result = await operators.getQueue()
    expect(result.queue).toHaveLength(1)
    expect(result.queue[0]?.priority).toBe('high')
  })

  it('joins a call', async () => {
    const result = await operators.joinCall(OPERATOR_ID, { call_sid: CALL_SID } as never)
    expect(result.status).toBe('connected')
    expect(result.call_sid).toBe(CALL_SID)
  })

  it('gets an access token', async () => {
    const result = await operators.getAccessToken(OPERATOR_ID, { scope: 'operator' } as never)
    expect(result.token).toContain('eyJ')
    expect(result.expires_in).toBe(3600)
  })

  it('lists escalations', async () => {
    const result = await operators.getEscalations()
    expect(result.items).toHaveLength(0)
  })

  it('gets active escalations', async () => {
    const result = await operators.getActiveEscalations()
    expect(result.escalations).toHaveLength(0)
  })
})
