import { describe, expect, it } from 'vitest'
import { AmigoClient } from '../../src/index.js'

const TEST_API_KEY = 'test-api-key-abc123'
const TEST_WORKSPACE_ID = 'ws-00000000-0000-0000-0000-000000000001'
const BASE = `/v1/${TEST_WORKSPACE_ID}`
const continuationQueries = new Map<string, URLSearchParams[]>()

const continuationPaths = new Set([
  `${BASE}/agents`,
  `${BASE}/agents/agent-001/versions`,
  `${BASE}/skills`,
  `${BASE}/api-keys`,
  `${BASE}/billing/invoices`,
  `${BASE}/calls`,
  `${BASE}/context-graphs`,
  `${BASE}/context-graphs/cg-001/versions`,
  `${BASE}/data-sources`,
  `${BASE}/integrations`,
  `${BASE}/operators`,
  `${BASE}/operators/escalations`,
  `${BASE}/operators/escalations/active`,
  `${BASE}/operators/audit-log`,
  `${BASE}/services`,
  `${BASE}/triggers`,
  `${BASE}/triggers/trigger-001/runs`,
  '/v1/workspaces',
])
const numericContinuationPaths = new Set([`${BASE}/calls`])

const offsetEventPaths = new Set([
  `${BASE}/audit`,
  `${BASE}/audit/phi-access`,
  `${BASE}/audit/entity/entity-001/access-log`,
  `${BASE}/world/entities/entity-001/timeline`,
])

function mockFetch(): typeof globalThis.fetch {
  return async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const request = input instanceof Request ? input : new Request(input, init)
    const url = new URL(request.url)
    const pathname = url.pathname

    if (continuationPaths.has(pathname)) {
      const token = url.searchParams.get('continuation_token')
      const nextToken = numericContinuationPaths.has(pathname) ? '1' : 'opaque-next-page'
      const queries = continuationQueries.get(pathname) ?? []
      queries.push(new URLSearchParams(url.searchParams))
      continuationQueries.set(pathname, queries)
      return Response.json({
        items: [{ token: token ?? 'first', path: pathname }],
        has_more: token !== nextToken,
        continuation_token:
          token === nextToken ? null : numericContinuationPaths.has(pathname) ? 1 : nextToken,
      })
    }

    if (offsetEventPaths.has(pathname)) {
      const offset = url.searchParams.get('offset')
      return Response.json({
        events: [{ offset: offset ?? 'first', path: pathname }],
        has_more: offset !== '1',
        next_offset: offset === '1' ? null : 1,
      })
    }

    if (pathname === `${BASE}/world/entities`) {
      const offset = url.searchParams.get('offset')
      return Response.json({
        entities: [{ offset: offset ?? 'first', path: pathname }],
        has_more: offset !== '1',
        next_offset: offset === '1' ? null : 1,
      })
    }

    return new Response(JSON.stringify({ detail: `No mock for ${request.method} ${pathname}` }), {
      status: 500,
    })
  }
}

async function countItems<T>(iterable: AsyncIterable<T>): Promise<number> {
  let count = 0

  for await (const item of iterable) {
    void item
    count += 1
  }

  return count
}

describe('resource auto-pagination helpers', () => {
  const client = new AmigoClient({
    apiKey: TEST_API_KEY,
    workspaceId: TEST_WORKSPACE_ID,
    fetch: mockFetch(),
  })

  it('iterates continuation-token list helpers', async () => {
    continuationQueries.clear()
    const counts = await Promise.all([
      countItems(client.actions.listAutoPaging({ limit: 1 })),
      countItems(client.agents.listAutoPaging({ limit: 1 })),
      countItems(client.agents.listVersionsAutoPaging('agent-001', { limit: 1 })),
      countItems(client.apiKeys.listAutoPaging({ limit: 1 })),
      countItems(client.billing.listInvoicesAutoPaging({ limit: 1 })),
      countItems(client.calls.listAutoPaging({ limit: 1 })),
      countItems(client.contextGraphs.listAutoPaging({ limit: 1 })),
      countItems(client.contextGraphs.listVersionsAutoPaging('cg-001', { limit: 1 })),
      countItems(client.dataSources.listAutoPaging({ limit: 1 })),
      countItems(client.integrations.listAutoPaging({ limit: 1 })),
      countItems(client.operators.listAutoPaging({ limit: 1 })),
      countItems(client.operators.getEscalationsAutoPaging({ limit: 1 })),
      countItems(client.operators.getActiveEscalationsAutoPaging({ limit: 1 })),
      countItems(client.operators.getAuditLogAutoPaging({ limit: 1 })),
      countItems(client.services.listAutoPaging({ limit: 1 })),
      countItems(client.skills.listAutoPaging({ limit: 1 })),
      countItems(client.triggers.listAutoPaging({ limit: 1 })),
      countItems(client.triggers.listRunsAutoPaging('trigger-001', { limit: 1 })),
      countItems(client.workspaces.listAutoPaging({ limit: 1 })),
    ])

    expect(counts).toEqual(new Array(counts.length).fill(2))
    for (const path of continuationPaths) {
      const queries = continuationQueries.get(path) ?? []
      const nextPageQueries = queries.filter((query) => query.has('continuation_token'))
      expect(queries.length).toBeGreaterThanOrEqual(2)
      expect(nextPageQueries).toHaveLength(queries.length / 2)
      for (const query of nextPageQueries) {
        expect(query.get('continuation_token')).toBe(
          numericContinuationPaths.has(path) ? '1' : 'opaque-next-page',
        )
      }
      expect(queries.every((query) => !query.has('offset'))).toBe(true)
    }
  })

  it('iterates offset-based list helpers', async () => {
    const counts = await Promise.all([
      countItems(client.audit.listAutoPaging({ limit: 1 })),
      countItems(client.audit.getPhiAccessAutoPaging({ limit: 1 })),
      countItems(client.audit.getEntityAccessLogAutoPaging('entity-001', { limit: 1 })),
      countItems(client.world.listEntitiesAutoPaging({ limit: 1 })),
      countItems(client.world.getTimelineAutoPaging('entity-001', { limit: 1 })),
    ])

    expect(counts).toEqual(new Array(counts.length).fill(2))
  })
})
