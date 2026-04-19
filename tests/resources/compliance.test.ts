import { describe, it, expect } from 'vitest'
import { AmigoClient } from '../../src/index.js'

const TEST_API_KEY = 'test-api-key-abc123'
const TEST_WORKSPACE_ID = 'ws-00000000-0000-0000-0000-000000000001'

const DASHBOARD_FIXTURE = {
  active_credentials: 5,
  generated_at: '2026-01-15T00:00:00Z',
  hipaa_status: 'compliant',
  last_audit_export: '2026-01-10T00:00:00Z',
  legal_hold: false,
  retention_days: 365,
  total_credentials: 8,
}

const HIPAA_FIXTURE = {
  workspace_id: TEST_WORKSPACE_ID,
  compliance_status: 'compliant',
  report_period_days: 30,
  access_controls: { total_keys: 8, active_keys: 5 },
  api_key_summary: { active: 5, revoked: 3 },
  audit_summary: { total_events: 1240, last_export: '2026-01-10T00:00:00Z' },
  encryption: { at_rest: true, in_transit: true },
  generated_at: '2026-01-15T00:00:00Z',
  retention_policy: { days: 365, enforced: true },
}

const ACCESS_REVIEW_FIXTURE = {
  workspace_id: TEST_WORKSPACE_ID,
  credentials: [
    { id: 'cred-001', type: 'api_key', status: 'active' },
  ],
  generated_at: '2026-01-10T00:00:00Z',
  jwt_credentials_note: 'JWT credentials are managed via identity service',
  total_credentials: 8,
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
    [`GET ${BASE}/compliance/dashboard`]: () =>
      Response.json(DASHBOARD_FIXTURE),

    [`GET ${BASE}/compliance/hipaa`]: () =>
      Response.json(HIPAA_FIXTURE),

    [`GET ${BASE}/compliance/access-review`]: () =>
      Response.json(ACCESS_REVIEW_FIXTURE),
  }),
})

describe('ComplianceResource', () => {
  it('gets the compliance dashboard', async () => {
    const result = await client.compliance.getDashboard()
    expect(result.hipaa_status).toBe('compliant')
    expect(result.active_credentials).toBe(5)
    expect(result.total_credentials).toBe(8)
  })

  it('gets HIPAA compliance report', async () => {
    const result = await client.compliance.getHipaa()
    expect(result.compliance_status).toBe('compliant')
    expect(result.report_period_days).toBe(30)
    expect(result.workspace_id).toBe(TEST_WORKSPACE_ID)
    expect(result.encryption).toEqual({ at_rest: true, in_transit: true })
  })

  it('gets HIPAA compliance report with period param', async () => {
    const result = await client.compliance.getHipaa({ report_period_days: 90 })
    expect(result.compliance_status).toBe('compliant')
    expect(result.report_period_days).toBe(30)
  })

  it('gets access review', async () => {
    const result = await client.compliance.getAccessReview()
    expect(result.total_credentials).toBe(8)
    expect(result.workspace_id).toBe(TEST_WORKSPACE_ID)
    expect(result.jwt_credentials_note).toBeDefined()
    expect(result.credentials).toHaveLength(1)
  })
})
