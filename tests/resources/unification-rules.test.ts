import { describe, it, expect } from 'vitest'
import { AmigoClient } from '../../src/index.js'

const TEST_API_KEY = 'test-api-key'
const TEST_WORKSPACE_ID = 'ws-00000000-0000-0000-0000-000000000001'
const RULE_ID = 'ur-00000000-0000-0000-0000-000000000001'
const BASE = `/v1/${TEST_WORKSPACE_ID}`

const FIXTURE = {
  id: RULE_ID,
  workspace_id: TEST_WORKSPACE_ID,
  name: 'Patient by phone',
  enabled: true,
  selectors: [],
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
    [`POST ${BASE}/unification-rules`]: () => Response.json(FIXTURE, { status: 201 }),
    [`GET ${BASE}/unification-rules`]: () =>
      Response.json({ items: [FIXTURE], has_more: false, continuation_token: null }),
    [`GET ${BASE}/unification-rules/${RULE_ID}`]: () => Response.json(FIXTURE),
    [`PATCH ${BASE}/unification-rules/${RULE_ID}`]: () => Response.json(FIXTURE),
    [`DELETE ${BASE}/unification-rules/${RULE_ID}`]: () => new Response(null, { status: 204 }),
  }),
})

describe('UnificationRulesResource', () => {
  it('creates a rule', async () => {
    const created = await client.unificationRules.create({
      name: FIXTURE.name,
    } as Parameters<typeof client.unificationRules.create>[0])
    expect(created?.id).toBe(RULE_ID)
  })

  it('lists rules', async () => {
    const page = await client.unificationRules.list()
    expect(page?.items?.[0]?.id).toBe(RULE_ID)
  })

  it('gets a rule', async () => {
    const rule = await client.unificationRules.get(RULE_ID)
    expect(rule?.id).toBe(RULE_ID)
  })

  it('updates a rule', async () => {
    const updated = await client.unificationRules.update(RULE_ID, {
      enabled: false,
    } as Parameters<typeof client.unificationRules.update>[1])
    expect(updated?.id).toBe(RULE_ID)
  })

  it('deletes a rule', async () => {
    await expect(client.unificationRules.delete(RULE_ID)).resolves.toBeUndefined()
  })
})
