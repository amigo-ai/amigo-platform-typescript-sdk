import { describe, it, expect } from 'vitest'
import type { components } from '../../src/generated/api.js'
import { AmigoClient } from '../../src/index.js'

const TEST_API_KEY = 'test-api-key-abc123'
const TEST_WORKSPACE_ID = 'ws-00000000-0000-0000-0000-000000000001'

const DASHBOARD_FIXTURE = {
  workspace_id: TEST_WORKSPACE_ID,
  total_calls: 150,
  avg_duration_seconds: 240,
  sentiment_score: 0.78,
  period_days: 7,
}

const CALLS_FIXTURE = {
  workspace_id: TEST_WORKSPACE_ID,
  total_calls: 150,
  total_duration_seconds: 36000,
  avg_duration_seconds: 240,
  period_start: '2026-01-01',
  period_end: '2026-01-07',
  calls_by_date: [
    { date: '2026-01-01', count: 20, avg_duration_seconds: 240 },
  ],
}

const AGENTS_FIXTURE = {
  workspace_id: TEST_WORKSPACE_ID,
  agents: [
    { agent_id: 'agent-001', agent_name: 'Scheduler', total_calls: 80, avg_duration_seconds: 200, completed_calls: 75, completion_rate: 0.94 },
  ],
}

const CALL_QUALITY_FIXTURE = {
  workspace_id: TEST_WORKSPACE_ID,
  avg_sentiment: 0.78,
  avg_transcription_confidence: 0.92,
  flagged_calls: 3,
}

const EMOTION_TRENDS_FIXTURE = {
  workspace_id: TEST_WORKSPACE_ID,
  timeseries: [
    { timestamp: '2026-01-01T00:00:00Z', positive: 0.6, neutral: 0.3, negative: 0.1 },
  ],
}

const LATENCY_FIXTURE = {
  workspace_id: TEST_WORKSPACE_ID,
  avg_ttfb_ms: 320,
  avg_response_time_ms: 850,
}

const TOOL_PERFORMANCE_FIXTURE = {
  workspace_id: TEST_WORKSPACE_ID,
  tools: [
    { name: 'book_appointment', success_rate: 0.95, avg_latency_ms: 450 },
  ],
}

const DATA_QUALITY_FIXTURE = {
  confidence_by_source: {
    connector: [
      { confidence_range: 'raw', count: 40 },
      { confidence_range: 'verified', count: 60 },
    ],
    manual: [
      { confidence_range: 'authoritative', count: 25 },
    ],
  },
  confidence_distribution: [
    { confidence_range: 'verified', count: 88 },
    { confidence_range: 'raw', count: 12 },
  ],
  period_start: '2026-01-01',
  period_end: '2026-01-07',
  review_pipeline: {
    pending_reviews: 5,
    approved_7d: 42,
    rejected_7d: 3,
  },
  timeseries: [
    { date: '2026-01-01', avg_confidence: 0.85, event_count: 100 },
  ],
  total_events: 100,
  workspace_id: TEST_WORKSPACE_ID,
} satisfies components['schemas']['DataQualityResponse']

const USAGE_FIXTURE = {
  workspace_id: TEST_WORKSPACE_ID,
  buckets: [
    { event_type: 'call.started', event_date: '2026-01-01', count: 50 },
  ],
  period_start: '2026-01-01',
  period_end: '2026-01-07',
  total_events: 25000,
}

const EVENT_BREAKDOWN_FIXTURE = {
  workspace_id: TEST_WORKSPACE_ID,
  by_type: [
    { key: 'call.started', count: 150 },
    { key: 'call.ended', count: 148 },
  ],
  by_source: [],
  period_start: '2026-01-01',
  period_end: '2026-01-07',
  total_events: 298,
}

const SAFETY_TRENDS_FIXTURE = {
  workspace_id: TEST_WORKSPACE_ID,
  risk_distribution: { low: 120, medium: 25, high: 5 },
  timeseries: [],
}

const OPERATOR_PERFORMANCE_FIXTURE = {
  summary: {
    escalated_count: 12,
    escalation_rate: 0.08,
    operator_handled_count: 10,
    total_calls: 150,
    avg_escalated_duration_seconds: 300,
    avg_escalated_quality_score: 0.85,
    avg_non_escalated_quality_score: 0.90,
  },
  trend: [
    { date: '2026-01-01', escalated_count: 3, total_calls: 20 },
  ],
}

const ADVANCED_CALL_STATS_FIXTURE = {
  workspace_id: TEST_WORKSPACE_ID,
  abandonment_rate: 0.05,
  transfer_rate: 0.12,
  avg_silence_seconds: 3.2,
}

const COMPARISON_FIXTURE = {
  workspace_id: TEST_WORKSPACE_ID,
  current: { total_calls: 150, avg_duration_seconds: 240 },
  previous: { total_calls: 120, avg_duration_seconds: 220 },
  delta: { total_calls: 30, avg_duration_seconds: 20 },
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
    [`GET ${BASE}/analytics/dashboard`]: () => Response.json(DASHBOARD_FIXTURE),
    [`GET ${BASE}/analytics/calls`]: () => Response.json(CALLS_FIXTURE),
    [`GET ${BASE}/analytics/agents`]: () => Response.json(AGENTS_FIXTURE),
    [`GET ${BASE}/analytics/call-quality`]: () => Response.json(CALL_QUALITY_FIXTURE),
    [`GET ${BASE}/analytics/emotion-trends`]: () => Response.json(EMOTION_TRENDS_FIXTURE),
    [`GET ${BASE}/analytics/latency`]: () => Response.json(LATENCY_FIXTURE),
    [`GET ${BASE}/analytics/tool-performance`]: () => Response.json(TOOL_PERFORMANCE_FIXTURE),
    [`GET ${BASE}/analytics/data-quality`]: () => Response.json(DATA_QUALITY_FIXTURE),
    [`GET ${BASE}/analytics/usage`]: () => Response.json(USAGE_FIXTURE),
    [`GET ${BASE}/analytics/events`]: () => Response.json(EVENT_BREAKDOWN_FIXTURE),
    [`GET ${BASE}/analytics/safety-trends`]: () => Response.json(SAFETY_TRENDS_FIXTURE),
    [`GET ${BASE}/analytics/operator-performance`]: () => Response.json(OPERATOR_PERFORMANCE_FIXTURE),
    [`GET ${BASE}/analytics/calls/advanced`]: () => Response.json(ADVANCED_CALL_STATS_FIXTURE),
    [`GET ${BASE}/analytics/calls/comparison`]: () => Response.json(COMPARISON_FIXTURE),
  }),
})

describe('AnalyticsResource', () => {
  it('gets the dashboard', async () => {
    const result = await client.analytics.getDashboard()
    expect(result.total_calls).toBe(150)
    expect(result.period_days).toBe(7)
  })

  it('gets the dashboard with days param', async () => {
    const result = await client.analytics.getDashboard({ days: 30 })
    expect(result.total_calls).toBe(150)
  })

  it('gets call analytics', async () => {
    const result = await client.analytics.getCalls()
    expect(result.total_calls).toBe(150)
    expect(result.calls_by_date).toHaveLength(1)
  })

  it('gets call analytics with filter params', async () => {
    const result = await client.analytics.getCalls({
      days: 14,
      interval: '1d',
      date_from: '2026-01-01',
      date_to: '2026-01-14',
    })
    expect(result.total_calls).toBe(150)
  })

  it('gets agent analytics', async () => {
    const result = await client.analytics.getAgents()
    expect(result.agents).toHaveLength(1)
    expect(result.agents[0]?.agent_name).toBe('Scheduler')
  })

  it('gets call quality', async () => {
    const result = await client.analytics.getCallQuality()
    expect(result.avg_sentiment).toBe(0.78)
    expect(result.flagged_calls).toBe(3)
  })

  it('gets emotion trends', async () => {
    const result = await client.analytics.getEmotionTrends()
    const timeseries = result.timeseries as { positive: number }[]
    expect(timeseries).toHaveLength(1)
    expect(timeseries[0]?.positive).toBe(0.6)
  })

  it('gets latency metrics', async () => {
    const result = await client.analytics.getLatency()
    expect(result.avg_ttfb_ms).toBe(320)
    expect(result.avg_response_time_ms).toBe(850)
  })

  it('gets tool performance', async () => {
    const result = await client.analytics.getToolPerformance()
    const tools = result.tools as { success_rate: number }[]
    expect(tools).toHaveLength(1)
    expect(tools[0]?.success_rate).toBe(0.95)
  })

  it('gets data quality', async () => {
    const result = await client.analytics.getDataQuality()
    expect(result.confidence_distribution).toHaveLength(2)
    expect(result.period_start).toBe('2026-01-01')
    expect(Object.keys(result.confidence_by_source)).toEqual(['connector', 'manual'])
    expect(result.review_pipeline).toEqual({
      pending_reviews: 5,
      approved_7d: 42,
      rejected_7d: 3,
    })
  })

  it('gets usage', async () => {
    const result = await client.analytics.getUsage()
    expect(result.total_events).toBe(25000)
    expect(result.workspace_id).toBe(TEST_WORKSPACE_ID)
  })

  it('gets event breakdown', async () => {
    const result = await client.analytics.getEventBreakdown()
    expect(result.by_type).toHaveLength(2)
    expect(result.by_type[0]?.key).toBe('call.started')
  })

  it('gets safety trends', async () => {
    const result = await client.analytics.getSafetyTrends()
    expect(result.risk_distribution.high).toBe(5)
  })

  it('gets operator performance', async () => {
    const result = await client.analytics.getOperatorPerformance()
    expect(result.summary.escalated_count).toBe(12)
    expect(result.trend).toHaveLength(1)
  })

  it('gets advanced call stats', async () => {
    const result = await client.analytics.getAdvancedCallStats()
    expect(result.abandonment_rate).toBe(0.05)
    expect(result.transfer_rate).toBe(0.12)
  })

  it('compares call periods', async () => {
    const result = await client.analytics.compareCallPeriods({
      current_from: '2026-01-08',
      current_to: '2026-01-14',
      previous_from: '2026-01-01',
      previous_to: '2026-01-07',
    })
    const typed = result as typeof COMPARISON_FIXTURE
    expect(typed.workspace_id).toBe(TEST_WORKSPACE_ID)
    expect(typed.current).toEqual({ total_calls: 150, avg_duration_seconds: 240 })
    expect(typed.previous).toEqual({ total_calls: 120, avg_duration_seconds: 220 })
    expect(typed.delta).toEqual({ total_calls: 30, avg_duration_seconds: 20 })
  })
})
