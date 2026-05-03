import { describe, it, expect } from 'vitest'
import { AmigoClient } from '../../src/index.js'
import { mockFetch } from '../helpers/mock-fetch.js'

const TEST_API_KEY = 'test-api-key'
const TEST_WORKSPACE_ID = 'ws-00000000-0000-0000-0000-000000000001'
const BASE = `/v1/${TEST_WORKSPACE_ID}`


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
