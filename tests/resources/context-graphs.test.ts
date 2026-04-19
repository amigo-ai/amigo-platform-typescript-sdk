import { describe, it, expect } from 'vitest'
import { AmigoClient } from '../../src/index.js'
import { NotFoundError } from '../../src/core/errors.js'

const TEST_API_KEY = 'test-api-key-abc123'
const TEST_WORKSPACE_ID = 'ws-00000000-0000-0000-0000-000000000001'

const GRAPH_ID = 'cg-00000000-0000-0000-0000-000000000001'

const GRAPH_FIXTURE = {
  id: GRAPH_ID,
  workspace_id: TEST_WORKSPACE_ID,
  name: 'Appointment Scheduling',
  description: 'Handles appointment booking flow',
  states: {
    greeting: { transitions: [{ target: 'collect_info', condition: 'patient_identified' }] },
    collect_info: { transitions: [{ target: 'confirm', condition: 'info_complete' }] },
    confirm: { transitions: [] },
  },
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

const VERSION_FIXTURE = {
  id: 'cgv-00000000-0000-0000-0000-000000000001',
  context_graph_id: GRAPH_ID,
  version: 1,
  name: 'Appointment Scheduling',
  states: GRAPH_FIXTURE.states,
  created_at: '2026-01-01T00:00:00Z',
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
    [`GET ${BASE}/context-graphs`]: () =>
      Response.json({ items: [GRAPH_FIXTURE], has_more: false, continuation_token: null }),

    [`POST ${BASE}/context-graphs`]: () =>
      Response.json(GRAPH_FIXTURE, { status: 201 }),

    [`GET ${BASE}/context-graphs/${GRAPH_ID}`]: () =>
      Response.json(GRAPH_FIXTURE),

    [`GET ${BASE}/context-graphs/not-found`]: () =>
      Response.json({ detail: 'Context graph not found', error_code: 'not_found' }, { status: 404 }),

    [`PUT ${BASE}/context-graphs/${GRAPH_ID}`]: () =>
      Response.json({ ...GRAPH_FIXTURE, name: 'Updated Graph' }),

    [`DELETE ${BASE}/context-graphs/${GRAPH_ID}`]: () =>
      new Response(null, { status: 204 }),

    [`POST ${BASE}/context-graphs/${GRAPH_ID}/versions`]: () =>
      Response.json(VERSION_FIXTURE, { status: 201 }),

    [`GET ${BASE}/context-graphs/${GRAPH_ID}/versions`]: () =>
      Response.json({ items: [VERSION_FIXTURE], has_more: false, continuation_token: null }),

    [`GET ${BASE}/context-graphs/${GRAPH_ID}/versions/1`]: () =>
      Response.json(VERSION_FIXTURE),

    [`GET ${BASE}/context-graphs/${GRAPH_ID}/versions/latest`]: () =>
      Response.json(VERSION_FIXTURE),
  }),
})

describe('ContextGraphsResource', () => {
  it('lists context graphs', async () => {
    const result = await client.contextGraphs.list()
    expect(result.items).toHaveLength(1)
    expect(result.items[0]?.name).toBe('Appointment Scheduling')
  })

  it('creates a context graph', async () => {
    const result = await client.contextGraphs.create({
      name: 'Appointment Scheduling',
    } as never)
    expect(result.id).toBe(GRAPH_ID)
    expect(result.name).toBe('Appointment Scheduling')
  })

  it('gets a context graph by id', async () => {
    const result = await client.contextGraphs.get(GRAPH_ID)
    expect(result.id).toBe(GRAPH_ID)
    // @ts-expect-error fixture field
    expect(result.states).toBeDefined()
  })

  it('throws NotFoundError for missing context graph', async () => {
    await expect(client.contextGraphs.get('not-found')).rejects.toThrow(NotFoundError)
  })

  it('updates a context graph', async () => {
    const result = await client.contextGraphs.update(GRAPH_ID, { name: 'Updated Graph' } as never)
    expect(result.name).toBe('Updated Graph')
  })

  it('deletes a context graph', async () => {
    await expect(client.contextGraphs.delete(GRAPH_ID)).resolves.toBeUndefined()
  })

  it('creates a version', async () => {
    const result = await client.contextGraphs.createVersion(GRAPH_ID, {} as never)
    expect(result.version).toBe(1)
    expect(result.context_graph_id).toBe(GRAPH_ID)
  })

  it('lists versions', async () => {
    const result = await client.contextGraphs.listVersions(GRAPH_ID)
    expect(result.items).toHaveLength(1)
    expect(result.items[0]?.version).toBe(1)
  })

  it('gets a specific version by number', async () => {
    const result = await client.contextGraphs.getVersion(GRAPH_ID, 1)
    expect(result.version).toBe(1)
  })

  it('gets the latest version', async () => {
    const result = await client.contextGraphs.getVersion(GRAPH_ID, 'latest')
    expect(result.version).toBe(1)
    expect(result.context_graph_id).toBe(GRAPH_ID)
  })
})
