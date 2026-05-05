import { describe, expect, it } from 'vitest'
import { AmigoClient, ConflictError, NotFoundError } from '../../src/index.js'

const TEST_API_KEY = 'test-api-key-abc123'
const TEST_WORKSPACE_ID = 'ws-00000000-0000-0000-0000-000000000001'

const SETUP_ID = 'aaaaaaaa-0000-0000-0000-000000000001'

const DETAIL_FIXTURE = {
  id: SETUP_ID,
  tenant_name: 'acme-prod',
  domain_identity: 'mail.acme.com',
  dns_checked_at: '2026-05-05T12:00:00Z',
  dns_records: [
    {
      address: 't1._domainkey.mail.acme.com',
      record: 't1.dkim.amazonses.com',
      type: 'CNAME',
      verified: false,
    },
    {
      address: 'bounce.mail.acme.com',
      record: '10 feedback-smtp.us-east-1.amazonses.com',
      type: 'MX',
      verified: false,
    },
    {
      address: '_dmarc.mail.acme.com',
      record: 'v=DMARC1; p=quarantine;',
      type: 'TXT',
      verified: false,
    },
  ],
  created_at: '2026-05-05T12:00:00Z',
  updated_at: '2026-05-05T12:00:00Z',
}

const LIST_ITEM_FIXTURE = {
  id: SETUP_ID,
  tenant_name: 'acme-prod',
  domain_identity: 'mail.acme.com',
  dns_verified: false,
  dns_checked_at: '2026-05-05T12:00:00Z',
  created_at: '2026-05-05T12:00:00Z',
  updated_at: '2026-05-05T12:00:00Z',
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

const BASE = `/v1/${TEST_WORKSPACE_ID}/channels/ses-setup`

describe('client.channels.sesSetup', () => {
  it('create returns the typed detail with DNS records', async () => {
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      fetch: mockFetch({
        [`POST ${BASE}`]: () =>
          new Response(JSON.stringify(DETAIL_FIXTURE), {
            status: 201,
            headers: { 'content-type': 'application/json' },
          }),
      }),
    })
    const result = await client.channels.sesSetup.create({
      tenant_name: 'acme-prod',
      domain_identity: 'mail.acme.com',
    })
    expect(result.id).toBe(SETUP_ID)
    expect(result.dns_records).toHaveLength(3)
    expect(result.dns_records.map((r) => r.type).sort()).toEqual(['CNAME', 'MX', 'TXT'])
  })

  it('list returns paginated items', async () => {
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      fetch: mockFetch({
        [`GET ${BASE}`]: () =>
          new Response(
            JSON.stringify({ items: [LIST_ITEM_FIXTURE], has_more: false, continuation_token: null }),
            { status: 200, headers: { 'content-type': 'application/json' } },
          ),
      }),
    })
    const result = await client.channels.sesSetup.list()
    expect(result.items).toHaveLength(1)
    expect(result.items[0]?.id).toBe(SETUP_ID)
    expect(result.has_more).toBe(false)
  })

  it('listAutoPaging streams every item across pages', async () => {
    let page = 0
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      fetch: mockFetch({
        [`GET ${BASE}`]: () => {
          page += 1
          if (page === 1) {
            return new Response(
              JSON.stringify({
                items: [LIST_ITEM_FIXTURE],
                has_more: true,
                continuation_token: 10,
              }),
              { status: 200, headers: { 'content-type': 'application/json' } },
            )
          }
          return new Response(
            JSON.stringify({
              items: [{ ...LIST_ITEM_FIXTURE, id: 'bbbbbbbb-0000-0000-0000-000000000002' }],
              has_more: false,
              continuation_token: null,
            }),
            { status: 200, headers: { 'content-type': 'application/json' } },
          )
        },
      }),
    })
    const seen: string[] = []
    for await (const item of client.channels.sesSetup.listAutoPaging()) {
      seen.push(item.id)
    }
    expect(seen).toEqual([SETUP_ID, 'bbbbbbbb-0000-0000-0000-000000000002'])
  })

  it('verify aliases get and re-runs the live DNS lookup', async () => {
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      fetch: mockFetch({
        [`POST ${BASE}/${SETUP_ID}/verify`]: () =>
          new Response(
            JSON.stringify({
              ...DETAIL_FIXTURE,
              dns_records: DETAIL_FIXTURE.dns_records.map((r) => ({ ...r, verified: true })),
            }),
            { status: 200, headers: { 'content-type': 'application/json' } },
          ),
      }),
    })
    const result = await client.channels.sesSetup.verify(SETUP_ID)
    expect(result.dns_records.every((r) => r.verified)).toBe(true)
  })

  it('delete throws ConflictError when use cases still reference the setup', async () => {
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      fetch: mockFetch({
        [`DELETE ${BASE}/${SETUP_ID}`]: () =>
          new Response(
            JSON.stringify({ detail: 'SES setup has active use cases — delete those first' }),
            { status: 409, headers: { 'content-type': 'application/json' } },
          ),
      }),
    })
    await expect(client.channels.sesSetup.delete(SETUP_ID)).rejects.toBeInstanceOf(ConflictError)
  })

  it('get throws NotFoundError on cross-tenant probes', async () => {
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      fetch: mockFetch({
        [`GET ${BASE}/${SETUP_ID}`]: () =>
          new Response(JSON.stringify({ detail: 'SES setup not found' }), {
            status: 404,
            headers: { 'content-type': 'application/json' },
          }),
      }),
    })
    await expect(client.channels.sesSetup.get(SETUP_ID)).rejects.toBeInstanceOf(NotFoundError)
  })
})
