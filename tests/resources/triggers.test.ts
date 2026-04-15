import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { AmigoClient } from '../../src/index.js'
import { fixtures, TEST_API_KEY, TEST_WORKSPACE_ID, WS_BASE } from '../test-helpers.js'

const server = setupServer(
  http.get(`${WS_BASE}/triggers`, () =>
    HttpResponse.json(fixtures.paginatedList([fixtures.trigger()])),
  ),
  http.post(`${WS_BASE}/triggers`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>
    return HttpResponse.json({ ...fixtures.trigger(), name: body['name'] as string }, { status: 201 })
  }),
  http.get(`${WS_BASE}/triggers/:triggerId`, () => HttpResponse.json(fixtures.trigger())),
  http.put(`${WS_BASE}/triggers/:triggerId`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>
    return HttpResponse.json({ ...fixtures.trigger(), ...body })
  }),
  http.delete(`${WS_BASE}/triggers/:triggerId`, () => new HttpResponse(null, { status: 204 })),
  http.post(`${WS_BASE}/triggers/:triggerId/pause`, () =>
    HttpResponse.json({ ...fixtures.trigger(), is_active: false }),
  ),
  http.post(`${WS_BASE}/triggers/:triggerId/resume`, () =>
    HttpResponse.json({ ...fixtures.trigger(), is_active: true }),
  ),
  http.post(`${WS_BASE}/triggers/:triggerId/fire`, () =>
    HttpResponse.json({
      id: 'run-001',
      trigger_id: fixtures.trigger().id,
      status: 'running',
      input: {},
      output: null,
      error: null,
      started_at: '2026-04-15T13:00:00Z',
      completed_at: null,
    }),
  ),
)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

const client = new AmigoClient({ apiKey: TEST_API_KEY, workspaceId: TEST_WORKSPACE_ID })

describe('TriggersResource', () => {
  it('lists triggers', async () => {
    const result = await client.triggers.list()
    expect(result.items).toHaveLength(1)
    expect(result.items[0]?.schedule).toBe('0 13 * * 1-5')
  })

  it('creates a trigger', async () => {
    const result = await client.triggers.create({
      name: 'Daily Outreach',
      action_id: 'skill-001',
      schedule: '0 13 * * 1-5',
    })
    expect(result.name).toBe('Daily Outreach')
  })

  it('gets a trigger', async () => {
    const result = await client.triggers.get(fixtures.trigger().id)
    expect(result.id).toBe(fixtures.trigger().id)
  })

  it('pauses a trigger', async () => {
    const result = await client.triggers.pause(fixtures.trigger().id)
    expect(result.is_active).toBe(false)
  })

  it('resumes a trigger', async () => {
    const result = await client.triggers.resume(fixtures.trigger().id)
    expect(result.is_active).toBe(true)
  })

  it('fires a trigger immediately', async () => {
    const result = await client.triggers.fire(fixtures.trigger().id)
    expect(result.status).toBe('running')
    expect(result.trigger_id).toBe(fixtures.trigger().id)
  })

  it('deletes a trigger', async () => {
    await expect(client.triggers.delete(fixtures.trigger().id)).resolves.toBeUndefined()
  })
})
