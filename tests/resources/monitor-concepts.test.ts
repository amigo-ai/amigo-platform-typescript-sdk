import { describe, it, expect } from 'vitest'
import { AmigoClient } from '../../src/index.js'

const TEST_API_KEY = 'test-api-key'
const TEST_WORKSPACE_ID = 'ws-00000000-0000-0000-0000-000000000001'
const CONCEPT_ID = 'mc-00000000-0000-0000-0000-000000000001'
const BASE = `/v1/${TEST_WORKSPACE_ID}`

const FIXTURE = {
  id: CONCEPT_ID,
  workspace_id: TEST_WORKSPACE_ID,
  name: 'Refill request',
  description: 'Caller asks for a prescription refill',
  status: 'enabled',
  rules: [],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

function mockFetch(routes: Record<string, () => Response>): typeof globalThis.fetch {
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
    return new Response(JSON.stringify({ detail: 'no mock' }), { status: 500 })
  }
}

const client = new AmigoClient({
  apiKey: TEST_API_KEY,
  workspaceId: TEST_WORKSPACE_ID,
  fetch: mockFetch({
    [`POST ${BASE}/monitor-concepts`]: () => Response.json(FIXTURE, { status: 201 }),
    [`GET ${BASE}/monitor-concepts`]: () =>
      Response.json({ items: [FIXTURE], has_more: false, continuation_token: null }),
    [`GET ${BASE}/monitor-concepts/${CONCEPT_ID}`]: () => Response.json(FIXTURE),
    [`PATCH ${BASE}/monitor-concepts/${CONCEPT_ID}`]: () => Response.json(FIXTURE),
    [`DELETE ${BASE}/monitor-concepts/${CONCEPT_ID}`]: () => new Response(null, { status: 204 }),
  }),
})

describe('MonitorConceptsResource', () => {
  it('creates a concept', async () => {
    const created = await client.monitorConcepts.create({
      name: FIXTURE.name,
      description: FIXTURE.description,
    } as Parameters<typeof client.monitorConcepts.create>[0])
    expect(created?.id).toBe(CONCEPT_ID)
  })

  it('lists concepts', async () => {
    const page = await client.monitorConcepts.list({ search: 'refill' })
    expect(page?.items?.[0]?.id).toBe(CONCEPT_ID)
  })

  it('gets a concept by id', async () => {
    const concept = await client.monitorConcepts.get(CONCEPT_ID)
    expect(concept?.id).toBe(CONCEPT_ID)
  })

  it('updates a concept', async () => {
    const updated = await client.monitorConcepts.update(CONCEPT_ID, {
      description: 'Updated',
    } as Parameters<typeof client.monitorConcepts.update>[1])
    expect(updated?.id).toBe(CONCEPT_ID)
  })

  it('deletes a concept', async () => {
    await expect(client.monitorConcepts.delete(CONCEPT_ID)).resolves.toBeUndefined()
  })
})
