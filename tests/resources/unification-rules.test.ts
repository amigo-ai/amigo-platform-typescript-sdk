import { describe, it, expect } from 'vitest'
import { AmigoClient } from '../../src/index.js'
import { mockFetch } from '../helpers/mock-fetch.js'

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
