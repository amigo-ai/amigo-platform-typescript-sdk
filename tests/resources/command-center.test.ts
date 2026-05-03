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
    [`GET ${BASE}/command-center`]: () =>
      Response.json({ active_calls: 12, queue_depth: 3, escalations: [] }),
  }),
})

describe('CommandCenterResource', () => {
  it('gets the snapshot', async () => {
    const snap = await client.commandCenter.get()
    expect(snap).toMatchObject({ active_calls: 12, queue_depth: 3 })
  })
})
