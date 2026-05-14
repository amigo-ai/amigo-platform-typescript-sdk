import { describe, it, expect } from 'vitest'
import { AmigoClient } from '../../src/index.js'

const TEST_API_KEY = 'test-api-key-abc123'
const TEST_WORKSPACE_ID = 'ws-00000000-0000-0000-0000-000000000001'

const FUNCTION_NAME = 'calculate_bmi'

const FUNCTION_FIXTURE = {
  name: FUNCTION_NAME,
  description: 'Calculate BMI from height and weight',
  function_type: 'sql',
  input_schema: {
    type: 'object',
    properties: {
      height_cm: { type: 'number' },
      weight_kg: { type: 'number' },
    },
    required: ['height_cm', 'weight_kg'],
  },
  parameters: [
    { name: 'height_cm', type: 'number' },
    { name: 'weight_kg', type: 'number' },
  ],
  returns_kind: 'table',
  sql_template: 'SELECT :weight_kg / POWER(:height_cm / 100, 2) AS bmi',
  timeout_ms: 30000,
}

const INVOKE_RESULT_FIXTURE = {
  result: { bmi: 24.2, category: 'normal' },
  duration_ms: 45,
  row_count: 1,
}

const TEST_RESULT_FIXTURE = {
  ...INVOKE_RESULT_FIXTURE,
  status: 'pass',
  error: null,
  test_duration_ms: 45,
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
    [`GET ${BASE}/functions`]: () => Response.json({ items: [FUNCTION_FIXTURE], count: 1 }),

    [`GET ${BASE}/functions/${FUNCTION_NAME}`]: () => Response.json(FUNCTION_FIXTURE),

    [`PUT ${BASE}/functions/${FUNCTION_NAME}`]: () => Response.json(FUNCTION_FIXTURE),

    [`DELETE ${BASE}/functions/${FUNCTION_NAME}`]: () => new Response(null, { status: 204 }),

    [`POST ${BASE}/functions/${FUNCTION_NAME}/invoke`]: () => Response.json(INVOKE_RESULT_FIXTURE),

    [`POST ${BASE}/functions/${FUNCTION_NAME}/test`]: () => Response.json(TEST_RESULT_FIXTURE),
  }),
})

describe('FunctionsResource', () => {
  it('lists functions', async () => {
    const result = await client.functions.list()
    expect(result.count).toBe(1)
    expect(result.items[0]?.name).toBe(FUNCTION_NAME)
  })

  it('gets a function', async () => {
    const result = await client.functions.get(FUNCTION_NAME)
    expect(result.name).toBe(FUNCTION_NAME)
    expect(result.description).toBe('Calculate BMI from height and weight')
  })

  it('deploys a function', async () => {
    const result = await client.functions.deploy(FUNCTION_NAME, {
      name: FUNCTION_NAME,
      description: 'Calculate BMI from height and weight',
      body: 'SELECT :weight_kg / POWER(:height_cm / 100, 2) AS bmi',
    } as never)
    expect(result.name).toBe(FUNCTION_NAME)
    expect(result.sql_template).toContain('POWER')
  })

  it('deletes a function', async () => {
    await expect(client.functions.delete(FUNCTION_NAME)).resolves.toBeUndefined()
  })

  it('invokes a function', async () => {
    const result = await client.functions.invoke(FUNCTION_NAME, {
      input: { height_cm: 175, weight_kg: 74 },
    })
    expect(result.result).toEqual({ bmi: 24.2, category: 'normal' })
    expect(result.row_count).toBe(1)
  })

  it('tests a function', async () => {
    const result = await client.functions.test(FUNCTION_NAME, {
      input: { height_cm: 175, weight_kg: 74 },
    })
    expect(result.status).toBe('pass')
    expect(result.error).toBeNull()
    expect(result.result).toEqual({ bmi: 24.2, category: 'normal' })
    expect(result.duration_ms).toBe(45)
  })
})
