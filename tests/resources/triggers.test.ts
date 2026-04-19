import { describe, it, expect } from 'vitest'
import { createPlatformClient } from '../../src/core/openapi-client.js'
import { TriggersResource } from '../../src/resources/triggers.js'
import { NotFoundError } from '../../src/core/errors.js'

const TEST_API_KEY = 'test-api-key-abc123'
const TEST_WORKSPACE_ID = 'ws-00000000-0000-0000-0000-000000000001'

const TRIGGER_ID = 'trg-00000000-0000-0000-0000-000000000001'

const TRIGGER_FIXTURE = {
  id: TRIGGER_ID,
  workspace_id: TEST_WORKSPACE_ID,
  name: 'Daily Patient Outreach',
  description: 'Send appointment reminders each weekday morning',
  schedule: '0 9 * * 1-5',
  action: {
    skill_id: 'skill-00000000-0000-0000-0000-000000000001',
    params: { message_template: 'reminder' },
  },
  status: 'active',
  last_fired_at: '2026-01-15T09:00:00Z',
  next_fire_at: '2026-01-16T09:00:00Z',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

const FIRE_RESULT_FIXTURE = {
  trigger_id: TRIGGER_ID,
  run_id: 'run-00000000-0000-0000-0000-000000000001',
  status: 'dispatched',
  fired_at: '2026-01-15T14:30:00Z',
}

const RUN_FIXTURE = {
  id: 'run-00000000-0000-0000-0000-000000000001',
  trigger_id: TRIGGER_ID,
  status: 'completed',
  started_at: '2026-01-15T09:00:00Z',
  completed_at: '2026-01-15T09:00:12Z',
  duration_ms: 12000,
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
    [`POST ${BASE}/triggers`]: () =>
      Response.json(TRIGGER_FIXTURE, { status: 201 }),

    [`GET ${BASE}/triggers`]: () =>
      Response.json({ items: [TRIGGER_FIXTURE], has_more: false, continuation_token: null }),

    [`GET ${BASE}/triggers/${TRIGGER_ID}`]: () =>
      Response.json(TRIGGER_FIXTURE),

    [`GET ${BASE}/triggers/not-found`]: () =>
      Response.json({ detail: 'Trigger not found', error_code: 'not_found' }, { status: 404 }),

    [`PUT ${BASE}/triggers/${TRIGGER_ID}`]: () =>
      Response.json({ ...TRIGGER_FIXTURE, name: 'Updated Trigger', schedule: '0 10 * * 1-5' }),

    [`DELETE ${BASE}/triggers/${TRIGGER_ID}`]: () =>
      new Response(null, { status: 204 }),

    [`POST ${BASE}/triggers/${TRIGGER_ID}/fire`]: () =>
      Response.json(FIRE_RESULT_FIXTURE),

    [`POST ${BASE}/triggers/${TRIGGER_ID}/pause`]: () =>
      Response.json({ ...TRIGGER_FIXTURE, status: 'paused' }),

    [`POST ${BASE}/triggers/${TRIGGER_ID}/resume`]: () =>
      Response.json({ ...TRIGGER_FIXTURE, status: 'active' }),

    [`GET ${BASE}/triggers/${TRIGGER_ID}/runs`]: () =>
      Response.json({ items: [RUN_FIXTURE], has_more: false, continuation_token: null }),
  }),
})

const triggers = new TriggersResource(platformClient, TEST_WORKSPACE_ID)

describe('TriggersResource', () => {
  it('creates a trigger', async () => {
    const result = await triggers.create({
      name: 'Daily Patient Outreach',
      schedule: '0 9 * * 1-5',
      action: { skill_id: 'skill-00000000-0000-0000-0000-000000000001' },
    } as never)
    expect(result.id).toBe(TRIGGER_ID)
    expect(result.name).toBe('Daily Patient Outreach')
    expect(result.schedule).toBe('0 9 * * 1-5')
  })

  it('lists triggers', async () => {
    const result = await triggers.list()
    expect(result.items).toHaveLength(1)
    expect(result.items[0]?.status).toBe('active')
  })

  it('gets a trigger by id', async () => {
    const result = await triggers.get(TRIGGER_ID)
    expect(result.id).toBe(TRIGGER_ID)
    expect(result.next_fire_at).toBe('2026-01-16T09:00:00Z')
  })

  it('throws NotFoundError for missing trigger', async () => {
    await expect(triggers.get('not-found')).rejects.toThrow(NotFoundError)
  })

  it('updates a trigger', async () => {
    const result = await triggers.update(TRIGGER_ID, {
      name: 'Updated Trigger',
      schedule: '0 10 * * 1-5',
    } as never)
    expect(result.name).toBe('Updated Trigger')
    expect(result.schedule).toBe('0 10 * * 1-5')
  })

  it('deletes a trigger', async () => {
    await expect(triggers.delete(TRIGGER_ID)).resolves.toBeUndefined()
  })

  it('fires a trigger manually', async () => {
    const result = await triggers.fire(TRIGGER_ID)
    expect(result.trigger_id).toBe(TRIGGER_ID)
    expect(result.status).toBe('dispatched')
  })

  it('pauses a trigger', async () => {
    const result = await triggers.pause(TRIGGER_ID)
    expect(result.status).toBe('paused')
  })

  it('resumes a trigger', async () => {
    const result = await triggers.resume(TRIGGER_ID)
    expect(result.status).toBe('active')
  })

  it('lists trigger runs', async () => {
    const result = await triggers.listRuns(TRIGGER_ID)
    expect(result.items).toHaveLength(1)
    expect(result.items[0]).toBeDefined()
  })
})
