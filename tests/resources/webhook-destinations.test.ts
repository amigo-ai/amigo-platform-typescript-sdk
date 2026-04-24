import { describe, it, expect } from 'vitest'
import { AmigoClient } from '../../src/index.js'
import { NotFoundError } from '../../src/core/errors.js'

const TEST_API_KEY = 'test-api-key-abc123'
const TEST_WORKSPACE_ID = 'ws-00000000-0000-0000-0000-000000000001'

const DEST_ID = 'whd-00000000-0000-0000-0000-000000000001'

const DESTINATION_FIXTURE = {
  id: DEST_ID,
  workspace_id: TEST_WORKSPACE_ID,
  name: 'Production Webhook',
  url: 'https://hooks.example.com/amigo',
  accepted_event_types: ['call.started', 'call.ended'],
  description: null,
  field_mapping: null,
  secret_hash: 'sha256:abc123...',
  created_by: null,
  headers: null,
  retry_policy: null,
  status: 'active',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

const DELIVERY_FIXTURE = {
  event_id: 'evt-00000000-0000-0000-0000-000000000001',
  event_type: 'call.started',
  data: {},
  effective_at: null,
  created_at: '2026-01-01T12:00:00Z',
}

const ROTATE_RESULT_FIXTURE = {
  secret: 'whsec_new_secret_value_abc123',
  rotation_expires_at: '2026-01-01T00:00:00Z',
}

function mockFetch(
  routes: Record<string, () => Response | Promise<Response>>,
): typeof globalThis.fetch {
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
    return new Response(JSON.stringify({ detail: `No mock for ${method} ${pathname}` }), {
      status: 500,
    })
  }
}

const BASE = `/v1/${TEST_WORKSPACE_ID}`

const client = new AmigoClient({
  apiKey: TEST_API_KEY,
  workspaceId: TEST_WORKSPACE_ID,
  fetch: mockFetch({
    [`GET ${BASE}/webhook-destinations`]: () =>
      Response.json({ items: [DESTINATION_FIXTURE], has_more: false, continuation_token: null }),

    [`POST ${BASE}/webhook-destinations`]: () =>
      Response.json(DESTINATION_FIXTURE, { status: 201 }),

    [`GET ${BASE}/webhook-destinations/${DEST_ID}`]: () => Response.json(DESTINATION_FIXTURE),

    [`GET ${BASE}/webhook-destinations/not-found`]: () =>
      Response.json(
        { detail: 'Webhook destination not found', error_code: 'not_found' },
        { status: 404 },
      ),

    [`PUT ${BASE}/webhook-destinations/${DEST_ID}`]: () =>
      Response.json({ ...DESTINATION_FIXTURE, name: 'Updated Webhook' }),

    [`DELETE ${BASE}/webhook-destinations/${DEST_ID}`]: () => new Response(null, { status: 204 }),

    [`GET ${BASE}/webhook-destinations/${DEST_ID}/deliveries`]: () =>
      Response.json({ items: [DELIVERY_FIXTURE], has_more: false, continuation_token: null }),

    [`POST ${BASE}/webhook-destinations/${DEST_ID}/rotate-secret`]: () =>
      Response.json(ROTATE_RESULT_FIXTURE),
  }),
})

describe('WebhookDestinationsResource', () => {
  it('lists webhook destinations', async () => {
    const result = await client.webhookDestinations.list()
    expect(result.items).toHaveLength(1)
    expect(result.items[0]?.name).toBe('Production Webhook')
    expect(result.items[0]?.url).toBe('https://hooks.example.com/amigo')
  })

  it('creates a webhook destination', async () => {
    const result = await client.webhookDestinations.create({
      name: 'Production Webhook',
      url: 'https://hooks.example.com/amigo',
      events: ['call.started', 'call.ended'],
    } as never)
    expect(result.id).toBe(DEST_ID)
    expect(result.name).toBe('Production Webhook')
  })

  it('gets a webhook destination by id', async () => {
    const result = await client.webhookDestinations.get(DEST_ID)
    expect(result.id).toBe(DEST_ID)
    expect(result.accepted_event_types).toContain('call.started')
  })

  it('throws NotFoundError for missing webhook destination', async () => {
    await expect(client.webhookDestinations.get('not-found')).rejects.toThrow(NotFoundError)
  })

  it('updates a webhook destination', async () => {
    const result = await client.webhookDestinations.update(DEST_ID, {
      name: 'Updated Webhook',
    } as never)
    expect(result.name).toBe('Updated Webhook')
  })

  it('deletes a webhook destination', async () => {
    await expect(client.webhookDestinations.delete(DEST_ID)).resolves.toBeUndefined()
  })

  it('lists deliveries for a destination', async () => {
    const result = await client.webhookDestinations.listDeliveries(DEST_ID)
    expect(result.items).toHaveLength(1)
    expect(result.items[0]?.event_type).toBe('call.started')
    expect(result.items[0]?.event_id).toBeDefined()
  })

  it('rotates the webhook secret', async () => {
    const result = await client.webhookDestinations.rotateSecret(DEST_ID)
    expect(result.secret).toBeDefined()
    expect(result.rotation_expires_at).toBeDefined()
  })
})
