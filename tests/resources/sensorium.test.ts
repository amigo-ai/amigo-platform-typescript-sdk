import { describe, it, expect } from 'vitest'
import { AmigoClient } from '../../src/index.js'

const TEST_API_KEY = 'test-api-key'
const TEST_WORKSPACE_ID = 'ws-00000000-0000-0000-0000-000000000001'
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
    [`GET ${BASE}/sensorium/connector-health`]: () =>
      Response.json({ connectors: [{ name: 'twilio', status: 'healthy' }] }),
    [`GET ${BASE}/sensorium/loop-latency`]: () =>
      Response.json({ p50_ms: 220, p95_ms: 380, p99_ms: 640 }),
  }),
})

describe('SensoriumResource', () => {
  it('gets connector health', async () => {
    const health = await client.sensorium.getConnectorHealth()
    expect(health).toBeDefined()
  })

  it('gets loop latency', async () => {
    const lat = await client.sensorium.getLoopLatency()
    expect(lat).toMatchObject({ p50_ms: 220 })
  })
})
