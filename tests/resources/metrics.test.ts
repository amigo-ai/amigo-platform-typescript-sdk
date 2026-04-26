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

const METRIC_VALUES_FIXTURE: MetricListResponse = {
  metrics: [
    {
      metric_key: 'voice_quality_score',
      metric_type: 'numerical',
      period_start: '2026-04-24T00:00:00Z',
      period_end: '2026-04-25T00:00:00Z',
      value: 0.91,
      event_count: 30,
      avg_confidence: 0.94,
      unit: 'score',
      computed_at: '2026-04-25T12:00:00Z',
    },
  ],
}

const METRIC_TREND_FIXTURE: MetricListResponse = {
  metrics: [
    {
      metric_key: 'voice_quality_score',
      metric_type: 'numerical',
      period_start: '2026-04-12T00:00:00Z',
      period_end: '2026-04-13T00:00:00Z',
      value: 0.77,
      event_count: 14,
      avg_confidence: 0.88,
      unit: 'score',
      computed_at: '2026-04-13T12:00:00Z',
    },
  ],
}

type RouteHandler = (request: Request) => Response | Promise<Response>

function mockFetch(routes: Record<string, RouteHandler>): typeof globalThis.fetch {
  return async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    let request: Request
    if (input instanceof Request) {
      request = input
    } else {
      request = new Request(input, init)
    }
    const { pathname } = new URL(request.url)
    const method = request.method.toUpperCase()
    for (const [pattern, handler] of Object.entries(routes)) {
      const [pMethod, ...pPathParts] = pattern.split(' ')
      if (pMethod === method && pPathParts.join(' ') === pathname) return handler(request)
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
    [`GET ${BASE}/metrics/voice_quality_score`]: (request) => {
      const searchParams = new URL(request.url).searchParams

      expect(searchParams.get('date_from')).toBe('2026-04-01T00:00:00Z')
      expect(searchParams.get('date_to')).toBe('2026-04-26T00:00:00Z')
      expect(searchParams.get('limit')).toBe('30')

      return Response.json(METRIC_VALUES_FIXTURE)
    },
    [`GET ${BASE}/metrics/voice_quality_score/trend`]: (request) => {
      const searchParams = new URL(request.url).searchParams

      expect(searchParams.get('days')).toBe('14')

      return Response.json(METRIC_TREND_FIXTURE)
    },
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
    expect(result.metrics[0]?.event_count).toBe(30)
    expect(result.metrics[0]?.value).toBe(0.91)
  })

  it('gets a metric trend', async () => {
    const result = await client.metrics.getTrend('voice_quality_score', { days: 14 })

    expect(result.metrics[0]?.metric_key).toBe('voice_quality_score')
    expect(result.metrics[0]?.period_start).toBe('2026-04-12T00:00:00Z')
    expect(result.metrics[0]?.value).toBe(0.77)
  })

  it('exposes a discriminated MetricValue type', () => {
    const value: MetricValue = METRIC_LIST_FIXTURE.metrics[2]!

    expect(value.metric_type).toBe('boolean')
    if (value.metric_type === 'boolean') {
      const resolved: boolean | null = value.value
      expect(resolved).toBe(true)
    } else {
      throw new Error(`Expected boolean metric value, received ${value.metric_type}`)
    }
  })
})
