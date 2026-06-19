import { describe, it, expect, expectTypeOf } from 'vitest'
import { AmigoClient } from '../../src/index.js'
import { NotFoundError } from '../../src/core/errors.js'
import type {
  CreateIntegrationRequest,
  IntegrationIdentityBinding,
  IntegrationIdentityBindings,
  IntegrationIdentityBindingTestValues,
} from '../../src/index.js'

const TEST_API_KEY = 'test-api-key-abc123'
const TEST_WORKSPACE_ID = 'ws-00000000-0000-0000-0000-000000000001'

const INTEGRATION_ID = 'int-00000000-0000-0000-0000-000000000001'
const ENDPOINT_ID = 'ep-00000000-0000-0000-0000-000000000001'

const INTEGRATION_FIXTURE = {
  id: INTEGRATION_ID,
  workspace_id: TEST_WORKSPACE_ID,
  kind: 'rest',
  name: 'athena-ehr',
  display_name: 'Athena EHR',
  base_url: 'https://fhir.athena.example.com/r4',
  auth: {
    type: 'static_header',
    header_name: 'X-API-Key',
  },
  enabled: true,
  endpoint_count: 1,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

const ENDPOINT_FIXTURE = {
  id: ENDPOINT_ID,
  name: 'get-patient',
  description: 'Fetch a patient record by ID',
  method: 'GET',
  path: 'Patient/{patient_id}',
  body_format: 'json',
  timeout_seconds: 30,
  max_retries: 2,
  max_response_length: 0,
  input_schema: { type: 'object', properties: { patient_id: { type: 'string' } } },
  headers: {},
  static_body_fields: {},
  retry_on_status: [502, 503, 504],
  response_template: null,
}

const TEST_ENDPOINT_FIXTURE = {
  status_code: 200,
  duration_ms: 85,
  retries: 0,
  raw_response: { resourceType: 'Patient', id: 'test-001' },
  rendered: null,
  final_result: null,
  error: null,
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
    [`POST ${BASE}/integrations`]: () => Response.json(INTEGRATION_FIXTURE, { status: 201 }),

    [`GET ${BASE}/integrations`]: () =>
      Response.json({ items: [INTEGRATION_FIXTURE], has_more: false, continuation_token: null }),

    [`GET ${BASE}/integrations/${INTEGRATION_ID}`]: () => Response.json(INTEGRATION_FIXTURE),

    [`GET ${BASE}/integrations/not-found`]: () =>
      Response.json({ detail: 'Integration not found', error_code: 'not_found' }, { status: 404 }),

    [`PATCH ${BASE}/integrations/${INTEGRATION_ID}`]: () =>
      Response.json({
        ...INTEGRATION_FIXTURE,
        display_name: 'Updated Integration',
        enabled: false,
      }),

    [`DELETE ${BASE}/integrations/${INTEGRATION_ID}`]: () => new Response(null, { status: 204 }),

    [`GET ${BASE}/integrations/${INTEGRATION_ID}/endpoints`]: () =>
      Response.json({ items: [ENDPOINT_FIXTURE], has_more: false, continuation_token: null }),

    [`POST ${BASE}/integrations/${INTEGRATION_ID}/endpoints`]: () =>
      Response.json(ENDPOINT_FIXTURE, { status: 201 }),

    [`GET ${BASE}/integrations/${INTEGRATION_ID}/endpoints/${ENDPOINT_ID}`]: () =>
      Response.json(ENDPOINT_FIXTURE),

    [`PATCH ${BASE}/integrations/${INTEGRATION_ID}/endpoints/${ENDPOINT_ID}`]: () =>
      Response.json({ ...ENDPOINT_FIXTURE, description: 'Updated description' }),

    [`DELETE ${BASE}/integrations/${INTEGRATION_ID}/endpoints/${ENDPOINT_ID}`]: () =>
      new Response(null, { status: 204 }),

    [`POST ${BASE}/integrations/${INTEGRATION_ID}/endpoints/${ENDPOINT_ID}/test`]: () =>
      Response.json(TEST_ENDPOINT_FIXTURE),
  }),
})

describe('IntegrationsResource', () => {
  it('exports custom token exchange identity binding types', () => {
    const binding: IntegrationIdentityBinding = 'external_user.subject_key'
    const bindings: IntegrationIdentityBindings = {
      subject_key: binding,
      principal_id: 'principal.subject_id',
    }
    const testValues: IntegrationIdentityBindingTestValues = {
      subject_key: 'external-user-123',
    }
    const request: CreateIntegrationRequest = {
      name: 'identity-bound-auth',
      display_name: 'Identity Bound Auth',
      base_url: 'https://api.example.com',
      auth: {
        type: 'custom_token_exchange',
        exchange_url: 'https://auth.example.com/token',
        response_token_path: '/access_token',
        identity_bindings: bindings,
        identity_binding_test_values: testValues,
        param_headers: {
          'X-Subject-Key': {
            param_name: 'subject_key',
            description: 'Verified external user subject key',
          },
        },
      },
    }

    expect(request.auth?.type).toBe('custom_token_exchange')
    if (request.auth?.type === 'custom_token_exchange') {
      expect(request.auth.identity_bindings?.subject_key).toBe('external_user.subject_key')
    }
    expectTypeOf<IntegrationIdentityBinding>().toEqualTypeOf<
      'principal.subject_key' | 'principal.subject_id' | 'external_user.subject_key'
    >()
  })

  it('creates an integration', async () => {
    const result = await client.integrations.create({
      name: 'athena-ehr',
      display_name: 'Athena EHR',
      base_url: 'https://fhir.athena.example.com/r4',
    })
    expect(result.id).toBe(INTEGRATION_ID)
    expect(result.name).toBe('athena-ehr')
    expect(result.display_name).toBe('Athena EHR')
  })

  it('lists integrations', async () => {
    const result = await client.integrations.list()
    expect(result.items).toHaveLength(1)
    expect(result.items[0]?.name).toBe('athena-ehr')
    expect(result.has_more).toBe(false)
  })

  it('lists integrations with filters', async () => {
    const result = await client.integrations.list({ enabled: true, search: 'athena' })
    expect(result.items).toHaveLength(1)
  })

  it('gets an integration by id', async () => {
    const result = await client.integrations.get(INTEGRATION_ID)
    expect(result.id).toBe(INTEGRATION_ID)
    expect(result.enabled).toBe(true)
    if (result.kind === 'rest') {
      expect(result.endpoint_count).toBe(1)
    }
  })

  it('throws NotFoundError for missing integration', async () => {
    await expect(client.integrations.get('not-found')).rejects.toThrow(NotFoundError)
  })

  it('updates an integration', async () => {
    const result = await client.integrations.update(INTEGRATION_ID, {
      display_name: 'Updated Integration',
      enabled: false,
    })
    expect(result.display_name).toBe('Updated Integration')
    expect(result.enabled).toBe(false)
  })

  it('deletes an integration', async () => {
    await expect(client.integrations.delete(INTEGRATION_ID)).resolves.toBeUndefined()
  })

  it('lists endpoints', async () => {
    const result = await client.integrations.listEndpoints(INTEGRATION_ID)
    expect(result.items).toHaveLength(1)
    expect(result.items[0]?.id).toBe(ENDPOINT_ID)
    expect(result.items[0]?.name).toBe('get-patient')
  })

  it('gets an endpoint by id', async () => {
    const result = await client.integrations.getEndpoint(INTEGRATION_ID, ENDPOINT_ID)
    expect(result.id).toBe(ENDPOINT_ID)
    expect(result.method).toBe('GET')
  })

  it('creates an endpoint', async () => {
    const result = await client.integrations.createEndpoint(INTEGRATION_ID, {
      name: 'get-patient',
      description: 'Fetch a patient record by ID',
      path: 'Patient/{patient_id}',
    })
    expect(result.id).toBe(ENDPOINT_ID)
  })

  it('updates an endpoint', async () => {
    const result = await client.integrations.updateEndpoint(INTEGRATION_ID, ENDPOINT_ID, {
      description: 'Updated description',
    })
    expect(result.description).toBe('Updated description')
  })

  it('deletes an endpoint', async () => {
    await expect(
      client.integrations.deleteEndpoint(INTEGRATION_ID, ENDPOINT_ID),
    ).resolves.toBeUndefined()
  })

  it('tests an endpoint', async () => {
    const result = await client.integrations.testEndpoint(INTEGRATION_ID, ENDPOINT_ID, {
      params: { patient_id: 'test-001' },
    })
    expect(result.status_code).toBe(200)
    expect(result.duration_ms).toBe(85)
  })
})
