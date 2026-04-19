import { describe, it, expect } from 'vitest'
import { AmigoClient } from '../../src/index.js'

const TEST_API_KEY = 'test-api-key-abc123'
const TEST_WORKSPACE_ID = 'ws-00000000-0000-0000-0000-000000000001'

const DASHBOARD_FIXTURE = {
  workspace_id: TEST_WORKSPACE_ID,
  overall_score: 92,
  categories: [
    { name: 'Data Protection', score: 95 },
    { name: 'Access Control', score: 88 },
    { name: 'Audit Trail', score: 93 },
  ],
  last_assessment_at: '2026-01-15T00:00:00Z',
}

const HIPAA_FIXTURE = {
  workspace_id: TEST_WORKSPACE_ID,
  compliant: true,
  report_period_days: 30,
  controls: [
    { id: 'AC-1', name: 'Access Control Policy', status: 'compliant' },
    { id: 'AU-1', name: 'Audit and Accountability Policy', status: 'compliant' },
    { id: 'SC-1', name: 'System and Communications Protection', status: 'review_needed' },
  ],
  phi_access_count: 1240,
  encryption_status: 'all_encrypted',
}

const ACCESS_REVIEW_FIXTURE = {
  workspace_id: TEST_WORKSPACE_ID,
  total_users: 25,
  users_with_phi_access: 8,
  last_review_at: '2026-01-10T00:00:00Z',
  pending_reviews: 2,
  access_entries: [
    { user_id: 'u-001', email: 'admin@clinic.example.com', role: 'admin', last_access: '2026-01-14T00:00:00Z' },
  ],
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
    expect(result.overall_score).toBe(92)
    expect(result.categories).toHaveLength(3)
    expect(result.categories[0]?.name).toBe('Data Protection')
  })

  it('gets HIPAA compliance report', async () => {
    const result = await client.compliance.getHipaa()
    expect(result.compliant).toBe(true)
    expect(result.controls).toHaveLength(3)
    expect(result.phi_access_count).toBe(1240)
    expect(result.encryption_status).toBe('all_encrypted')
  })

  it('gets HIPAA compliance report with period param', async () => {
    const result = await client.compliance.getHipaa({ report_period_days: 90 })
    expect(result.compliant).toBe(true)
    expect(result.report_period_days).toBe(30)
  })

  it('gets access review', async () => {
    const result = await client.compliance.getAccessReview()
    expect(result.total_users).toBe(25)
    expect(result.users_with_phi_access).toBe(8)
    expect(result.pending_reviews).toBe(2)
    expect(result.access_entries).toHaveLength(1)
  })
})
