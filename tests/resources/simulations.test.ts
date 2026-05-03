import { describe, it, expect } from 'vitest'
import { AmigoClient } from '../../src/index.js'
import { NotFoundError } from '../../src/core/errors.js'

const TEST_API_KEY = 'test-api-key-abc123'
const TEST_WORKSPACE_ID = 'ws-00000000-0000-0000-0000-000000000001'

const SESSION_ID = 'sim-00000000-0000-0000-0000-000000000001'
const AGENT_ID = 'agent-00000000-0000-0000-0000-000000000001'
const RUN_ID = 'run-00000000-0000-0000-0000-000000000001'
const SERVICE_ID = 'svc-00000000-0000-0000-0000-000000000001'

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
    [`POST ${BASE}/simulations/sessions`]: () => Response.json(SESSION_FIXTURE, { status: 201 }),

    [`GET ${BASE}/simulations/sessions/${SESSION_ID}`]: () => Response.json(SESSION_FIXTURE),

    [`GET ${BASE}/simulations/sessions/not-found`]: () =>
      Response.json({ detail: 'Session not found', error_code: 'not_found' }, { status: 404 }),

    [`DELETE ${BASE}/simulations/sessions/${SESSION_ID}`]: () =>
      Response.json({ status: 'destroyed' }),

    [`POST ${BASE}/simulations/sessions/step`]: () => Response.json(STEP_RESULT_FIXTURE),

    [`POST ${BASE}/simulations/sessions/recommend`]: () => Response.json(RECOMMEND_FIXTURE),

    [`GET ${BASE}/simulations/sessions/${SESSION_ID}/intelligence`]: () =>
      Response.json(INTELLIGENCE_FIXTURE),

    [`GET ${BASE}/simulations/runs`]: () => Response.json({ items: [{ id: RUN_ID }] }),
    [`POST ${BASE}/simulations/runs`]: () => Response.json({ id: RUN_ID }, { status: 201 }),
    [`GET ${BASE}/simulations/runs/${RUN_ID}`]: () =>
      Response.json({ id: RUN_ID, service_id: SERVICE_ID, status: 'running' }),
    [`POST ${BASE}/simulations/runs/${RUN_ID}/complete`]: () => Response.json({ ok: true }),
    [`POST ${BASE}/simulations/runs/${RUN_ID}/sessions`]: () => Response.json(SESSION_FIXTURE),

    [`POST ${BASE}/simulations/bridge/plan`]: () => Response.json({ candidates: [] }),
    [`POST ${BASE}/simulations/bridge`]: () => Response.json({ run_id: RUN_ID }),

    [`GET ${BASE}/simulations/services/${SERVICE_ID}/graph`]: () => Response.json({ nodes: [] }),
    [`DELETE ${BASE}/simulations/services/${SERVICE_ID}/graph`]: () => Response.json({ ok: true }),
    [`GET ${BASE}/simulations/services/${SERVICE_ID}/graph/paths`]: () =>
      Response.json({ paths: [] }),
    [`GET ${BASE}/simulations/services/${SERVICE_ID}/sessions`]: () => Response.json({ items: [] }),
    [`GET ${BASE}/simulations/services/${SERVICE_ID}/turns`]: () => Response.json({ items: [] }),
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
    expect(result.status).toBe('destroyed')
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
    expect(result.suggestions).toBeDefined()
  })

  it('gets session intelligence', async () => {
    const result = await client.simulations.getIntelligence(SESSION_ID)
    expect(result.session_id).toBe(SESSION_ID)
    expect(result.intelligence).toBeDefined()
  })

  describe('runs', () => {
    it('lists, creates, gets, completes, and adds sessions to a run', async () => {
      expect(await client.simulations.runs.list()).toMatchObject({ items: [{ id: RUN_ID }] })
      expect(
        await client.simulations.runs.create({} as Parameters<
          typeof client.simulations.runs.create
        >[0]),
      ).toMatchObject({ id: RUN_ID })
      expect(await client.simulations.runs.get(RUN_ID)).toMatchObject({
        id: RUN_ID,
        service_id: SERVICE_ID,
      })
      expect(await client.simulations.runs.complete(RUN_ID)).toMatchObject({ ok: true })
      expect(
        await client.simulations.runs.createSession(RUN_ID, {
          agent_id: AGENT_ID,
        } as never),
      ).toMatchObject({ session_id: SESSION_ID })
    })
  })

  describe('bridge', () => {
    it('plans and runs a bridge', async () => {
      expect(
        await client.simulations.bridge.plan({} as Parameters<
          typeof client.simulations.bridge.plan
        >[0]),
      ).toMatchObject({ candidates: [] })
      expect(
        await client.simulations.bridge.run({} as Parameters<
          typeof client.simulations.bridge.run
        >[0]),
      ).toMatchObject({ run_id: RUN_ID })
    })
  })

  describe('services', () => {
    it('graphs / paths / sessions / turns', async () => {
      expect(await client.simulations.services.getGraph(SERVICE_ID)).toMatchObject({ nodes: [] })
      expect(await client.simulations.services.deleteGraph(SERVICE_ID)).toMatchObject({
        ok: true,
      })
      expect(await client.simulations.services.getGraphPaths(SERVICE_ID)).toMatchObject({
        paths: [],
      })
      expect(await client.simulations.services.listSessions(SERVICE_ID)).toMatchObject({
        items: [],
      })
      expect(await client.simulations.services.listTurns(SERVICE_ID)).toMatchObject({
        items: [],
      })
    })
  })
})
