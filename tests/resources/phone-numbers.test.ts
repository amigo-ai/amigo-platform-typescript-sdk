import { describe, it, expect } from 'vitest'
import { AmigoClient } from '../../src/index.js'
import { NotFoundError } from '../../src/core/errors.js'

const TEST_API_KEY = 'test-api-key-abc123'
const TEST_WORKSPACE_ID = 'ws-00000000-0000-0000-0000-000000000001'

const PHONE_ID = 'pn-00000000-0000-0000-0000-000000000001'

const PHONE_FIXTURE = {
  id: PHONE_ID,
  workspace_id: TEST_WORKSPACE_ID,
  phone_number: '+14155551234',
  friendly_name: 'Main Line',
  agent_id: 'agent-00000000-0000-0000-0000-000000000001',
  status: 'active',
  capabilities: { voice: true, sms: true },
  forwarding: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

const FORWARDING_FIXTURE = {
  phone_number_id: PHONE_ID,
  forward_to: '+14155559999',
  enabled: true,
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
    [`GET ${BASE}/phone-numbers`]: () =>
      Response.json({ items: [PHONE_FIXTURE], has_more: false, continuation_token: null }),

    [`POST ${BASE}/phone-numbers`]: () =>
      Response.json(PHONE_FIXTURE, { status: 201 }),

    [`GET ${BASE}/phone-numbers/${PHONE_ID}`]: () =>
      Response.json(PHONE_FIXTURE),

    [`GET ${BASE}/phone-numbers/not-found`]: () =>
      Response.json({ detail: 'Phone number not found', error_code: 'not_found' }, { status: 404 }),

    [`PUT ${BASE}/phone-numbers/${PHONE_ID}`]: () =>
      Response.json({ ...PHONE_FIXTURE, friendly_name: 'Updated Line' }),

    [`DELETE ${BASE}/phone-numbers/${PHONE_ID}`]: () =>
      new Response(null, { status: 204 }),

    [`PUT ${BASE}/phone-numbers/${PHONE_ID}/forwarding`]: () =>
      Response.json(FORWARDING_FIXTURE),

    [`DELETE ${BASE}/phone-numbers/${PHONE_ID}/forwarding`]: () =>
      new Response(null, { status: 204 }),
  }),
})

describe('PhoneNumbersResource', () => {
  it('lists phone numbers', async () => {
    const result = await client.phoneNumbers.list()
    expect(result.items).toHaveLength(1)
    expect(result.items[0]?.phone_number).toBe('+14155551234')
  })

  it('provisions a phone number', async () => {
    const result = await client.phoneNumbers.provision({
      phone_number: '+14155551234',
    } as never)
    expect(result.id).toBe(PHONE_ID)
    expect(result.status).toBe('active')
  })

  it('gets a phone number by id', async () => {
    const result = await client.phoneNumbers.get(PHONE_ID)
    expect(result.id).toBe(PHONE_ID)
    expect(result.friendly_name).toBe('Main Line')
  })

  it('throws NotFoundError for missing phone number', async () => {
    await expect(client.phoneNumbers.get('not-found')).rejects.toThrow(NotFoundError)
  })

  it('updates a phone number', async () => {
    const result = await client.phoneNumbers.update(PHONE_ID, {
      friendly_name: 'Updated Line',
    } as never)
    expect(result.friendly_name).toBe('Updated Line')
  })

  it('releases a phone number', async () => {
    await expect(client.phoneNumbers.release(PHONE_ID)).resolves.toBeUndefined()
  })

  it('sets call forwarding', async () => {
    const result = await client.phoneNumbers.setForwarding(PHONE_ID, {
      forward_to: '+14155559999',
    } as never)
    expect(result.forward_to).toBe('+14155559999')
    expect(result.enabled).toBe(true)
  })

  it('clears call forwarding', async () => {
    await expect(client.phoneNumbers.clearForwarding(PHONE_ID)).resolves.toBeUndefined()
  })
})
