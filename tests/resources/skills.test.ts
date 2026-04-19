import { describe, it, expect } from 'vitest'
import { AmigoClient } from '../../src/index.js'
import { NotFoundError } from '../../src/core/errors.js'

const TEST_API_KEY = 'test-api-key-abc123'
const TEST_WORKSPACE_ID = 'ws-00000000-0000-0000-0000-000000000001'

const SKILL_ID = 'skill-00000000-0000-0000-0000-000000000001'

const SKILL_FIXTURE = {
  id: SKILL_ID,
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
  skill_id: SKILL_ID,
  status: 'success',
  output: { appointments: [{ id: 'appt-001', date: '2026-02-01', type: 'follow-up' }] },
  duration_ms: 245,
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
      Response.json(SKILL_FIXTURE, { status: 201 }),

    [`GET ${BASE}/skills`]: () =>
      Response.json({ items: [SKILL_FIXTURE], has_more: false, continuation_token: null }),

    [`GET ${BASE}/skills/${SKILL_ID}`]: () =>
      Response.json(SKILL_FIXTURE),

    [`GET ${BASE}/skills/not-found`]: () =>
      Response.json({ detail: 'Skill not found', error_code: 'not_found' }, { status: 404 }),

    [`PUT ${BASE}/skills/${SKILL_ID}`]: () =>
      Response.json({ ...SKILL_FIXTURE, name: 'Updated Skill', enabled: false }),

    [`DELETE ${BASE}/skills/${SKILL_ID}`]: () =>
      new Response(null, { status: 204 }),

    [`POST ${BASE}/skills/${SKILL_ID}/test`]: () =>
      Response.json(TEST_RESULT_FIXTURE),
  }),
})

describe('SkillsResource', () => {
  it('creates a skill', async () => {
    const result = await client.skills.create({
      name: 'Appointment Lookup',
      description: 'Look up patient appointments',
      execution_tier: 'T2',
    } as never)
    expect(result.id).toBe(SKILL_ID)
    expect(result.name).toBe('Appointment Lookup')
  })

  it('lists skills', async () => {
    const result = await client.skills.list()
    expect(result.items).toHaveLength(1)
    expect(result.items[0]?.name).toBe('Appointment Lookup')
    expect(result.has_more).toBe(false)
  })

  it('gets a skill by id', async () => {
    const result = await client.skills.get(SKILL_ID)
    expect(result.id).toBe(SKILL_ID)
    expect(result.execution_tier).toBe('T2')
  })

  it('throws NotFoundError for missing skill', async () => {
    await expect(client.skills.get('not-found')).rejects.toThrow(NotFoundError)
  })

  it('updates a skill', async () => {
    const result = await client.skills.update(SKILL_ID, { name: 'Updated Skill', enabled: false } as never)
    expect(result.name).toBe('Updated Skill')
    expect(result.enabled).toBe(false)
  })

  it('deletes a skill', async () => {
    await expect(client.skills.delete(SKILL_ID)).resolves.toBeUndefined()
  })

  it('tests a skill with sample input', async () => {
    const result = await client.skills.test(SKILL_ID, {
      input: { patient_id: 'pat-001' },
    } as never)
    expect(result.status).toBe('success')
    expect(result.duration_ms).toBe(245)
  })
})
