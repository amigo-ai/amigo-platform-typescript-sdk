import { describe, it, expect } from 'vitest'
import { AmigoClient } from '../../src/index.js'

const TEST_API_KEY = 'test-api-key-abc123'
const TEST_WORKSPACE_ID = 'ws-00000000-0000-0000-0000-000000000001'

const ENTRY_FIXTURE = {
  event_id: '11111111-1111-1111-1111-111111111111',
  call_sid: 'CA_001',
  workspace_id: TEST_WORKSPACE_ID,
  effective_at: '2026-05-05T20:30:00Z',
  ingested_at: '2026-05-05T20:30:01Z',
  source: 'metering',
  source_system: 'voice-agent',
  prompt_type: 'engage_user',
  turn_index: 3,
  system_prompt: 'You are a helpful agent.',
  history: [{ role: 'user', content: 'Hi' }],
  full_prompt: 'Hi',
  llm_model: 'claude-opus-4-7',
  llm_response: 'Hello!',
  state_name: 'collect_dob',
  action: 'engage',
  tool_names: ['lookup_appointment'],
  has_tools: true,
  service_id: '22222222-2222-2222-2222-222222222222',
  session_id: 'sess_abc',
  data_parse_error: false,
}

function mockFetch(
  handler: (url: URL, method: string, init?: RequestInit) => Response | Promise<Response>,
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
    return handler(new URL(url), method, init)
  }
}

const BASE = `/v1/${TEST_WORKSPACE_ID}`

describe('PromptLogsResource', () => {
  it('list passes query params through to /v1/{ws}/prompt-logs', async () => {
    let capturedUrl: URL | null = null
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      fetch: mockFetch((url, _method) => {
        capturedUrl = url
        return Response.json({ items: [], count: 0, has_more: false })
      }),
    })

    await client.promptLogs.list({
      conversation_id: '33333333-3333-3333-3333-333333333333',
      prompt_type: 'engage_user',
      state_name: 'collect_dob',
      limit: 50,
      offset: 100,
    })

    expect(capturedUrl).not.toBeNull()
    const url = capturedUrl as unknown as URL
    expect(url.pathname).toBe(`${BASE}/prompt-logs`)
    expect(url.searchParams.get('conversation_id')).toBe('33333333-3333-3333-3333-333333333333')
    expect(url.searchParams.get('prompt_type')).toBe('engage_user')
    expect(url.searchParams.get('state_name')).toBe('collect_dob')
    expect(url.searchParams.get('limit')).toBe('50')
    expect(url.searchParams.get('offset')).toBe('100')
  })

  it('list returns the typed PromptLogListResponse shape', async () => {
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      fetch: mockFetch(() =>
        Response.json({
          items: [ENTRY_FIXTURE],
          count: 1,
          has_more: true,
          next_offset: 50,
          applied_time_window_days: 7,
          resolved_call_sid: 'CA_001',
          resolved_conversation_kind: 'call',
        }),
      ),
    })

    const page = await client.promptLogs.list()

    expect(page.items).toHaveLength(1)
    const first = page.items[0]
    if (first === undefined) throw new Error('expected one item')
    expect(first.event_id).toBe('11111111-1111-1111-1111-111111111111')
    expect(first.llm_model).toBe('claude-opus-4-7')
    expect(first.tool_names).toEqual(['lookup_appointment'])
    expect(page.has_more).toBe(true)
    expect(page.next_offset).toBe(50)
    expect(page.applied_time_window_days).toBe(7)
    expect(page.resolved_call_sid).toBe('CA_001')
    expect(page.resolved_conversation_kind).toBe('call')
  })

  it('listAutoPaging walks next_offset until has_more is false', async () => {
    const pages = [
      {
        items: [{ ...ENTRY_FIXTURE, event_id: 'p0-event' }],
        count: 1,
        has_more: true,
        next_offset: 1,
      },
      {
        items: [{ ...ENTRY_FIXTURE, event_id: 'p1-event' }],
        count: 1,
        has_more: true,
        next_offset: 2,
      },
      {
        items: [{ ...ENTRY_FIXTURE, event_id: 'p2-event' }],
        count: 1,
        has_more: false,
        next_offset: null,
      },
    ]
    const observedOffsets: string[] = []
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      fetch: mockFetch((url) => {
        const offset = url.searchParams.get('offset') ?? '0'
        observedOffsets.push(offset)
        const idx = Number.parseInt(offset, 10)
        return Response.json(pages[idx])
      }),
    })

    const collected: string[] = []
    for await (const entry of client.promptLogs.listAutoPaging()) {
      collected.push(entry.event_id as string)
    }

    expect(collected).toEqual(['p0-event', 'p1-event', 'p2-event'])
    expect(observedOffsets).toEqual(['0', '1', '2'])
  })

  it('listAutoPaging guards against a non-advancing next_offset', async () => {
    let calls = 0
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      fetch: mockFetch(() => {
        calls++
        return Response.json({
          items: [{ ...ENTRY_FIXTURE, event_id: `e-${calls}` }],
          count: 1,
          has_more: true,
          // Buggy backend: claims more results but offset never advances.
          next_offset: 0,
        })
      }),
    })

    const collected: string[] = []
    for await (const entry of client.promptLogs.listAutoPaging()) {
      collected.push(entry.event_id as string)
    }

    // Iterator must terminate on the non-advancing token (no infinite loop).
    expect(collected).toEqual(['e-1'])
    expect(calls).toBe(1)
  })
})
