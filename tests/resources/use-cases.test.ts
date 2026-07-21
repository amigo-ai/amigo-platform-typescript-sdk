import { describe, expect, it } from 'vitest'
import { AmigoClient } from '../../src/index.js'
import { mockFetch } from '../helpers/mock-fetch.js'

const TEST_API_KEY = 'test-api-key'
const TEST_WORKSPACE_ID = 'ws-00000000-0000-0000-0000-000000000001'
const USE_CASE_ID = '00000000-0000-0000-0000-000000000222'
const SERVICE_ID = '00000000-0000-0000-0000-000000000123'
const BASE = `/v1/${TEST_WORKSPACE_ID}`

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
    [`GET ${BASE}/use-cases/${USE_CASE_ID}/service-binding`]: () => Response.json(BINDING_FIXTURE),
    [`PUT ${BASE}/use-cases/${USE_CASE_ID}/service-binding`]: ({ body }) =>
      Response.json({ ...BINDING_FIXTURE, ...(body as object) }),
    [`DELETE ${BASE}/use-cases/${USE_CASE_ID}/service-binding`]: () =>
      new Response(null, { status: 204 }),
  }),
})

describe('UseCasesResource', () => {
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
