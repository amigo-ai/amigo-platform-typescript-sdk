import { describe, it, expect } from 'vitest'
import { AmigoClient } from '../../src/index.js'
import { mockFetch } from '../helpers/mock-fetch.js'

const TEST_API_KEY = 'test-api-key'
const TEST_WORKSPACE_ID = 'ws-00000000-0000-0000-0000-000000000001'
const SERVICE_ID = 'svc-001'
const BASE = `/v1/${TEST_WORKSPACE_ID}`


const client = new AmigoClient({
  apiKey: TEST_API_KEY,
  workspaceId: TEST_WORKSPACE_ID,
  fetch: mockFetch({
    [`POST ${BASE}/tools/execute`]: () => Response.json({ ok: true, output: {} }),
    [`GET ${BASE}/services/${SERVICE_ID}/tools/resolve`]: () => Response.json({ tools: [] }),
  }),
})

describe('ToolsResource', () => {
  it('executes a tool', async () => {
    const result = await client.tools.execute({} as Parameters<typeof client.tools.execute>[0])
    expect(result).toMatchObject({ ok: true })
  })

  it('resolves bindings for a service', async () => {
    expect(await client.tools.resolveForService(SERVICE_ID)).toMatchObject({ tools: [] })
  })
})
