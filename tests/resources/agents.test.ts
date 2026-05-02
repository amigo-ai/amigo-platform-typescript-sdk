import { describe, it, expect } from 'vitest'
import { AmigoClient } from '../../src/index.js'
import { NotFoundError } from '../../src/core/errors.js'
import type { components } from '../../src/generated/api.js'

type CreateAgentVersionRequest = components['schemas']['CreateAgentVersionRequest']

const TEST_API_KEY = 'test-api-key-abc123'
const TEST_WORKSPACE_ID = 'ws-00000000-0000-0000-0000-000000000001'

const AGENT_FIXTURE = {
  id: 'agent-00000000-0000-0000-0000-000000000001',
  workspace_id: TEST_WORKSPACE_ID,
  name: 'Test Agent',
  description: 'A test agent',
  latest_version: 1,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

const AGENT_VERSION_FIXTURE = {
  id: 'av-00000000-0000-0000-0000-000000000001',
  workspace_id: TEST_WORKSPACE_ID,
  agent_id: AGENT_FIXTURE.id,
  version: 2,
  name: 'My Agent v2',
  initials: 'MA',
  identity: {
    name: 'My Agent',
    role: 'Assistant',
    developed_by: 'Acme',
    default_spoken_language: 'en',
    relationship_to_developer: {
      ownership: 'Acme',
      type: 'assistant',
      conversation_visibility: 'public',
      thought_visibility: 'private',
    },
  },
  voice_config: null,
  background: '',
  behaviors: [],
  communication_patterns: [],
  created_at: '2026-01-02T00:00:00Z',
  updated_at: '2026-01-02T00:00:00Z',
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
      const pPath = pPathParts.join(' ')
      if (pMethod === method && pathname === pPath) {
        return handler()
      }
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
    [`GET ${BASE}/agents`]: () =>
      Response.json({ items: [AGENT_FIXTURE], has_more: false, continuation_token: null }),

    [`POST ${BASE}/agents`]: () =>
      Response.json({ ...AGENT_FIXTURE, name: 'My Agent' }, { status: 201 }),

    [`GET ${BASE}/agents/${AGENT_FIXTURE.id}`]: () => Response.json(AGENT_FIXTURE),

    [`GET ${BASE}/agents/not-found`]: () =>
      Response.json({ detail: 'Agent not found', error_code: 'not_found' }, { status: 404 }),

    [`PUT ${BASE}/agents/${AGENT_FIXTURE.id}`]: () =>
      Response.json({ ...AGENT_FIXTURE, name: 'Updated Agent' }),

    [`DELETE ${BASE}/agents/${AGENT_FIXTURE.id}`]: () => new Response(null, { status: 204 }),

    [`POST ${BASE}/agents/${AGENT_FIXTURE.id}/versions`]: () =>
      Response.json(AGENT_VERSION_FIXTURE),
  }),
})

describe('AgentsResource', () => {
  it('lists agents', async () => {
    const result = await client.agents.list()
    expect(result.items).toHaveLength(1)
    expect(result.items[0]?.name).toBe('Test Agent')
    expect(result.has_more).toBe(false)
  })

  it('auto-pages agents', async () => {
    const pagedClient = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      fetch: async (input: string | URL | Request, init?: RequestInit) => {
        const request = input instanceof Request ? input : new Request(input, init)
        const url = new URL(request.url)
        const token = url.searchParams.get('continuation_token')

        if (token === '1') {
          return Response.json({
            items: [{ ...AGENT_FIXTURE, id: 'agent-2', name: 'Second Agent' }],
            has_more: false,
            continuation_token: null,
          })
        }

        return Response.json({
          items: [AGENT_FIXTURE],
          has_more: true,
          continuation_token: 1,
        })
      },
    })

    const names: string[] = []
    for await (const agent of pagedClient.agents.listAutoPaging({ limit: 1 })) {
      names.push(agent.name)
    }

    expect(names).toEqual(['Test Agent', 'Second Agent'])
  })

  it('creates an agent', async () => {
    const result = await client.agents.create({ name: 'My Agent', description: '' })
    expect(result.name).toBe('My Agent')
  })

  it('gets an agent by id', async () => {
    const result = await client.agents.get(AGENT_FIXTURE.id)
    expect(result.id).toBe(AGENT_FIXTURE.id)
  })

  it('throws NotFoundError for missing agent', async () => {
    await expect(client.agents.get('not-found')).rejects.toThrow(NotFoundError)
  })

  it('updates an agent', async () => {
    const result = await client.agents.update(AGENT_FIXTURE.id, { name: 'Updated Agent' })
    expect(result.name).toBe('Updated Agent')
  })

  it('deletes an agent', async () => {
    await expect(client.agents.delete(AGENT_FIXTURE.id)).resolves.toBeUndefined()
  })

  it('creates an agent version', async () => {
    const body: CreateAgentVersionRequest = {
      name: 'My Agent v2',
      background: '',
      behaviors: [],
      communication_patterns: [],
      initials: '',
      identity: {
        name: 'My Agent',
        role: 'Assistant',
        developed_by: 'Acme',
        default_spoken_language: 'en',
        relationship_to_developer: {
          ownership: 'Acme',
          type: 'assistant',
          conversation_visibility: 'public',
          thought_visibility: 'private',
        },
      },
    }
    const result = await client.agents.createVersion(AGENT_FIXTURE.id, body)
    expect(result.version).toBe(2)
    expect(result.agent_id).toBe(AGENT_FIXTURE.id)
  })
})
