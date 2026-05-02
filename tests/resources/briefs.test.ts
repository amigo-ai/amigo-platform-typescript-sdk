import { describe, it, expect } from 'vitest'
import { AmigoClient } from '../../src/index.js'

const TEST_API_KEY = 'test-api-key'
const TEST_WORKSPACE_ID = 'ws-00000000-0000-0000-0000-000000000001'
const ENTITY_ID = 'ent-001'
const BASE = `/v1/${TEST_WORKSPACE_ID}`
const FIXTURE = { brief_text: 'Active patient.', generated_at: '2026-01-01T00:00:00Z' }

function mockFetch(routes: Record<string, () => Response>): typeof globalThis.fetch {
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
    [`GET ${BASE}/brief`]: () => Response.json(FIXTURE),
    [`POST ${BASE}/brief`]: () => Response.json(FIXTURE),
    [`GET ${BASE}/entities/${ENTITY_ID}/brief`]: () => Response.json(FIXTURE),
    [`POST ${BASE}/entities/${ENTITY_ID}/brief`]: () => Response.json(FIXTURE),
  }),
})

describe('BriefsResource', () => {
  it('reads + regenerates workspace brief', async () => {
    expect(await client.briefs.get()).toMatchObject({ brief_text: 'Active patient.' })
    expect(await client.briefs.regenerate()).toMatchObject({ brief_text: 'Active patient.' })
  })

  it('reads + regenerates per-entity brief', async () => {
    expect(await client.briefs.getForEntity(ENTITY_ID)).toBeDefined()
    expect(await client.briefs.regenerateForEntity(ENTITY_ID)).toBeDefined()
  })
})
