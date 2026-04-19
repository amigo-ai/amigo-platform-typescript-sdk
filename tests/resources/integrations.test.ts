import { describe, it, expect } from 'vitest'
import { AmigoClient } from '../../src/index.js'
import { NotFoundError } from '../../src/core/errors.js'

const TEST_API_KEY = 'test-api-key-abc123'
const TEST_WORKSPACE_ID = 'ws-00000000-0000-0000-0000-000000000001'

const INTEGRATION_ID = 'int-00000000-0000-0000-0000-000000000001'

const INTEGRATION_FIXTURE = {
  id: INTEGRATION_ID,
  workspace_id: TEST_WORKSPACE_ID,
  name: 'Athena EHR',
  protocol: 'fhir_r4',
  base_url: 'https://fhir.athena.example.com/r4',
  auth_type: 'oauth2',
  enabled: true,
  status: 'connected',
  last_sync_at: '2026-01-15T08:00:00Z',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

const HEALTH_CHECK_FIXTURE = {
  integrations: [
    {
      id: INTEGRATION_ID,
      name: 'Athena EHR',
      status: 'healthy',
      latency_ms: 120,
      last_check_at: '2026-01-15T14:00:00Z',
    },
  ],
  overall_status: 'healthy',
}

const TEST_ENDPOINT_FIXTURE = {
  status: 'success',
  response_time_ms: 85,
  response_body: { resourceType: 'Patient', id: 'test-001' },
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
    [`POST ${BASE}/integrations`]: () =>
      Response.json(INTEGRATION_FIXTURE, { status: 201 }),

    [`GET ${BASE}/integrations`]: () =>
      Response.json({ items: [INTEGRATION_FIXTURE], has_more: false, continuation_token: null }),

    [`GET ${BASE}/integrations/${INTEGRATION_ID}`]: () =>
      Response.json(INTEGRATION_FIXTURE),

    [`GET ${BASE}/integrations/not-found`]: () =>
      Response.json({ detail: 'Integration not found', error_code: 'not_found' }, { status: 404 }),

    [`PUT ${BASE}/integrations/${INTEGRATION_ID}`]: () =>
      Response.json({ ...INTEGRATION_FIXTURE, name: 'Updated Integration', enabled: false }),

    [`DELETE ${BASE}/integrations/${INTEGRATION_ID}`]: () =>
      new Response(null, { status: 204 }),

    [`POST ${BASE}/integrations/${INTEGRATION_ID}/endpoints/Patient/test`]: () =>
      Response.json(TEST_ENDPOINT_FIXTURE),

    [`GET ${BASE}/integrations/health-check`]: () =>
      Response.json(HEALTH_CHECK_FIXTURE),
  }),
})

describe('IntegrationsResource', () => {
  it('creates an integration', async () => {
    const result = await client.integrations.create({
      name: 'Athena EHR',
      protocol: 'fhir_r4',
    } as never)
    expect(result.id).toBe(INTEGRATION_ID)
    expect(result.name).toBe('Athena EHR')
    expect(result.protocol).toBe('fhir_r4')
  })

  it('lists integrations', async () => {
    const result = await client.integrations.list()
    expect(result.items).toHaveLength(1)
    expect(result.items[0]?.name).toBe('Athena EHR')
    expect(result.has_more).toBe(false)
  })

  it('lists integrations with filters', async () => {
    const result = await client.integrations.list({ protocol: 'fhir_r4', enabled: true })
    expect(result.items).toHaveLength(1)
  })

  it('gets an integration by id', async () => {
    const result = await client.integrations.get(INTEGRATION_ID)
    expect(result.id).toBe(INTEGRATION_ID)
    expect(result.status).toBe('connected')
  })

  it('throws NotFoundError for missing integration', async () => {
    await expect(client.integrations.get('not-found')).rejects.toThrow(NotFoundError)
  })

  it('updates an integration', async () => {
    const result = await client.integrations.update(INTEGRATION_ID, {
      name: 'Updated Integration',
      enabled: false,
    } as never)
    expect(result.name).toBe('Updated Integration')
    expect(result.enabled).toBe(false)
  })

  it('deletes an integration', async () => {
    await expect(client.integrations.delete(INTEGRATION_ID)).resolves.toBeUndefined()
  })

  it('tests an endpoint', async () => {
    const result = await client.integrations.testEndpoint(
      INTEGRATION_ID,
      'Patient',
      { params: { _id: 'test-001' } } as never,
    )
    expect(result.status).toBe('success')
    expect(result.response_time_ms).toBe(85)
  })

  it('gets health check status', async () => {
    const result = await client.integrations.getHealthCheck()
    expect(result.overall_status).toBe('healthy')
    expect(result.integrations).toHaveLength(1)
    expect(result.integrations[0]?.latency_ms).toBe(120)
  })
})
