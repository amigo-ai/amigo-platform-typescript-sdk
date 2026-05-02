import { describe, it, expect } from 'vitest'
import { AmigoClient } from '../../src/index.js'

const TEST_API_KEY = 'test-api-key'
const TEST_WORKSPACE_ID = 'ws-00000000-0000-0000-0000-000000000001'
const SESSION_ID = 'is-00000000-0000-0000-0000-000000000001'
const BASE = `/v1/${TEST_WORKSPACE_ID}`

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
    return new Response(JSON.stringify({ detail: 'no mock' }), { status: 500 })
  }
}

const client = new AmigoClient({
  apiKey: TEST_API_KEY,
  workspaceId: TEST_WORKSPACE_ID,
  fetch: mockFetch({
    [`GET ${BASE}/insights/digest`]: () => Response.json({ summary: 'ok' }),
    [`GET ${BASE}/insights/schema`]: () => Response.json({ tables: [] }),
    [`GET ${BASE}/insights/suggestions`]: () => Response.json({ suggestions: [] }),
    [`POST ${BASE}/insights/sql`]: () => Response.json({ rows: [] }),
    [`POST ${BASE}/insights/sessions`]: () => Response.json({ id: SESSION_ID }, { status: 201 }),
    [`GET ${BASE}/insights/sessions/${SESSION_ID}`]: () => Response.json({ id: SESSION_ID }),
    [`POST ${BASE}/insights/sessions/${SESSION_ID}/chat`]: () =>
      Response.json({ message: 'hello' }),
  }),
})

describe('InsightsResource', () => {
  it('gets digest, schema, suggestions', async () => {
    expect(await client.insights.getDigest()).toBeDefined()
    expect(await client.insights.getSchema()).toBeDefined()
    expect(await client.insights.getSuggestions()).toBeDefined()
  })

  it('runs ad-hoc SQL', async () => {
    const result = await client.insights.runSql({
      sql: 'select 1',
    } as Parameters<typeof client.insights.runSql>[0])
    expect(result).toBeDefined()
  })

  it('manages chat sessions', async () => {
    const created = await client.insights.sessions.create()
    expect(created).toMatchObject({ id: SESSION_ID })

    const got = await client.insights.sessions.get(SESSION_ID)
    expect(got).toMatchObject({ id: SESSION_ID })

    const reply = await client.insights.sessions.chat(SESSION_ID, {
      message: 'hi',
    } as Parameters<typeof client.insights.sessions.chat>[1])
    expect(reply).toBeDefined()
  })
})
