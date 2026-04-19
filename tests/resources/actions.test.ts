import { describe, it, expect } from 'vitest'
import { AmigoClient } from '../../src/index.js'
import { NotFoundError } from '../../src/core/errors.js'

const TEST_API_KEY = 'test-api-key-abc123'
const TEST_WORKSPACE_ID = 'ws-00000000-0000-0000-0000-000000000001'

const ACTION_ID = 'skill-00000000-0000-0000-0000-000000000001'

const ACTION_FIXTURE = {
  id: ACTION_ID,
  workspace_id: TEST_WORKSPACE_ID,
  name: 'Appointment Lookup',
  description: 'Look up patient appointments in the scheduling system',
  execution_tier: 'T2',
  enabled: true,
  input_schema: {
    type: 'object',
    properties: {
      patient_id: { type: 'string' },
      date_range: { type: 'string' },
    },
    required: ['patient_id'],
  },
  output_schema: {
    type: 'object',
    properties: {
      appointments: { type: 'array' },
    },
  },
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

const TEST_RESULT_FIXTURE = {
  result: 'Appointment found for 2026-02-01',
  duration_ms: 245,
  rounds: 1,
  input_tokens: 100,
  output_tokens: 50,
  cached_tokens: 0,
  sub_tool_logs: [],
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
    [`POST ${BASE}/skills`]: () =>
      Response.json(ACTION_FIXTURE, { status: 201 }),

    [`GET ${BASE}/skills`]: () =>
      Response.json({ items: [ACTION_FIXTURE], has_more: false, continuation_token: null }),

    [`GET ${BASE}/skills/${ACTION_ID}`]: () =>
      Response.json(ACTION_FIXTURE),

    [`GET ${BASE}/skills/not-found`]: () =>
      Response.json({ detail: 'Skill not found', error_code: 'not_found' }, { status: 404 }),

    [`PUT ${BASE}/skills/${ACTION_ID}`]: () =>
      Response.json({ ...ACTION_FIXTURE, name: 'Updated Action', enabled: false }),

    [`DELETE ${BASE}/skills/${ACTION_ID}`]: () =>
      new Response(null, { status: 204 }),

    [`POST ${BASE}/skills/${ACTION_ID}/test`]: () =>
      Response.json(TEST_RESULT_FIXTURE),
  }),
})

describe('ActionsResource', () => {
  it('creates an action', async () => {
    const result = await client.actions.create({
      name: 'Appointment Lookup',
      description: 'Look up patient appointments',
      execution_tier: 'T2',
    } as never)
    expect(result.id).toBe(ACTION_ID)
    expect(result.name).toBe('Appointment Lookup')
  })

  it('lists actions', async () => {
    const result = await client.actions.list()
    expect(result.items).toHaveLength(1)
    expect(result.items[0]?.name).toBe('Appointment Lookup')
    expect(result.has_more).toBe(false)
  })

  it('gets an action by id', async () => {
    const result = await client.actions.get(ACTION_ID)
    expect(result.id).toBe(ACTION_ID)
    expect(result.execution_tier).toBe('T2')
  })

  it('throws NotFoundError for missing action', async () => {
    await expect(client.actions.get('not-found')).rejects.toThrow(NotFoundError)
  })

  it('updates an action', async () => {
    const result = await client.actions.update(ACTION_ID, { name: 'Updated Action', enabled: false } as never)
    expect(result.name).toBe('Updated Action')
    expect(result.enabled).toBe(false)
  })

  it('deletes an action', async () => {
    await expect(client.actions.delete(ACTION_ID)).resolves.toBeUndefined()
  })

  it('tests an action with sample input', async () => {
    const result = await client.actions.test(ACTION_ID, {
      input: { patient_id: 'pat-001' },
    } as never)
    expect(result.result).toBe('Appointment found for 2026-02-01')
    expect(result.duration_ms).toBe(245)
  })
})
