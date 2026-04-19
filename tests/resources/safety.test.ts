import { describe, it, expect } from 'vitest'
import { AmigoClient } from '../../src/index.js'

const TEST_API_KEY = 'test-api-key-abc123'
const TEST_WORKSPACE_ID = 'ws-00000000-0000-0000-0000-000000000001'

const TEMPLATE_ID = 'tpl-00000000-0000-0000-0000-000000000001'

const CONFIG_FIXTURE = {
  accumulation_cumulative_count: 0,
  accumulation_enabled: true,
  accumulation_fast_track_level: 3,
  accumulation_mild_threshold: 0.8,
  accumulation_single_turn_threshold: 0.9,
  accumulation_window_size: 5,
  applied_template_ids: ['tpl-001'],
  triage_enabled: true,
  triage_max_history_turns: 10,
  triage_model: 'claude-sonnet',
  triage_timeout_s: 30,
}

const TEMPLATE_FIXTURE = {
  id: TEMPLATE_ID,
  name: 'HIPAA Healthcare',
  description: 'HIPAA-compliant safety configuration for healthcare workspaces',
  config: {
    escalation_enabled: true,
    risk_threshold: 0.7,
    pii_redaction_enabled: true,
    recording_consent_required: true,
  },
}

const APPLY_RESULT_FIXTURE = {
  created_concepts: ['keyword_safety', 'escalation_protocol'],
  skipped: [],
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
    [`GET ${BASE}/safety/config`]: () =>
      Response.json(CONFIG_FIXTURE),

    [`PUT ${BASE}/safety/config`]: () =>
      Response.json({ ...CONFIG_FIXTURE, accumulation_mild_threshold: 0.9 }),

    [`GET ${BASE}/safety/templates`]: () =>
      Response.json({ items: [TEMPLATE_FIXTURE], has_more: false, continuation_token: null }),

    [`GET ${BASE}/safety/templates/${TEMPLATE_ID}`]: () =>
      Response.json(TEMPLATE_FIXTURE),

    [`POST ${BASE}/safety/templates/${TEMPLATE_ID}/apply`]: () =>
      Response.json(APPLY_RESULT_FIXTURE),
  }),
})

describe('SafetyResource', () => {
  it('gets safety config', async () => {
    const result = await client.safety.getConfig()
    expect(result.accumulation_enabled).toBe(true)
    expect(result.accumulation_mild_threshold).toBe(0.8)
    expect(result.applied_template_ids).toContain('tpl-001')
  })

  it('updates safety config', async () => {
    const result = await client.safety.updateConfig({
      accumulation_mild_threshold: 0.9,
    } as never)
    expect(result.accumulation_mild_threshold).toBe(0.9)
  })

  it('lists safety templates', async () => {
    const result = await client.safety.listTemplates()
    expect(result).toBeDefined()
  })

  it('gets a safety template', async () => {
    const result = await client.safety.getTemplate(TEMPLATE_ID)
    expect(result.id).toBe(TEMPLATE_ID)
    expect(result.name).toBe('HIPAA Healthcare')
  })

  it('applies a safety template', async () => {
    const result = await client.safety.applyTemplate(TEMPLATE_ID, {} as never)
    expect(result.created_concepts).toBeDefined()
    expect(result.skipped).toBeDefined()
  })
})
