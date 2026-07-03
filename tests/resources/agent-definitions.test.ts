import { describe, it, expect } from 'vitest'
import { AmigoClient } from '../../src/index.js'

const TEST_API_KEY = 'test-api-key-abc123'
const TEST_WORKSPACE_ID = 'ws-00000000-0000-0000-0000-000000000001'
const DEF_ID = 'def-00000000-0000-0000-0000-000000000001'
const BASE = `/v1/${TEST_WORKSPACE_ID}`

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

const SUMMARY = {
  definition_id: DEF_ID,
  framework: 'claude-agent-sdk',
  name: 'triage',
  status: 'active',
}

const client = new AmigoClient({
  apiKey: TEST_API_KEY,
  workspaceId: TEST_WORKSPACE_ID,
  fetch: mockFetch({
    [`GET ${BASE}/agent-definitions`]: () =>
      Response.json({ items: [SUMMARY], has_more: false, continuation_token: null }),
    [`POST ${BASE}/agent-definitions`]: () =>
      Response.json({
        definition_id: DEF_ID,
        framework: 'claude-agent-sdk',
        created: true,
        version: 1,
        has_write_tools: false,
        agent_count: 1,
      }),
    [`POST ${BASE}/agent-definitions/validate`]: () =>
      Response.json({
        valid: true,
        framework: 'claude-agent-sdk',
        has_write_tools: false,
        agent_count: 1,
      }),
    [`GET ${BASE}/agent-definitions/${DEF_ID}`]: () => Response.json({ ...SUMMARY, versions: [] }),
    [`GET ${BASE}/agent-definitions/${DEF_ID}/versions/1`]: () =>
      Response.json({
        definition_id: DEF_ID,
        framework: 'claude-agent-sdk',
        version: 1,
        body: { system_prompt: 'hi' },
        body_sha256: 'abc',
        validator_rev: '1',
        has_write_tools: false,
        agent_count: 1,
      }),
    [`DELETE ${BASE}/agent-definitions/${DEF_ID}`]: () => new Response(null, { status: 204 }),
  }),
})

describe('AgentDefinitionsResource', () => {
  it('list() returns the registry page', async () => {
    const res = await client.agentDefinitions.list({ include_archived: true })
    expect(res.items).toHaveLength(1)
    expect(res.items[0]?.definition_id).toBe(DEF_ID)
  })

  it('listAutoPaging() yields each definition', async () => {
    const seen: string[] = []
    for await (const def of client.agentDefinitions.listAutoPaging()) {
      seen.push(def.definition_id)
    }
    expect(seen).toEqual([DEF_ID])
  })

  it('register() pushes a native definition', async () => {
    const res = await client.agentDefinitions.register({
      name: 'triage',
      body: {
        framework: 'claude-agent-sdk',
        system_prompt: 'You are a scheduler.',
        model: 'claude-opus-4-7',
        allowed_world_tools: ['world_read'],
      },
    })
    expect(res.created).toBe(true)
    expect(res.version).toBe(1)
  })

  it('validate() is a dry run', async () => {
    const res = await client.agentDefinitions.validate({
      name: 'triage',
      body: {
        framework: 'claude-agent-sdk',
        system_prompt: 'You are a scheduler.',
        model: 'claude-opus-4-7',
        allowed_world_tools: ['world_read'],
      },
    })
    expect(res.valid).toBe(true)
  })

  it('get() + getVersion() fetch a definition and its version body', async () => {
    const def = await client.agentDefinitions.get(DEF_ID)
    expect(def.name).toBe('triage')
    const version = await client.agentDefinitions.getVersion(DEF_ID, 1)
    expect(version.version).toBe(1)
    expect(version.body).toBeDefined()
  })

  it('archive() deletes a definition', async () => {
    await expect(client.agentDefinitions.archive(DEF_ID)).resolves.toBeUndefined()
  })

  it('register() serializes the definition body over the wire', async () => {
    let capturedBody: Record<string, unknown> | undefined
    const capturing = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      fetch: async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
        // The client dispatches a Request object, so the body lives on it (not
        // on `init`). Fall back to `init.body` for the string-input case.
        let raw: string | undefined
        if (input instanceof Request) {
          raw = await input.clone().text()
        } else if (typeof init?.body === 'string') {
          raw = init.body
        }
        capturedBody = raw ? (JSON.parse(raw) as Record<string, unknown>) : undefined
        return Response.json({
          definition_id: DEF_ID,
          framework: 'claude-agent-sdk',
          created: true,
          version: 1,
          has_write_tools: false,
          agent_count: 1,
        })
      },
    })
    await capturing.agentDefinitions.register({
      name: 'triage',
      body: {
        framework: 'claude-agent-sdk',
        system_prompt: 'You are a scheduler.',
        model: 'claude-opus-4-7',
        allowed_world_tools: ['world_read'],
      },
    })
    expect(capturedBody?.name).toBe('triage')
    const body = capturedBody?.body as Record<string, unknown>
    expect(body?.model).toBe('claude-opus-4-7')
    expect(body?.allowed_world_tools).toContain('world_read')
  })
})
