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
  call_duration_seconds: 342,
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
  timeline: {
    duration_seconds: 4,
    timebase: { unit: 'seconds', origin: 'media_start', start: 0, end: 4 },
    lanes: [
      {
        id: 'tool:payer:eligibility:eligibility_lookup',
        track: 'tool',
        label: 'eligibility',
        order: 0,
        actor: {
          kind: 'tool',
          role: 'tool',
          label: 'eligibility',
          participant_id: 'payer:eligibility:eligibility_lookup',
        },
      },
    ],
    segments: [
      {
        type: 'tool_call',
        lane: 'events',
        lane_id: 'tool:payer:eligibility:eligibility_lookup',
        track: 'tool',
        actor: {
          kind: 'tool',
          role: 'tool',
          label: 'eligibility',
          participant_id: 'payer:eligibility:eligibility_lookup',
        },
        start: 1,
        end: 3,
        label: 'eligibility_lookup',
        turn_index: 0,
        order: 0,
        tool_name: 'eligibility_lookup',
        call_id: 'call-tool-1',
        integration_name: 'payer',
        endpoint_name: 'eligibility',
        protocol: 'rest',
        duration_ms: 2000,
        succeeded: true,
      },
    ],
    turns: [{ turn_index: 0, seek_to: 0, active_start: 0, active_end: 4 }],
  },
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

    [`GET ${BASE}/calls/${CALL_ID}/timeline`]: () => Response.json(CALL_DETAIL_FIXTURE.timeline),

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

    [`GET ${BASE}/calls/traces`]: () =>
      Response.json({ items: [], has_more: false, continuation_token: null }),

    [`GET ${BASE}/calls/${CALL_ID}/metrics`]: () => Response.json({ metrics: [] }),

    [`POST ${BASE}/calls/outbound`]: () =>
      Response.json({ call_id: CALL_ID }, { status: 202 }),
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
    expect(result.call_duration_seconds).toBe(342)
    expect(result.timeline?.timebase?.end).toBe(4)
    expect(result.timeline?.lanes?.[0]?.id).toBe('tool:payer:eligibility:eligibility_lookup')
    expect(result.timeline?.segments[0]?.lane_id).toBe('tool:payer:eligibility:eligibility_lookup')
  })

  it('throws NotFoundError for missing call', async () => {
    await expect(client.calls.get('not-found')).rejects.toThrow(NotFoundError)
  })

  it('gets a call timeline by id', async () => {
    const result = await client.calls.getTimeline(CALL_ID)
    expect(result.timebase?.end).toBe(4)
    expect(result.lanes?.[0]?.id).toBe('tool:payer:eligibility:eligibility_lookup')
    expect(result.segments[0]?.lane_id).toBe('tool:payer:eligibility:eligibility_lookup')
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

  it('lists traces (workspace-scoped feed)', async () => {
    const result = await client.calls.listTraces()
    expect(result?.items).toEqual([])
  })

  it('gets per-call metric values', async () => {
    const result = await client.calls.getMetrics(CALL_ID, { limit: 50 })
    expect(result?.metrics).toEqual([])
  })

  it('places an outbound call', async () => {
    const result = await client.calls.createOutbound({
      patient_entity_id: 'pat-1',
      phone_to: '+15551234567',
      reason: 'Appointment reminder',
    } as Parameters<typeof client.calls.createOutbound>[0])
    expect(result).toMatchObject({ call_id: CALL_ID })
  })
})
