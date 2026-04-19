import { describe, it, expect } from 'vitest'
import { AmigoClient } from '../../src/index.js'

const TEST_API_KEY = 'test-api-key-abc123'
const TEST_WORKSPACE_ID = 'ws-00000000-0000-0000-0000-000000000001'

const ENTITY_ID = 'entity-00000000-0000-0000-0000-000000000001'

const DIMENSIONS_FIXTURE = {
  entity_id: ENTITY_ID,
  dimensions: [
    { name: 'preferences', avg_confidence: 0.85, fact_count: 12, dimension: 'preferences', description: null, latest_fact_at: null, source_count: 1, weight: 1.0 },
    { name: 'health_history', avg_confidence: 0.72, fact_count: 8, dimension: 'health_history', description: null, latest_fact_at: null, source_count: 1, weight: 1.0 },
    { name: 'communication_style', avg_confidence: 0.90, fact_count: 15, dimension: 'communication_style', description: null, latest_fact_at: null, source_count: 1, weight: 1.0 },
  ],
}

const FACTS_FIXTURE = {
  entity_id: ENTITY_ID,
  facts: [
    {
      id: 'fact-001',
      dimension: 'preferences',
      key: 'preferred_appointment_time',
      value: 'morning',
      confidence: 0.92,
      source: 'call:CA123',
      extracted_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 'fact-002',
      dimension: 'preferences',
      key: 'language',
      value: 'Spanish',
      confidence: 0.98,
      source: 'call:CA456',
      extracted_at: '2026-01-02T00:00:00Z',
    },
  ],
}

const ANALYTICS_FIXTURE = {
  workspace_id: TEST_WORKSPACE_ID,
  total_entities_with_memory: 450,
  total_facts: 3200,
  avg_dimensions_per_entity: 4.2,
  coverage_by_dimension: [
    { dimension: 'preferences', entity_coverage_pct: 0.78 },
    { dimension: 'health_history', entity_coverage_pct: 0.55 },
  ],
  facts_ingested_last_7d: 320,
}

function mockFetch(routes: Record<string, () => Response | Promise<Response>>): typeof globalThis.fetch {
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
    return new Response(JSON.stringify({ detail: `No mock for ${method} ${pathname}` }), { status: 500 })
  }
}

const BASE = `/v1/${TEST_WORKSPACE_ID}`

const client = new AmigoClient({
  apiKey: TEST_API_KEY,
  workspaceId: TEST_WORKSPACE_ID,
  fetch: mockFetch({
    [`GET ${BASE}/memory/${ENTITY_ID}/dimensions`]: () =>
      Response.json(DIMENSIONS_FIXTURE),

    [`GET ${BASE}/memory/${ENTITY_ID}/facts`]: () =>
      Response.json(FACTS_FIXTURE),

    [`GET ${BASE}/memory/analytics`]: () =>
      Response.json(ANALYTICS_FIXTURE),
  }),
})

describe('MemoryResource', () => {
  it('gets entity dimensions', async () => {
    const result = await client.memory.getEntityDimensions(ENTITY_ID)
    expect(result.entity_id).toBe(ENTITY_ID)
    expect(result.dimensions).toHaveLength(3)
    expect(result.dimensions[0]?.name).toBe('preferences')
    expect(result.dimensions[0]?.avg_confidence).toBe(0.85)
  })

  it('gets entity facts', async () => {
    const result = await client.memory.getEntityFacts(ENTITY_ID)
    expect(result.entity_id).toBe(ENTITY_ID)
    expect(result.facts).toHaveLength(2)
    // @ts-expect-error fixture field
    expect(result.facts[0]?.key).toBe('preferred_appointment_time')
    // @ts-expect-error fixture field
    expect(result.facts[0]?.value).toBe('morning')
  })

  it('gets entity facts with dimension filter', async () => {
    const result = await client.memory.getEntityFacts(ENTITY_ID, {
      dimension: 'preferences',
      limit: 10,
    })
    expect(result.facts).toHaveLength(2)
  })

  it('gets memory analytics', async () => {
    const result = await client.memory.getAnalytics()
    // @ts-expect-error fixture field
    expect(result.workspace_id).toBe(TEST_WORKSPACE_ID)
    expect(result.total_entities_with_memory).toBe(450)
    expect(result.total_facts).toBe(3200)
    // @ts-expect-error fixture field
    expect(result.coverage_by_dimension).toHaveLength(2)
    // @ts-expect-error fixture field
    expect(result.facts_ingested_last_7d).toBe(320)
  })
})
