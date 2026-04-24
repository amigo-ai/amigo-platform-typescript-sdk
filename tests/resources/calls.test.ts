import { describe, it, expect } from 'vitest'
import { AmigoClient } from '../../src/index.js'
import { NotFoundError } from '../../src/core/errors.js'

const TEST_API_KEY = 'test-api-key-abc123'
const TEST_WORKSPACE_ID = 'ws-00000000-0000-0000-0000-000000000001'

const CALL_ID = 'call-00000000-0000-0000-0000-000000000001'

const CALL_FIXTURE = {
  id: CALL_ID,
  workspace_id: TEST_WORKSPACE_ID,
  call_sid: 'CA1234567890abcdef1234567890abcdef',
  agent_id: 'agent-00000000-0000-0000-0000-000000000001',
  direction: 'inbound',
  status: 'completed',
  from_number: '+14155551234',
  to_number: '+14155555678',
  duration_seconds: 342,
  started_at: '2026-01-15T10:30:00Z',
  ended_at: '2026-01-15T10:35:42Z',
  created_at: '2026-01-15T10:30:00Z',
}

const CALL_DETAIL_FIXTURE = {
  ...CALL_FIXTURE,
  turns: [
    { role: 'agent', text: 'Hello, how can I help you today?', timestamp: '2026-01-15T10:30:05Z' },
    {
      role: 'caller',
      text: 'I need to schedule an appointment.',
      timestamp: '2026-01-15T10:30:12Z',
    },
  ],
  escalation: null,
  safety: { flagged: false, categories: [] },
  recording: { available: true, duration_seconds: 342 },
}

const INTELLIGENCE_FIXTURE = {
  call_id: CALL_ID,
  call_sid: 'CA1234567890abcdef1234567890abcdef',
  conversation_summary: { total_turns: 10, agent_turns: 5, caller_turns: 5 },
  quality_score: 0.92,
  created_at: '2026-01-15T10:36:00Z',
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

const BASE = `/v1/${TEST_WORKSPACE_ID}`

const client = new AmigoClient({
  apiKey: TEST_API_KEY,
  workspaceId: TEST_WORKSPACE_ID,
  fetch: mockFetch({
    [`GET ${BASE}/calls`]: () =>
      Response.json({ items: [CALL_FIXTURE], has_more: false, continuation_token: null }),

    [`GET ${BASE}/calls/${CALL_ID}`]: () => Response.json(CALL_DETAIL_FIXTURE),

    [`GET ${BASE}/calls/not-found`]: () =>
      Response.json({ detail: 'Call not found', error_code: 'not_found' }, { status: 404 }),

    [`GET ${BASE}/calls/${CALL_ID}/intelligence`]: () => Response.json(INTELLIGENCE_FIXTURE),

    [`GET ${BASE}/calls/active/intelligence`]: () =>
      Response.json([
        { call_id: CALL_ID, caller_sentiment: 'positive', current_topic: 'scheduling' },
      ]),

    [`GET ${BASE}/calls/benchmarks`]: () =>
      Response.json({
        period_days: 30,
        total_calls: 1500,
        avg_duration_seconds: 280,
        avg_quality_score: 0.88,
      }),

    [`GET ${BASE}/calls/${CALL_ID}/trace-analysis`]: () =>
      Response.json({
        call_sid: 'CA1234567890abcdef1234567890abcdef',
        status: 'ready',
        summary: 'Patient called to schedule a follow-up appointment.',
      }),
  }),
})

describe('CallsResource', () => {
  it('lists calls', async () => {
    const result = await client.calls.list()
    expect(result.items).toHaveLength(1)
    expect(result.items[0]?.direction).toBe('inbound')
    expect(result.items[0]?.status).toBe('completed')
  })

  it('lists calls with filters', async () => {
    const result = await client.calls.list({ status: 'completed', direction: 'inbound' })
    expect(result.items).toHaveLength(1)
  })

  it('gets a call by id', async () => {
    const result = await client.calls.get(CALL_ID)
    expect(result.id).toBe(CALL_ID)
    expect(result.turns).toHaveLength(2)
    expect(result.duration_seconds).toBe(342)
  })

  it('throws NotFoundError for missing call', async () => {
    await expect(client.calls.get('not-found')).rejects.toThrow(NotFoundError)
  })

  it('gets call intelligence', async () => {
    const result = await client.calls.getIntelligence(CALL_ID)
    expect(result.call_id).toBe(CALL_ID)
    expect(result.quality_score).toBe(0.92)
  })

  it('gets active call intelligence', async () => {
    const result = await client.calls.getActiveIntelligence()
    expect(Array.isArray(result)).toBe(true)
    expect(result).toHaveLength(1)
  })

  it('gets call benchmarks', async () => {
    const result = await client.calls.getBenchmarks({ days: 30 })
    expect(result.total_calls).toBe(1500)
    expect(result.avg_quality_score).toBe(0.88)
  })

  it('gets trace analysis', async () => {
    const result = await client.calls.getTraceAnalysis(CALL_ID)
    expect(result.call_sid).toBe('CA1234567890abcdef1234567890abcdef')
    expect(result.summary).toContain('follow-up appointment')
  })
})
