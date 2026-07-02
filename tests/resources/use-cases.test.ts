import { describe, expect, it } from 'vitest'
import { AmigoClient } from '../../src/index.js'
import { mockFetch } from '../helpers/mock-fetch.js'

const TEST_API_KEY = 'test-api-key'
const TEST_WORKSPACE_ID = 'ws-00000000-0000-0000-0000-000000000001'
const USE_CASE_ID = '00000000-0000-0000-0000-000000000222'
const SERVICE_ID = '00000000-0000-0000-0000-000000000123'
const BASE = `/v1/${TEST_WORKSPACE_ID}`

const USE_CASE_FIXTURE = {
  id: USE_CASE_ID,
  name: 'Example inbound voice',
  description: null,
  entity_name: 'patient',
  channel: 'inbound_voice',
  setup_id: 'setup-001',
  created_at: '2026-07-02T12:00:00Z',
  updated_at: '2026-07-02T12:00:00Z',
}

const OWNERSHIP_FIXTURE = {
  use_case_id: USE_CASE_ID,
  workspace_id: TEST_WORKSPACE_ID,
}

const BINDING_FIXTURE = {
  service_id: SERVICE_ID,
  channel: 'inbound_voice',
  created_at: '2026-07-02T12:00:00Z',
  updated_at: '2026-07-02T12:00:00Z',
}

const client = new AmigoClient({
  apiKey: TEST_API_KEY,
  workspaceId: TEST_WORKSPACE_ID,
  fetch: mockFetch({
    [`GET ${BASE}/use-cases`]: () => Response.json({ items: [USE_CASE_FIXTURE] }),
    [`GET ${BASE}/use-cases/ownership`]: () => Response.json({ items: [USE_CASE_ID] }),
    [`GET ${BASE}/use-cases/${USE_CASE_ID}/ownership`]: () => Response.json(OWNERSHIP_FIXTURE),
    [`PUT ${BASE}/use-cases/${USE_CASE_ID}/ownership`]: () => Response.json(OWNERSHIP_FIXTURE),
    [`DELETE ${BASE}/use-cases/${USE_CASE_ID}/ownership`]: () =>
      new Response(null, { status: 204 }),
    [`GET ${BASE}/use-cases/${USE_CASE_ID}/service-binding`]: () => Response.json(BINDING_FIXTURE),
    [`PUT ${BASE}/use-cases/${USE_CASE_ID}/service-binding`]: ({ body }) =>
      Response.json({ ...BINDING_FIXTURE, ...(body as object) }),
    [`DELETE ${BASE}/use-cases/${USE_CASE_ID}/service-binding`]: () =>
      new Response(null, { status: 204 }),
  }),
})

describe('UseCasesResource', () => {
  it('lists use cases', async () => {
    expect((await client.useCases.list({ channel: 'inbound_voice' })).items[0]?.id).toBe(
      USE_CASE_ID,
    )
  })

  it('manages ownership', async () => {
    expect(await client.useCases.listOwned()).toEqual({ items: [USE_CASE_ID] })
    expect(await client.useCases.getOwnership(USE_CASE_ID)).toMatchObject({
      workspace_id: TEST_WORKSPACE_ID,
    })
    expect(await client.useCases.assignOwnership(USE_CASE_ID)).toMatchObject({
      use_case_id: USE_CASE_ID,
    })
    await expect(client.useCases.releaseOwnership(USE_CASE_ID)).resolves.toBeUndefined()
  })

  it('manages service bindings', async () => {
    expect(await client.useCases.getServiceBinding(USE_CASE_ID)).toMatchObject({
      service_id: SERVICE_ID,
    })
    expect(
      await client.useCases.bindToService(USE_CASE_ID, { service_id: SERVICE_ID }),
    ).toMatchObject({ service_id: SERVICE_ID })
    await expect(client.useCases.unbindFromService(USE_CASE_ID)).resolves.toBeUndefined()
  })
})
