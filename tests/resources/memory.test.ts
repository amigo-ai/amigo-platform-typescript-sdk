import { describe, it, expect } from 'vitest'
import { AmigoClient } from '../../src/index.js'

const TEST_API_KEY = 'test-api-key-abc123'
const TEST_WORKSPACE_ID = 'ws-00000000-0000-0000-0000-000000000001'

const ENTITY_ID = 'entity-00000000-0000-0000-0000-000000000001'

const DIMENSIONS_FIXTURE = {
  entity_id: ENTITY_ID,
  total_facts: 35,
  dimensions: [
    { name: 'preferences', avg_confidence: 0.85, fact_count: 12, dimension: 'preferences', description: null, latest_fact_at: null, source_count: 1, weight: 1.0 },
    { name: 'health_history', avg_confidence: 0.72, fact_count: 8, dimension: 'health_history', description: null, latest_fact_at: null, source_count: 1, weight: 1.0 },
    { name: 'communication_style', avg_confidence: 0.90, fact_count: 15, dimension: 'communication_style', description: null, latest_fact_at: null, source_count: 1, weight: 1.0 },
  ],
}

const FACTS_FIXTURE = {
  entity_id: ENTITY_ID,
  dimension: null,
  total: 2,
  facts: [
    {
      dimension: 'preferences',
      confidence: 0.92,
      data: { preferred_appointment_time: 'morning' },
      event_type: 'call.ended',
      extracted_text: 'preferred_appointment_time: morning',
      ingested_at: '2026-01-01T00:00:00Z',
      source: 'call:CA123',
    },
    {
      dimension: 'preferences',
      confidence: 0.98,
      data: { language: 'Spanish' },
      event_type: 'call.ended',
      extracted_text: 'language: Spanish',
      ingested_at: '2026-01-02T00:00:00Z',
      source: 'call:CA456',
    },
  ],
}

const ANALYTICS_FIXTURE = {
  active_dimensions: 3,
  builtin_dimensions: 2,
  coverage_rate: 0.78,
  custom_dimensions: 1,
  dimensions: [],
  facts_last_24h: 45,
  facts_last_7d: 320,
  facts_last_30d: 1200,
  llm_dimensions: 1,
  top_sources: [],
  total_entities_in_workspace: 600,
  total_entities_with_memory: 450,
  total_facts: 3200,
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
    expect(result.facts[0]?.dimension).toBe('preferences')
    expect(result.facts[0]?.confidence).toBe(0.92)
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
    expect(result.total_entities_with_memory).toBe(450)
    expect(result.total_facts).toBe(3200)
    expect(result.coverage_rate).toBe(0.78)
    expect(result.facts_last_7d).toBe(320)
  })
})
