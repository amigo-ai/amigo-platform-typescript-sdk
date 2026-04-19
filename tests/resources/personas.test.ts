import { describe, it, expect } from 'vitest'
import { AmigoClient } from '../../src/index.js'
import { NotFoundError } from '../../src/core/errors.js'

const TEST_API_KEY = 'test-api-key-abc123'
const TEST_WORKSPACE_ID = 'ws-00000000-0000-0000-0000-000000000001'

const PERSONA_ID = 'per-00000000-0000-0000-0000-000000000001'

const PERSONA_FIXTURE = {
  id: PERSONA_ID,
  workspace_id: TEST_WORKSPACE_ID,
  name: 'Friendly Receptionist',
  description: 'A warm and welcoming front-desk persona',
  voice: 'alloy',
  tone: 'warm',
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
    [`GET ${BASE}/personas`]: () =>
      Response.json({ items: [PERSONA_FIXTURE], has_more: false, continuation_token: null }),

    [`POST ${BASE}/personas`]: () =>
      Response.json(PERSONA_FIXTURE, { status: 201 }),

    [`GET ${BASE}/personas/${PERSONA_ID}`]: () =>
      Response.json(PERSONA_FIXTURE),

    [`GET ${BASE}/personas/not-found`]: () =>
      Response.json({ detail: 'Persona not found', error_code: 'not_found' }, { status: 404 }),

    [`PATCH ${BASE}/personas/${PERSONA_ID}`]: () =>
      Response.json({ ...PERSONA_FIXTURE, name: 'Updated Persona' }),

    [`DELETE ${BASE}/personas/${PERSONA_ID}`]: () =>
      new Response(null, { status: 204 }),
  }),
})

describe('PersonasResource', () => {
  it('lists personas', async () => {
    const result = await client.personas.list()
    expect(result.items).toHaveLength(1)
    expect(result.items[0]?.name).toBe('Friendly Receptionist')
  })

  it('creates a persona', async () => {
    const result = await client.personas.create({
      name: 'Friendly Receptionist',
      description: 'A warm and welcoming front-desk persona',
    } as never)
    expect(result.id).toBe(PERSONA_ID)
    expect(result.name).toBe('Friendly Receptionist')
  })

  it('gets a persona by id', async () => {
    const result = await client.personas.get(PERSONA_ID)
    expect(result.id).toBe(PERSONA_ID)
    expect(result.voice).toBe('alloy')
  })

  it('throws NotFoundError for missing persona', async () => {
    await expect(client.personas.get('not-found')).rejects.toThrow(NotFoundError)
  })

  it('updates a persona', async () => {
    const result = await client.personas.update(PERSONA_ID, {
      name: 'Updated Persona',
    } as never)
    expect(result.name).toBe('Updated Persona')
  })

  it('deletes a persona', async () => {
    await expect(client.personas.delete(PERSONA_ID)).resolves.toBeUndefined()
  })
})
