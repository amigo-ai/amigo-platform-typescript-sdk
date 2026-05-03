import { describe, it, expect } from 'vitest'
import { AmigoClient } from '../../src/index.js'

const TEST_API_KEY = 'test-api-key'
const TEST_WORKSPACE_ID = 'ws-00000000-0000-0000-0000-000000000001'

/**
 * Probe whether `client.<resource>.withOptions(...)` propagates scoped
 * request options into plain-object sub-resources (e.g. `surfaces`,
 * `runs`, `bridge`, `services`). Sub-objects are arrow-function bags
 * captured by class-field initialisers at construction time; when
 * `withOptions` returns a new instance via the same constructor, the
 * sub-object's arrow functions should resolve `this.client` to the
 * scoped client.
 */
describe('withOptions propagation into nested sub-resources', () => {
  it('analytics.surfaces.* sees a custom header set via withOptions', async () => {
    // Sentinel value distinguishes "fetch ran but header missing" from
    // "fetch never ran" — the latter would otherwise silently pass through
    // an undefined assertion.
    const captured: Record<string, string | null> = { 'x-trace': 'NOT_CALLED' }
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      fetch: async (input, init) => {
        const req = input instanceof Request ? input : null
        const headers = new Headers(req?.headers ?? init?.headers ?? {})
        captured['x-trace'] = headers.get('x-trace')
        return Response.json({ ok: true })
      },
    })

    await client.analytics
      .withOptions({ headers: { 'x-trace': 'scoped-1' } })
      .surfaces.getCompletionRates()

    expect(captured['x-trace']).toBe('scoped-1')
  })

  it('simulations.runs.* sees a custom header set via withOptions', async () => {
    const captured: Record<string, string | null> = { 'x-trace': 'NOT_CALLED' }
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      fetch: async (input, init) => {
        const req = input instanceof Request ? input : null
        const headers = new Headers(req?.headers ?? init?.headers ?? {})
        captured['x-trace'] = headers.get('x-trace')
        return Response.json({ items: [] })
      },
    })
    await client.simulations.withOptions({ headers: { 'x-trace': 'scoped-2' } }).runs.list()
    expect(captured['x-trace']).toBe('scoped-2')
  })

  // Sanity: simulations.createSession is on the class itself (not in a sub-object).
  // It should observe the scoped header. This calibrates whether the propagation
  // failure is specific to nested sub-objects or systemic.
  it('simulations.createSession (class-level) sees the scoped header', async () => {
    const captured: Record<string, string | null> = { 'x-trace': 'NOT_CALLED' }
    const client = new AmigoClient({
      apiKey: TEST_API_KEY,
      workspaceId: TEST_WORKSPACE_ID,
      fetch: async (input, init) => {
        const req = input instanceof Request ? input : null
        const headers = new Headers(req?.headers ?? init?.headers ?? {})
        captured['x-trace'] = headers.get('x-trace')
        return Response.json({ session_id: 's-1', greeting: 'hi', snapshot: {} })
      },
    })
    await client.simulations
      .withOptions({ headers: { 'x-trace': 'class-level' } })
      .createSession({ agent_id: 'a-1' } as never)
    expect(captured['x-trace']).toBe('class-level')
  })
})
