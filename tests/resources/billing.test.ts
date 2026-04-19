import { describe, it, expect } from 'vitest'
import { AmigoClient } from '../../src/index.js'
import { NotFoundError } from '../../src/core/errors.js'

const TEST_API_KEY = 'test-api-key-abc123'
const TEST_WORKSPACE_ID = 'ws-00000000-0000-0000-0000-000000000001'

const INVOICE_ID = 'inv-00000000-0000-0000-0000-000000000001'

const DASHBOARD_FIXTURE = {
  workspace_id: TEST_WORKSPACE_ID,
  current_period_total: 1250.0,
  previous_period_total: 980.0,
  delta_pct: 27.55,
  top_meters: [
    { meter_key: 'voice_minutes', label: 'Voice Minutes', usage: 4320, cost: 864.0 },
    { meter_key: 'api_calls', label: 'API Calls', usage: 125000, cost: 250.0 },
  ],
  invoice_status_summary: {
    paid: 2,
    sent: 1,
  },
  period_start: '2026-01-01',
  period_end: '2026-01-31',
}

const USAGE_FIXTURE = {
  period_start: '2026-01-01',
  period_end: '2026-01-31',
  meters: [
    { meter_key: 'voice_minutes', label: 'Voice Minutes', usage: 4320, unit: 'minutes' },
    { meter_key: 'api_calls', label: 'API Calls', usage: 125000, unit: 'calls' },
  ],
}

const INVOICE_FIXTURE = {
  id: INVOICE_ID,
  workspace_id: TEST_WORKSPACE_ID,
  status: 'sent',
  period_start: '2026-01-01',
  period_end: '2026-01-31',
  total: 1250.0,
  currency: 'USD',
  created_at: '2026-02-01T00:00:00Z',
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
    [`GET ${BASE}/billing/dashboard`]: () =>
      Response.json(DASHBOARD_FIXTURE),

    [`GET ${BASE}/billing/usage`]: () =>
      Response.json(USAGE_FIXTURE),

    [`GET ${BASE}/billing/usage/trends`]: () =>
      Response.json([
        { meter_key: 'voice_minutes', period_start: '2026-01-01', period_end: '2026-01-02', unit: 'minutes', usage: 150 },
        { meter_key: 'voice_minutes', period_start: '2026-01-02', period_end: '2026-01-03', unit: 'minutes', usage: 175 },
      ]),

    [`GET ${BASE}/billing/invoices`]: () =>
      Response.json({ items: [INVOICE_FIXTURE], has_more: false, continuation_token: null }),

    [`GET ${BASE}/billing/invoices/${INVOICE_ID}`]: () =>
      Response.json(INVOICE_FIXTURE),

    [`GET ${BASE}/billing/invoices/not-found`]: () =>
      Response.json({ detail: 'Invoice not found', error_code: 'not_found' }, { status: 404 }),

    [`GET ${BASE}/billing/invoices/${INVOICE_ID}/pdf`]: () =>
      Response.json({ url: 'https://s3.amazonaws.com/invoices/inv-001.pdf', expires_in: 3600 }),
  }),
})

describe('BillingResource', () => {
  it('gets the billing dashboard', async () => {
    const result = await client.billing.getDashboard()
    expect(result.current_period_total).toBe(1250.0)
    expect(result.top_meters).toHaveLength(2)
    expect(result.invoice_status_summary).toEqual({ paid: 2, sent: 1 })
  })

  it('gets usage summary', async () => {
    const result = await client.billing.getUsage()
    expect(result).toBeDefined()
  })

  it('gets usage trends', async () => {
    const result = await client.billing.getUsageTrends({ days: 30 })
    expect(result).toHaveLength(2)
  })

  it('lists invoices', async () => {
    const result = await client.billing.listInvoices()
    expect(result.items).toHaveLength(1)
    expect(result.items[0]?.status).toBe('sent')
  })

  it('gets an invoice by id', async () => {
    const result = await client.billing.getInvoice(INVOICE_ID)
    expect(result.id).toBe(INVOICE_ID)
    expect(result.total).toBe(1250.0)
  })

  it('throws NotFoundError for missing invoice', async () => {
    await expect(client.billing.getInvoice('not-found')).rejects.toThrow(NotFoundError)
  })

  it('gets invoice PDF download URL', async () => {
    const result = await client.billing.getInvoicePdf(INVOICE_ID)
    expect(result.url).toContain('s3.amazonaws.com')
  })
})
