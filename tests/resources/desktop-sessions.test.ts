import { describe, it, expect } from 'vitest'
import { AmigoClient } from '../../src/index.js'

const TEST_API_KEY = 'test-api-key'
const TEST_WORKSPACE_ID = 'ws-00000000-0000-0000-0000-000000000001'
const SESSION_ID = 'desktop-001'
const BASE = `/v1/${TEST_WORKSPACE_ID}`

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
    [`POST ${BASE}/desktop-sessions`]: () => Response.json({ session_id: SESSION_ID }),
    [`DELETE ${BASE}/desktop-sessions/${SESSION_ID}`]: () => Response.json({ status: 'closed' }),
    [`POST ${BASE}/desktop-sessions/${SESSION_ID}/action`]: () => Response.json({ ok: true }),
    [`GET ${BASE}/desktop-sessions/${SESSION_ID}/screenshot`]: () =>
      Response.json({ image_url: 'https://example/foo.png' }),
    [`GET ${BASE}/desktop-sessions/${SESSION_ID}/status`]: () =>
      Response.json({ status: 'connected' }),
  }),
})

describe('DesktopSessionsResource', () => {
  it('lifecycle: create → action → screenshot → status → disconnect', async () => {
    expect(
      await client.desktopSessions.create({} as Parameters<
        typeof client.desktopSessions.create
      >[0]),
    ).toMatchObject({ session_id: SESSION_ID })
    expect(
      await client.desktopSessions.sendAction(SESSION_ID, {} as Parameters<
        typeof client.desktopSessions.sendAction
      >[1]),
    ).toMatchObject({ ok: true })
    expect(await client.desktopSessions.getScreenshot(SESSION_ID)).toBeDefined()
    expect(await client.desktopSessions.getStatus(SESSION_ID)).toMatchObject({
      status: 'connected',
    })
    expect(await client.desktopSessions.disconnect(SESSION_ID)).toMatchObject({
      status: 'closed',
    })
  })
})
