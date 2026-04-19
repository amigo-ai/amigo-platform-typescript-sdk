import { describe, it, expect } from 'vitest'
import { AmigoClient } from '../../src/index.js'

const TEST_API_KEY = 'test-api-key-abc123'
const TEST_WORKSPACE_ID = 'ws-00000000-0000-0000-0000-000000000001'

const FUNCTION_NAME = 'calculate_bmi'

const FUNCTION_FIXTURE = {
  name: FUNCTION_NAME,
  workspace_id: TEST_WORKSPACE_ID,
  description: 'Calculate BMI from height and weight',
  parameters: {
    type: 'object',
    properties: {
      height_cm: { type: 'number' },
      weight_kg: { type: 'number' },
    },
    required: ['height_cm', 'weight_kg'],
  },
  created_at: '2026-01-01T00:00:00Z',
}

const TEST_RESULT_FIXTURE = {
  function_name: FUNCTION_NAME,
  result: { bmi: 24.2, category: 'normal' },
  execution_time_ms: 45,
  success: true,
}

const CATALOG_FIXTURE = {
  workspace_id: TEST_WORKSPACE_ID,
  functions: [
    { name: 'calculate_bmi', description: 'Calculate BMI', category: 'health' },
    { name: 'format_phone', description: 'Format phone number to E.164', category: 'utility' },
  ],
}

const QUERY_RESULT_FIXTURE = {
  columns: ['name', 'age'],
  rows: [
    ['Jane Doe', 42],
    ['John Smith', 35],
  ],
  row_count: 2,
}

const SYNC_RESULT_FIXTURE = {
  workspace_id: TEST_WORKSPACE_ID,
  synced: 5,
  errors: 0,
  synced_at: '2026-01-01T00:00:00Z',
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
    [`GET ${BASE}/functions`]: () =>
      Response.json({ items: [FUNCTION_FIXTURE], has_more: false, continuation_token: null }),

    [`POST ${BASE}/functions`]: () =>
      Response.json(FUNCTION_FIXTURE, { status: 201 }),

    [`DELETE ${BASE}/functions/${FUNCTION_NAME}`]: () =>
      new Response(null, { status: 204 }),

    [`POST ${BASE}/functions/${FUNCTION_NAME}/test`]: () =>
      Response.json(TEST_RESULT_FIXTURE),

    [`GET ${BASE}/functions/catalog`]: () =>
      Response.json(CATALOG_FIXTURE),

    [`POST ${BASE}/functions/query`]: () =>
      Response.json(QUERY_RESULT_FIXTURE),

    [`POST ${BASE}/functions/sync`]: () =>
      Response.json(SYNC_RESULT_FIXTURE),
  }),
})

describe('FunctionsResource', () => {
  it('lists functions', async () => {
    const result = await client.functions.list()
    expect(result).toBeDefined()
  })

  it('creates a function', async () => {
    const result = await client.functions.create({
      name: FUNCTION_NAME,
      sql: 'SELECT height_cm, weight_kg FROM ...',
    } as never)
    expect(result.name).toBe(FUNCTION_NAME)
    expect(result.description).toBe('Calculate BMI from height and weight')
  })

  it('deletes a function', async () => {
    await expect(client.functions.delete(FUNCTION_NAME)).resolves.toBeUndefined()
  })

  it('tests a function', async () => {
    const result = await client.functions.test(FUNCTION_NAME, {
      args: { height_cm: 175, weight_kg: 74 },
    } as never)
    expect(result.success).toBe(true)
    expect(result.result.bmi).toBe(24.2)
    expect(result.execution_time_ms).toBe(45)
  })

  it('gets the function catalog', async () => {
    const result = await client.functions.getCatalog()
    expect(result.functions).toHaveLength(2)
    expect(result.functions[0]?.name).toBe('calculate_bmi')
  })

  it('runs a query', async () => {
    const result = await client.functions.query({
      sql: 'SELECT name, age FROM patients',
    } as never)
    expect(result.row_count).toBe(2)
    expect(result.columns).toEqual(['name', 'age'])
    expect(result.rows).toHaveLength(2)
  })

  it('syncs functions', async () => {
    const result = await client.functions.sync()
    expect(result.synced).toBe(5)
    expect(result.errors).toBe(0)
  })
})
