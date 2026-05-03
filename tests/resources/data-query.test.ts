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
    [`GET ${BASE}/query/analytics/calls`]: () =>
      Response.json({ rows: [{ id: 'c1' }], next_offset: null }),
  }),
})

describe('DataQueryResource', () => {
  it('runs a query against a whitelisted dataset', async () => {
    const result = await client.dataQuery.run('analytics', 'calls', { limit: 50 })
    expect(result).toMatchObject({ rows: [{ id: 'c1' }] })
  })
})
