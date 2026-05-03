import { describe, it, expect } from 'vitest'
import { AmigoClient } from '../../src/index.js'
import { mockFetch } from '../helpers/mock-fetch.js'

const TEST_API_KEY = 'test-api-key'
const TEST_WORKSPACE_ID = 'ws-00000000-0000-0000-0000-000000000001'
const CALL_SID = 'CA1234567890abcdef1234567890abcdef'
const BASE = `/v1/${TEST_WORKSPACE_ID}`


const client = new AmigoClient({
  apiKey: TEST_API_KEY,
  workspaceId: TEST_WORKSPACE_ID,
  fetch: mockFetch({
    [`GET ${BASE}/sessions/active`]: () => Response.json({ sessions: [] }),
    [`POST ${BASE}/sessions/${CALL_SID}/inject`]: () =>
      Response.json({ status: 'queued', injection_id: 'inj-1' }),
  }),
})

describe('SessionsResource', () => {
  it('lists active sessions', async () => {
    expect(await client.sessions.listActive()).toMatchObject({ sessions: [] })
  })

  it('injects into a live call', async () => {
    const result = await client.sessions.inject(
      CALL_SID,
      {} as Parameters<typeof client.sessions.inject>[1],
    )
    expect(result).toMatchObject({ status: 'queued' })
  })
})
