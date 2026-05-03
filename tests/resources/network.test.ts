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
    [`GET ${BASE}/network/egress-ips`]: () => Response.json({ ips: ['10.0.0.1'] }),
  }),
})

describe('NetworkResource', () => {
  it('gets egress ips', async () => {
    expect(await client.network.getEgressIps()).toMatchObject({ ips: ['10.0.0.1'] })
  })
})
