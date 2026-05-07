import { describe, it, expect } from 'vitest'
import { AmigoClient } from '../../src/index.js'
import { NotFoundError } from '../../src/core/errors.js'

const TEST_API_KEY = 'test-api-key-abc123'
const TEST_WORKSPACE_ID = 'ws-00000000-0000-0000-0000-000000000001'

const TOOL_ID = 'tool-00000000-0000-0000-0000-000000000001'

const FORK_FIXTURE = {
  endpoint: 'fork-ws-00000000.lakebase.databricks.com',
  status: 'ready' as const,
  ttl_days: 7,
}

const QUERY_RESULT_FIXTURE = {
  columns: ['id', 'name'],
  rows: [
    { id: 'ent-001', name: 'John Doe' },
    { id: 'ent-002', name: 'Jane Smith' },
  ],
  row_count: 2,
}

const TOOL_FIXTURE = {
  id: TOOL_ID,
  workspace_id: TEST_WORKSPACE_ID,
  name: 'active-patients',
  description: 'List active patients',
  query: 'SELECT * FROM world.entities WHERE entity_type = :entity_type',
  parameters: { entity_type: { type: 'string', default: 'patient' } },
  enabled: true,
  target: 'lakebase' as const,
  created_at: '2026-05-01T00:00:00Z',
  updated_at: '2026-05-01T00:00:00Z',
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
    // Fork lifecycle
    [`GET ${BASE}/fork`]: () => Response.json(FORK_FIXTURE),

    [`POST ${BASE}/fork`]: () => Response.json(FORK_FIXTURE, { status: 201 }),

    [`DELETE ${BASE}/fork`]: () => new Response(null, { status: 204 }),

    // Query execution
    [`POST ${BASE}/lakebase/query`]: () => Response.json(QUERY_RESULT_FIXTURE),

    // Query tool CRUD
    [`GET ${BASE}/query-tools`]: () =>
      Response.json({ items: [TOOL_FIXTURE], has_more: false, continuation_token: null }),

    [`POST ${BASE}/query-tools`]: () => Response.json(TOOL_FIXTURE, { status: 201 }),

    [`PATCH ${BASE}/query-tools/${TOOL_ID}`]: () =>
      Response.json({ ...TOOL_FIXTURE, name: 'updated-patients' }),

    [`DELETE ${BASE}/query-tools/${TOOL_ID}`]: () => new Response(null, { status: 204 }),

    [`DELETE ${BASE}/query-tools/not-found`]: () =>
      Response.json({ detail: 'Tool not found', error_code: 'not_found' }, { status: 404 }),

    [`POST ${BASE}/query-tools/${TOOL_ID}/test`]: () => Response.json(QUERY_RESULT_FIXTURE),
  }),
})

describe('WorkspaceDatabaseResource', () => {
  // Fork lifecycle

  it('gets fork status', async () => {
    const result = await client.workspaceDatabase.getFork()
    expect(result?.endpoint).toBe('fork-ws-00000000.lakebase.databricks.com')
    expect(result?.status).toBe('ready')
  })

  it('creates a fork', async () => {
    const result = await client.workspaceDatabase.createFork({} as never)
    expect(result.endpoint).toBe('fork-ws-00000000.lakebase.databricks.com')
    expect(result.status).toBe('ready')
  })

  it('deletes a fork', async () => {
    await expect(client.workspaceDatabase.deleteFork()).resolves.toBeUndefined()
  })

  // Query execution

  it('executes a query', async () => {
    const result = await client.workspaceDatabase.executeQuery({
      sql: 'SELECT id, name FROM world.entities LIMIT 10',
    } as never)
    expect(result.columns).toEqual(['id', 'name'])
    expect(result.row_count).toBe(2)
  })

  // Query tool CRUD

  it('lists query tools', async () => {
    const result = await client.workspaceDatabase.listQueryTools()
    expect(result.items).toHaveLength(1)
    expect(result.items[0]?.name).toBe('active-patients')
  })

  it('creates a query tool', async () => {
    const result = await client.workspaceDatabase.createQueryTool({
      name: 'active-patients',
      description: 'List active patients',
      query: 'SELECT * FROM world.entities WHERE entity_type = :entity_type',
    } as never)
    expect(result.id).toBe(TOOL_ID)
    expect(result.name).toBe('active-patients')
  })

  it('updates a query tool', async () => {
    const result = await client.workspaceDatabase.updateQueryTool(TOOL_ID, {
      name: 'updated-patients',
    } as never)
    expect(result.name).toBe('updated-patients')
  })

  it('deletes a query tool', async () => {
    await expect(client.workspaceDatabase.deleteQueryTool(TOOL_ID)).resolves.toBeUndefined()
  })

  it('throws NotFoundError for missing query tool', async () => {
    await expect(client.workspaceDatabase.deleteQueryTool('not-found')).rejects.toThrow(
      NotFoundError,
    )
  })

  it('tests a query tool', async () => {
    const result = await client.workspaceDatabase.testQueryTool(TOOL_ID, {
      parameters: { entity_type: 'patient' },
    } as never)
    expect(result.columns).toEqual(['id', 'name'])
    expect(result.row_count).toBe(2)
  })
})
