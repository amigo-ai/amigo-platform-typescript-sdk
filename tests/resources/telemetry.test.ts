import { describe, it, expect } from 'vitest'
import { AmigoClient } from '../../src/index.js'
import type { LatencyEvent } from '../../src/index.js'
import { parseServerTimeMs } from '../../src/core/telemetry.js'

const TEST_API_KEY = 'test-api-key-abc123'
const TEST_WORKSPACE_ID = 'ws-00000000-0000-0000-0000-000000000001'

const AGENT_FIXTURE = {
  id: 'agent-00000000-0000-0000-0000-000000000001',
  workspace_id: TEST_WORKSPACE_ID,
  name: 'Test Agent',
  description: 'A test agent',
  latest_version: 1,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

const BASE = `/v1/${TEST_WORKSPACE_ID}`

function mockFetch(
  routes: Record<string, () => Response | Promise<Response>>,
): typeof globalThis.fetch {
  return async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const url =
      input instanceof Request ? input.url : typeof input === 'string' ? input : input.toString()
    const method = (input instanceof Request ? input.method : (init?.method ?? 'GET')).toUpperCase()
    const pathname = new URL(url, 'https://api.platform.amigo.ai').pathname

    for (const [pattern, handler] of Object.entries(routes)) {
      const [pMethod, ...pPathParts] = pattern.split(' ')
      const pPath = pPathParts.join(' ')
      if (pMethod === method && pathname === pPath) {
        return handler()
      }
    }
    return new Response(JSON.stringify({ detail: `No mock for ${method} ${pathname}` }), {
      status: 500,
    })
  }
}

describe('telemetry: header parsing', () => {
  it('parses X-Amigo-Server-Time-Ms', () => {
    expect(parseServerTimeMs(new Headers({ 'x-amigo-server-time-ms': '123.4' }))).toBe(123.4)
  })

  it('parses Server-Timing with preferred amigo metric', () => {
    const h = new Headers({ 'server-timing': 'db;dur=5, amigo;dur=87.2, cache;dur=1' })
    expect(parseServerTimeMs(h)).toBe(87.2)
  })

  it('parses Server-Timing with total fallback', () => {
    const h = new Headers({ 'server-timing': 'total;dur=99, db;dur=5' })
    expect(parseServerTimeMs(h)).toBe(99)
  })

  it('falls back to first entry with dur', () => {
    expect(parseServerTimeMs(new Headers({ 'server-timing': 'custom;dur=33.3' }))).toBe(33.3)
  })

  it('returns null when no server-time header is present', () => {
    expect(parseServerTimeMs(new Headers())).toBeNull()
  })

  it('returns null for malformed values', () => {
    expect(parseServerTimeMs(new Headers({ 'x-amigo-server-time-ms': 'not-a-number' }))).toBeNull()
  })
})

describe('AmigoClient latency telemetry', () => {
  it('emits an event with server/network breakdown from X-Amigo-Server-Time-Ms', async () => {
    const events: LatencyEvent[] = []
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      telemetry: { onRequest: (e) => events.push(e) },
      fetch: mockFetch({
        [`GET ${BASE}/agents`]: () =>
          Response.json(
            { items: [AGENT_FIXTURE], has_more: false, continuation_token: null },
            { headers: { 'X-Amigo-Server-Time-Ms': '42', 'X-Request-Id': 'req-abc-123' } },
          ),
      }),
    })

    await client.agents.list()

    expect(events).toHaveLength(1)
    const e = events[0]!
    expect(e.method).toBe('GET')
    expect(e.path).toBe(`${BASE}/agents`)
    expect(e.status).toBe(200)
    expect(e.serverMs).toBe(42)
    expect(e.requestId).toBe('req-abc-123')
    expect(e.clientRequestId).toBeTruthy()
    expect(e.totalMs).toBeGreaterThanOrEqual(0)
    expect(e.networkMs).toBeGreaterThanOrEqual(0)
    expect(e.networkMs).toBe(Math.max(0, e.totalMs - 42))
  })

  it('parses Server-Timing when X-Amigo-Server-Time-Ms is absent', async () => {
    const events: LatencyEvent[] = []
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      telemetry: { onRequest: (e) => events.push(e) },
      fetch: mockFetch({
        [`GET ${BASE}/agents`]: () =>
          Response.json(
            { items: [AGENT_FIXTURE], has_more: false, continuation_token: null },
            { headers: { 'Server-Timing': 'db;dur=10.5, amigo;dur=87.2' } },
          ),
      }),
    })

    await client.agents.list()
    expect(events[0]!.serverMs).toBe(87.2)
  })

  it('leaves serverMs/networkMs null when server reports no timing', async () => {
    const events: LatencyEvent[] = []
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      telemetry: { onRequest: (e) => events.push(e) },
      fetch: mockFetch({
        [`GET ${BASE}/agents`]: () =>
          Response.json({ items: [AGENT_FIXTURE], has_more: false, continuation_token: null }),
      }),
    })

    await client.agents.list()
    expect(events[0]!.serverMs).toBeNull()
    expect(events[0]!.networkMs).toBeNull()
  })

  it('emits on 5xx error responses with status and timing', async () => {
    const events: LatencyEvent[] = []
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      telemetry: { onRequest: (e) => events.push(e) },
      fetch: mockFetch({
        [`GET ${BASE}/agents/fails`]: () =>
          Response.json(
            { error_code: 'server_error', detail: 'boom' },
            { status: 500, headers: { 'X-Amigo-Server-Time-Ms': '15' } },
          ),
      }),
    })

    await expect(client.agents.get('fails')).rejects.toThrow()
    expect(events).toHaveLength(1)
    expect(events[0]!.status).toBe(500)
    expect(events[0]!.serverMs).toBe(15)
  })

  it('composes with user-supplied hooks — both fire', async () => {
    const telemetryEvents: LatencyEvent[] = []
    let userHookCalls = 0
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      telemetry: { onRequest: (e) => telemetryEvents.push(e) },
      hooks: {
        onResponse: () => {
          userHookCalls++
        },
      },
      fetch: mockFetch({
        [`GET ${BASE}/agents`]: () =>
          Response.json({ items: [AGENT_FIXTURE], has_more: false, continuation_token: null }),
      }),
    })

    await client.agents.list()
    expect(telemetryEvents).toHaveLength(1)
    expect(userHookCalls).toBe(1)
  })

  it('onLatency returns an unsubscribe function', async () => {
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      fetch: mockFetch({
        [`GET ${BASE}/agents`]: () =>
          Response.json({ items: [AGENT_FIXTURE], has_more: false, continuation_token: null }),
      }),
    })
    const events: LatencyEvent[] = []
    const unsubscribe = client.onLatency((e) => events.push(e))

    await client.agents.list()
    expect(events).toHaveLength(1)

    unsubscribe()
    await client.agents.list()
    expect(events).toHaveLength(1)
  })

  it('measureLatency collects events and reports total wall-clock time', async () => {
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      fetch: mockFetch({
        [`GET ${BASE}/agents`]: () =>
          Response.json(
            { items: [AGENT_FIXTURE], has_more: false, continuation_token: null },
            { headers: { 'X-Amigo-Server-Time-Ms': '42' } },
          ),
        [`GET ${BASE}/agents/${AGENT_FIXTURE.id}`]: () => Response.json(AGENT_FIXTURE),
      }),
    })

    const { result, events, totalMs } = await client.measureLatency(async () => {
      const first = await client.agents.list()
      const second = await client.agents.get(AGENT_FIXTURE.id)
      return { first, second }
    })

    expect(result.first.items).toHaveLength(1)
    expect(result.second.id).toBe(AGENT_FIXTURE.id)
    expect(events).toHaveLength(2)
    expect(totalMs).toBeGreaterThanOrEqual(0)
    expect(events.reduce((s, e) => s + (e.serverMs ?? 0), 0)).toBe(42)
  })

  it('swallows listener exceptions without affecting the caller', async () => {
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      telemetry: {
        onRequest: () => {
          throw new Error('listener boom')
        },
      },
      fetch: mockFetch({
        [`GET ${BASE}/agents`]: () =>
          Response.json({ items: [AGENT_FIXTURE], has_more: false, continuation_token: null }),
      }),
    })

    await expect(client.agents.list()).resolves.toBeDefined()
  })

  it('withOptions clones preserve telemetry subscriptions', async () => {
    const events: LatencyEvent[] = []
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      telemetry: { onRequest: (e) => events.push(e) },
      fetch: mockFetch({
        [`GET ${BASE}/agents`]: () =>
          Response.json({ items: [AGENT_FIXTURE], has_more: false, continuation_token: null }),
      }),
    })

    await client.withOptions({ timeout: 5_000 }).agents.list()
    expect(events).toHaveLength(1)
  })
})
