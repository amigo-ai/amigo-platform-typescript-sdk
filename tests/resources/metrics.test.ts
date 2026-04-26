import { describe, expect, it } from 'vitest'
import {
  AmigoClient,
  type MetricCatalogResponse,
  type MetricListResponse,
  type MetricValue,
} from '../../src/index.js'

const TEST_API_KEY = 'test-api-key-abc123'
const TEST_WORKSPACE_ID = 'ws-00000000-0000-0000-0000-000000000001'
const BASE = `/v1/${TEST_WORKSPACE_ID}`

const METRIC_LIST_FIXTURE: MetricListResponse = {
  metrics: [
    {
      metric_key: 'voice_quality_score',
      metric_type: 'numerical',
      period_start: '2026-04-25T00:00:00Z',
      period_end: '2026-04-26T00:00:00Z',
      value: 0.87,
      event_count: 12,
      avg_confidence: 0.91,
      unit: 'score',
      computed_at: '2026-04-26T12:00:00Z',
    },
    {
      metric_key: 'dominant_sentiment',
      metric_type: 'categorical',
      period_start: '2026-04-25T00:00:00Z',
      period_end: '2026-04-26T00:00:00Z',
      value: 'positive',
      event_count: 12,
      avg_confidence: null,
      unit: null,
      computed_at: null,
    },
    {
      metric_key: 'call_resolved',
      metric_type: 'boolean',
      period_start: '2026-04-25T00:00:00Z',
      period_end: '2026-04-26T00:00:00Z',
      value: true,
      event_count: 12,
      avg_confidence: null,
      unit: null,
      computed_at: null,
    },
  ],
}

const METRIC_CATALOG_FIXTURE: MetricCatalogResponse = {
  metrics: [
    {
      key: 'voice_quality_score',
      name: 'Voice quality score',
      description: 'Overall voice quality score.',
      metric_type: 'numerical',
      extraction_mode: 'static',
      granularity: 'aggregate',
      model_tier: 'free',
      unit: 'score',
      has_prompt: false,
      builtin: true,
    },
  ],
}

function mockFetch(
  routes: Record<string, () => Response | Promise<Response>>,
): typeof globalThis.fetch {
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
    return new Response(JSON.stringify({ detail: `No mock for ${method} ${pathname}` }), {
      status: 500,
    })
  }
}

const client = new AmigoClient({
  apiKey: TEST_API_KEY,
  workspaceId: TEST_WORKSPACE_ID,
  fetch: mockFetch({
    [`GET ${BASE}/metrics`]: () => Response.json(METRIC_LIST_FIXTURE),
    [`GET ${BASE}/metrics/catalog`]: () => Response.json(METRIC_CATALOG_FIXTURE),
    [`GET ${BASE}/metrics/voice_quality_score`]: () => Response.json(METRIC_LIST_FIXTURE),
    [`GET ${BASE}/metrics/voice_quality_score/trend`]: () => Response.json(METRIC_LIST_FIXTURE),
  }),
})

describe('MetricsResource', () => {
  it('lists the latest typed metric values', async () => {
    const result = await client.metrics.listLatest()
    const first = result.metrics[0]

    expect(result.metrics).toHaveLength(3)
    expect(first?.metric_type).toBe('numerical')
    if (first?.metric_type === 'numerical') {
      const value: number | null = first.value
      expect(value).toBe(0.87)
    }
  })

  it('returns catalog entries', async () => {
    const result = await client.metrics.getCatalog()

    expect(result.metrics[0]?.key).toBe('voice_quality_score')
    expect(result.metrics[0]?.metric_type).toBe('numerical')
  })

  it('gets values for one metric', async () => {
    const result = await client.metrics.getValues('voice_quality_score', {
      date_from: '2026-04-01T00:00:00Z',
      date_to: '2026-04-26T00:00:00Z',
      limit: 30,
    })

    expect(result.metrics[0]?.metric_key).toBe('voice_quality_score')
  })

  it('gets a metric trend', async () => {
    const result = await client.metrics.getTrend('voice_quality_score', { days: 14 })

    expect(result.metrics[0]?.metric_key).toBe('voice_quality_score')
  })

  it('exposes a discriminated MetricValue type', () => {
    const value: MetricValue = METRIC_LIST_FIXTURE.metrics[2]!

    if (value.metric_type === 'boolean') {
      const resolved: boolean | null = value.value
      expect(resolved).toBe(true)
    }
  })
})
