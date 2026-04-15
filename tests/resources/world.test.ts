import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { AmigoClient } from '../../src/index.js'
import { fixtures, TEST_API_KEY, TEST_WORKSPACE_ID, WS_BASE } from '../test-helpers.js'

const entity = fixtures.entity()

const server = setupServer(
  http.post(`${WS_BASE}/world/entities`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>
    return HttpResponse.json({ ...entity, entity_type: body['entity_type'] as string }, { status: 201 })
  }),
  http.get(`${WS_BASE}/world/entities`, () =>
    HttpResponse.json(fixtures.paginatedList([entity])),
  ),
  http.get(`${WS_BASE}/world/entities/:entityId`, () => HttpResponse.json(entity)),
  http.put(`${WS_BASE}/world/entities/:entityId`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>
    return HttpResponse.json({ ...entity, properties: { ...entity.properties, ...(body['properties'] as object ?? {}) } })
  }),
  http.post(`${WS_BASE}/world/events`, () =>
    HttpResponse.json({
      id: 'event-001',
      workspace_id: TEST_WORKSPACE_ID,
      entity_id: entity.id,
      event_type: 'call_completed',
      source: 'voice-agent',
      data: { duration: 120 },
      confidence: 1.0,
      derived_from: null,
      created_at: '2026-04-15T13:00:00Z',
    }),
  ),
  http.get(`${WS_BASE}/world/timeline/:entityId`, () =>
    HttpResponse.json([
      {
        event: {
          id: 'event-001',
          workspace_id: TEST_WORKSPACE_ID,
          entity_id: entity.id,
          event_type: 'call_completed',
          source: 'voice-agent',
          data: {},
          confidence: 1.0,
          derived_from: null,
          created_at: '2026-04-15T13:00:00Z',
        },
        entity_snapshot: entity,
      },
    ]),
  ),
)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

const client = new AmigoClient({ apiKey: TEST_API_KEY, workspaceId: TEST_WORKSPACE_ID })

describe('WorldResource', () => {
  it('creates an entity', async () => {
    const result = await client.world.createEntity({ entity_type: 'patient', canonical_id: 'MRN-001' })
    expect(result.entity_type).toBe('patient')
  })

  it('lists entities', async () => {
    const result = await client.world.listEntities()
    expect(result.items).toHaveLength(1)
    expect(result.items[0]?.entity_type).toBe('patient')
  })

  it('gets an entity', async () => {
    const result = await client.world.getEntity(entity.id)
    expect(result.canonical_id).toBe('MRN-12345')
  })

  it('updates entity properties', async () => {
    const result = await client.world.updateEntity(entity.id, {
      properties: { name: 'Jane Smith' },
    })
    expect((result.properties as Record<string, unknown>)['name']).toBe('Jane Smith')
  })

  it('emits an event', async () => {
    const result = await client.world.emitEvent({
      entity_id: entity.id,
      event_type: 'call_completed',
      data: { duration: 120 },
    })
    expect(result.event_type).toBe('call_completed')
  })

  it('gets timeline for an entity', async () => {
    const result = await client.world.getTimeline(entity.id)
    expect(result).toHaveLength(1)
    expect(result[0]?.event.event_type).toBe('call_completed')
  })
})
