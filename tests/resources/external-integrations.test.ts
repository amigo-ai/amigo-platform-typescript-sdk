import { describe, expect, it } from 'vitest'
import { AmigoClient } from '../../src/index.js'

const TEST_API_KEY = 'test-api-key-abc123'
const TEST_WORKSPACE_ID = 'ws-00000000-0000-0000-0000-000000000001'
const BASE = `/v1/${TEST_WORKSPACE_ID}`
const INTEGRATION_ID = '00000000-0000-4000-8000-000000000001'
const CREDENTIAL_ID = '00000000-0000-4000-8000-000000000002'
const SERVICE_ID = '00000000-0000-4000-8000-000000000003'

const INTEGRATION_FIXTURE = {
  id: INTEGRATION_ID,
  workspace_id: TEST_WORKSPACE_ID,
  name: 'customer-portal',
  display_name: 'Customer Portal',
  description: 'Backend that mints external-user sessions',
  is_active: true,
  created_by_entity_id: '00000000-0000-4000-8000-000000000004',
  created_by_credential_id: '00000000-0000-4000-8000-000000000005',
  created_at: '2026-06-01T00:00:00Z',
  updated_at: '2026-06-01T00:00:00Z',
}

const CREDENTIAL_FIXTURE = {
  id: CREDENTIAL_ID,
  workspace_id: TEST_WORKSPACE_ID,
  integration_id: INTEGRATION_ID,
  client_id: 'ext_ci_123',
  name: 'staging backend',
  service_ids: [SERVICE_ID],
  is_active: true,
  expires_at: null,
  revoked_at: null,
  rotated_at: null,
  created_at: '2026-06-01T00:00:00Z',
  updated_at: '2026-06-01T00:00:00Z',
}

function mockFetch(
  routes: Record<string, (request: Request) => Response | Promise<Response>>,
): typeof globalThis.fetch {
  return async (input, init) => {
    const request = input instanceof Request ? input : new Request(input, init)
    const pathname = new URL(request.url).pathname
    const key = `${request.method.toUpperCase()} ${pathname}`
    const handler = routes[key]
    if (handler) return await handler(request)
    return Response.json({ detail: `No mock for ${key}` }, { status: 500 })
  }
}

describe('ExternalIntegrationsResource', () => {
  it('manages external integrations and credentials', async () => {
    const bodies: Record<string, unknown> = {}
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      fetch: mockFetch({
        [`POST ${BASE}/external-integrations`]: async (request) => {
          bodies.create = await request.json()
          return Response.json(INTEGRATION_FIXTURE, { status: 201 })
        },
        [`GET ${BASE}/external-integrations`]: () =>
          Response.json({
            items: [INTEGRATION_FIXTURE],
            has_more: false,
            continuation_token: null,
            total: 1,
          }),
        [`GET ${BASE}/external-integrations/${INTEGRATION_ID}`]: () =>
          Response.json(INTEGRATION_FIXTURE),
        [`PATCH ${BASE}/external-integrations/${INTEGRATION_ID}`]: async (request) => {
          bodies.update = await request.json()
          return Response.json({ ...INTEGRATION_FIXTURE, display_name: 'Updated Portal' })
        },
        [`DELETE ${BASE}/external-integrations/${INTEGRATION_ID}`]: () =>
          new Response(null, { status: 204 }),
        [`POST ${BASE}/external-integrations/${INTEGRATION_ID}/credentials`]: async (request) => {
          bodies.createCredential = await request.json()
          return Response.json(
            { client_secret: 'ext_cs_once', credential: CREDENTIAL_FIXTURE },
            { status: 201 },
          )
        },
        [`GET ${BASE}/external-integrations/${INTEGRATION_ID}/credentials`]: () =>
          Response.json([CREDENTIAL_FIXTURE]),
        [`POST ${BASE}/external-integrations/${INTEGRATION_ID}/credentials/${CREDENTIAL_ID}/rotate`]:
          () => Response.json({ client_secret: 'ext_cs_rotated', credential: CREDENTIAL_FIXTURE }),
        [`DELETE ${BASE}/external-integrations/${INTEGRATION_ID}/credentials/${CREDENTIAL_ID}`]:
          () => new Response(null, { status: 204 }),
      }),
    })

    const created = await client.externalIntegrations.create({
      name: 'customer-portal',
      display_name: 'Customer Portal',
      description: 'Backend that mints external-user sessions',
    })
    expect(created.id).toBe(INTEGRATION_ID)
    expect(bodies.create).toMatchObject({ name: 'customer-portal' })

    const listed = await client.externalIntegrations.list({ search: 'portal', limit: 10 })
    expect(listed.items).toHaveLength(1)
    expect(listed.items[0]?.name).toBe('customer-portal')

    const fetched = await client.externalIntegrations.get(INTEGRATION_ID)
    expect(fetched.display_name).toBe('Customer Portal')

    const updated = await client.externalIntegrations.update(INTEGRATION_ID, {
      display_name: 'Updated Portal',
    })
    expect(updated.display_name).toBe('Updated Portal')
    expect(bodies.update).toEqual({ display_name: 'Updated Portal' })

    const secret = await client.externalIntegrations.createCredential(INTEGRATION_ID, {
      name: 'staging backend',
      service_ids: [SERVICE_ID],
    })
    expect(secret.client_secret).toBe('ext_cs_once')
    expect(secret.credential.client_id).toBe('ext_ci_123')
    expect(bodies.createCredential).toEqual({
      name: 'staging backend',
      service_ids: [SERVICE_ID],
    })

    const credentials = await client.externalIntegrations.listCredentials(INTEGRATION_ID)
    expect(credentials[0]?.id).toBe(CREDENTIAL_ID)

    const rotated = await client.externalIntegrations.rotateCredential(
      INTEGRATION_ID,
      CREDENTIAL_ID,
    )
    expect(rotated.client_secret).toBe('ext_cs_rotated')

    await expect(
      client.externalIntegrations.revokeCredential(INTEGRATION_ID, CREDENTIAL_ID),
    ).resolves.toBeUndefined()
    await expect(client.externalIntegrations.delete(INTEGRATION_ID)).resolves.toBeUndefined()
  })
})
