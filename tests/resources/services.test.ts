import { describe, it, expect } from 'vitest'
import { AmigoClient } from '../../src/index.js'
import { NotFoundError } from '../../src/core/errors.js'

const TEST_API_KEY = 'test-api-key-abc123'
const TEST_WORKSPACE_ID = 'ws-00000000-0000-0000-0000-000000000001'

const SERVICE_ID = 'svc-00000000-0000-0000-0000-000000000001'

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
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
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

const client = new AmigoClient({
  apiKey: TEST_API_KEY,
  workspaceId: TEST_WORKSPACE_ID,
  fetch: mockFetch({
    [`POST ${BASE}/services`]: () =>
      Response.json(SERVICE_FIXTURE, { status: 201 }),

    [`GET ${BASE}/services`]: () =>
      Response.json({ items: [SERVICE_FIXTURE], has_more: false, continuation_token: null }),

    [`GET ${BASE}/services/${SERVICE_ID}`]: () =>
      Response.json(SERVICE_FIXTURE),

    [`GET ${BASE}/services/not-found`]: () =>
      Response.json({ detail: 'Service not found', error_code: 'not_found' }, { status: 404 }),

    [`PUT ${BASE}/services/${SERVICE_ID}`]: () =>
      Response.json({ ...SERVICE_FIXTURE, name: 'Updated Service', is_active: false }),

    [`DELETE ${BASE}/services/${SERVICE_ID}`]: () =>
      new Response(null, { status: 204 }),
  }),
})

describe('ServicesResource', () => {
  it('creates a service', async () => {
    const result = await client.services.create({
      name: 'Scheduling Service',
      channel_type: 'voice',
    } as never)
    expect(result.id).toBe(SERVICE_ID)
    expect(result.name).toBe('Scheduling Service')
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
    const result = await client.services.update(SERVICE_ID, { name: 'Updated Service', is_active: false } as never)
    expect(result.name).toBe('Updated Service')
    expect(result.is_active).toBe(false)
  })

  it('deletes a service', async () => {
    await expect(client.services.delete(SERVICE_ID)).resolves.toBeUndefined()
  })
})
