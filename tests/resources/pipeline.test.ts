import { describe, it, expect } from 'vitest'
import { AmigoClient } from '../../src/index.js'
import { mockFetch } from '../helpers/mock-fetch.js'

const TEST_API_KEY = 'test-api-key'
const TEST_WORKSPACE_ID = 'ws-00000000-0000-0000-0000-000000000001'
const SOURCE_ID = 'src-001'
const DS_ID = 'ds-001'
const BASE = `/v1/${TEST_WORKSPACE_ID}`


const client = new AmigoClient({
  apiKey: TEST_API_KEY,
  workspaceId: TEST_WORKSPACE_ID,
  fetch: mockFetch({
    [`GET ${BASE}/pipeline/status`]: () => Response.json({ healthy: true }),
    [`GET ${BASE}/pipeline/throughput`]: () => Response.json({ buckets: [] }),
    [`GET ${BASE}/pipeline/review`]: () => Response.json({ pending: 0 }),
    [`GET ${BASE}/pipeline/entity-resolution`]: () => Response.json({ merge_rate: 0.1 }),
    [`GET ${BASE}/pipeline/outbound`]: () => Response.json([]),
    [`GET ${BASE}/pipeline/outbound/${DS_ID}/log`]: () =>
      Response.json({ items: [], has_more: false, continuation_token: null }),
    [`GET ${BASE}/pipeline/sources`]: () => Response.json([]),
    [`GET ${BASE}/pipeline/sources/${SOURCE_ID}/overview`]: () =>
      Response.json({ source_id: SOURCE_ID }),
    [`GET ${BASE}/pipeline/sources/${SOURCE_ID}/events`]: () =>
      Response.json({ items: [], has_more: false, continuation_token: null }),
    [`GET ${BASE}/pipeline/sources/${SOURCE_ID}/history`]: () => Response.json({ entries: [] }),
  }),
})

describe('PipelineResource', () => {
  it('gets top-level metrics', async () => {
    expect(await client.pipeline.getStatus()).toMatchObject({ healthy: true })
    expect(await client.pipeline.getThroughput()).toBeDefined()
    expect(await client.pipeline.getReview()).toMatchObject({ pending: 0 })
    expect(await client.pipeline.getEntityResolution()).toMatchObject({ merge_rate: 0.1 })
  })

  it('outbound: list + log', async () => {
    expect(await client.pipeline.outbound.list()).toBeDefined()
    expect(await client.pipeline.outbound.getLog(DS_ID)).toBeDefined()
  })

  it('sources: list / overview / events / history', async () => {
    expect(await client.pipeline.sources.list()).toBeDefined()
    expect(await client.pipeline.sources.getOverview(SOURCE_ID)).toMatchObject({
      source_id: SOURCE_ID,
    })
    expect(await client.pipeline.sources.listEvents(SOURCE_ID)).toBeDefined()
    expect(await client.pipeline.sources.getHistory(SOURCE_ID)).toBeDefined()
  })
})
