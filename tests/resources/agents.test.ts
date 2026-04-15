import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { AmigoClient } from '../../src/index.js'
import { NotFoundError } from '../../src/core/errors.js'
import { fixtures, TEST_API_KEY, TEST_WORKSPACE_ID, WS_BASE } from '../test-helpers.js'

const server = setupServer(
  http.get(`${WS_BASE}/agents`, () =>
    HttpResponse.json(fixtures.paginatedList([fixtures.agent()])),
  ),
  http.post(`${WS_BASE}/agents`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>
    return HttpResponse.json({ ...fixtures.agent(), name: body['name'] as string }, { status: 201 })
  }),
  http.get(`${WS_BASE}/agents/:agentId`, ({ params }) => {
    if (params['agentId'] === 'not-found') {
      return HttpResponse.json(
        { error_code: 'not_found', message: 'Agent not found', detail: 'Agent not found', request_id: 'req-1' },
        { status: 404 },
      )
    }
    return HttpResponse.json(fixtures.agent())
  }),
  http.put(`${WS_BASE}/agents/:agentId`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>
    return HttpResponse.json({ ...fixtures.agent(), ...body })
  }),
  http.delete(`${WS_BASE}/agents/:agentId`, () => new HttpResponse(null, { status: 204 })),
  http.post(`${WS_BASE}/agents/:agentId/versions`, () =>
    HttpResponse.json({
      agent_id: fixtures.agent().id,
      version: 2,
      config_snapshot: {},
      created_at: '2026-01-02T00:00:00Z',
    }),
  ),
)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

const client = new AmigoClient({ apiKey: TEST_API_KEY, workspaceId: TEST_WORKSPACE_ID })

describe('AgentsResource', () => {
  it('lists agents', async () => {
    const result = await client.agents.list()
    expect(result.items).toHaveLength(1)
    expect(result.items[0]?.name).toBe('Test Agent')
    expect(result.has_more).toBe(false)
  })

  it('creates an agent', async () => {
    const result = await client.agents.create({ name: 'My Agent', model: 'claude-sonnet-4-6' })
    expect(result.name).toBe('My Agent')
  })

  it('gets an agent by id', async () => {
    const result = await client.agents.get(fixtures.agent().id)
    expect(result.id).toBe(fixtures.agent().id)
  })

  it('throws NotFoundError for missing agent', async () => {
    await expect(client.agents.get('not-found')).rejects.toThrow(NotFoundError)
  })

  it('updates an agent', async () => {
    const result = await client.agents.update(fixtures.agent().id, { name: 'Updated Agent' })
    expect(result.name).toBe('Updated Agent')
  })

  it('deletes an agent', async () => {
    await expect(client.agents.delete(fixtures.agent().id)).resolves.toBeUndefined()
  })

  it('creates an agent version', async () => {
    const result = await client.agents.createVersion(fixtures.agent().id)
    expect(result.version).toBe(2)
    expect(result.agent_id).toBe(fixtures.agent().id)
  })
})
