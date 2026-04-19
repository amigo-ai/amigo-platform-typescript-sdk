import { describe, it, expect } from 'vitest'
import { AmigoClient } from '../../src/index.js'
import { NotFoundError } from '../../src/core/errors.js'

const TEST_API_KEY = 'test-api-key-abc123'
const TEST_WORKSPACE_ID = 'ws-00000000-0000-0000-0000-000000000001'

const SESSION_ID = 'sim-00000000-0000-0000-0000-000000000001'
const AGENT_ID = 'agent-00000000-0000-0000-0000-000000000001'

const SESSION_FIXTURE = {
  session_id: SESSION_ID,
  workspace_id: TEST_WORKSPACE_ID,
  agent_id: AGENT_ID,
  greeting: 'Hello! Thank you for calling Acme Health. How can I help you today?',
  snapshot: {
    turn_count: 0,
    state: 'greeting',
    context: {},
  },
  created_at: '2026-01-01T00:00:00Z',
}

const STEP_RESULT_FIXTURE = {
  observation: {
    agent_text: 'I can help you schedule an appointment. What date works best for you?',
    is_terminal: false,
    tools_called: [],
  },
  snapshot: {
    turn_count: 1,
    state: 'collect_info',
    context: { topic: 'appointment_scheduling' },
  },
}

const RECOMMEND_FIXTURE = {
  session_id: SESSION_ID,
  suggestions: [
    { text: "I'd like to schedule an appointment for next Tuesday", category: 'happy_path' },
    { text: 'What insurance do you accept?', category: 'clarification' },
    { text: 'I need to cancel my existing appointment', category: 'edge_case' },
  ],
}

const INTELLIGENCE_FIXTURE = {
  session_id: SESSION_ID,
  intelligence: {
    summary: 'Patient called to schedule a routine check-up.',
    sentiment: 'positive',
    quality_score: 0.92,
  },
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
    [`POST ${BASE}/simulations/sessions`]: () =>
      Response.json(SESSION_FIXTURE, { status: 201 }),

    [`GET ${BASE}/simulations/sessions/${SESSION_ID}`]: () =>
      Response.json(SESSION_FIXTURE),

    [`GET ${BASE}/simulations/sessions/not-found`]: () =>
      Response.json({ detail: 'Session not found', error_code: 'not_found' }, { status: 404 }),

    [`DELETE ${BASE}/simulations/sessions/${SESSION_ID}`]: () =>
      Response.json({ deleted: true }),

    [`POST ${BASE}/simulations/sessions/step`]: () =>
      Response.json(STEP_RESULT_FIXTURE),

    [`POST ${BASE}/simulations/sessions/recommend`]: () =>
      Response.json(RECOMMEND_FIXTURE),

    [`GET ${BASE}/simulations/sessions/${SESSION_ID}/intelligence`]: () =>
      Response.json(INTELLIGENCE_FIXTURE),
  }),
})

describe('SimulationsResource', () => {
  it('creates a simulation session', async () => {
    const result = await client.simulations.createSession({
      agent_id: AGENT_ID,
    } as never)
    expect(result.session_id).toBe(SESSION_ID)
    expect(result.greeting).toContain('Acme Health')
    expect(result.snapshot.turn_count).toBe(0)
  })

  it('gets a simulation session', async () => {
    const result = await client.simulations.getSession(SESSION_ID)
    expect(result.session_id).toBe(SESSION_ID)
    expect(result.agent_id).toBe(AGENT_ID)
  })

  it('throws NotFoundError for missing session', async () => {
    await expect(client.simulations.getSession('not-found')).rejects.toThrow(NotFoundError)
  })

  it('deletes a simulation session', async () => {
    const result = await client.simulations.deleteSession(SESSION_ID)
    expect(result.deleted).toBe(true)
  })

  it('steps through a simulation turn', async () => {
    const result = await client.simulations.step({
      session_id: SESSION_ID,
      caller_message: "I'd like to schedule an appointment",
    } as never)
    expect(result.observation).toBeDefined()
    expect(result.observation.agent_text).toContain('schedule an appointment')
    expect(result.snapshot).toBeDefined()
  })

  it('gets caller message recommendations', async () => {
    const result = await client.simulations.recommend({
      session_id: SESSION_ID,
    } as never)
    expect(result.session_id).toBe(SESSION_ID)
  })

  it('gets session intelligence', async () => {
    const result = await client.simulations.getIntelligence(SESSION_ID)
    expect(result.session_id).toBe(SESSION_ID)
    expect(result.intelligence).toBeDefined()
  })
})
