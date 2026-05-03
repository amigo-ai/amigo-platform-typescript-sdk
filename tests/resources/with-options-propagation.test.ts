import { describe, it, expect } from 'vitest'
import { AmigoClient } from '../../src/index.js'

const TEST_API_KEY = 'test-api-key'
const TEST_WORKSPACE_ID = 'ws-00000000-0000-0000-0000-000000000001'

/**
 * Probe whether `client.<resource>.withOptions(...)` propagates scoped
 * request options into plain-object sub-resources (e.g. `surfaces`,
 * `runs`, `bridge`, `services`). Sub-objects are arrow-function bags
 * captured by class-field initialisers at construction time; when
 * `withOptions` returns a new instance via the same constructor (see
 * `src/resources/base.ts`), the sub-object's arrow functions should
 * resolve `this.client` to the scoped client.
 *
 * Each test:
 *   1. Constructs **two** independent clients with **distinct fetch spies**
 *      so a coincidental cross-instance leak can't fake a pass.
 *   2. Asserts the captured request URL pathname matches the resource
 *      method's path, so a wrong-URL bug doesn't slip through on
 *      `Response.json({ ok: true })` for any path.
 *   3. Initialises a sentinel `'NOT_CALLED'` so a "fetch never ran" path
 *      is distinguishable from a "header missing" path on failure.
 */

interface Spy {
  url: string
  trace: string
}

function spyFetch(): { fetch: typeof globalThis.fetch; last: Spy } {
  const last: Spy = { url: 'NOT_CALLED', trace: 'NOT_CALLED' }
  const fetch: typeof globalThis.fetch = async (input, init) => {
    const req = input instanceof Request ? input : null
    const url = req?.url ?? (typeof input === 'string' ? input : input.toString())
    const headers = new Headers(req?.headers ?? init?.headers ?? {})
    last.url = new URL(url).pathname
    last.trace = headers.get('x-trace') ?? 'MISSING'
    return Response.json({ ok: true, items: [] })
  }
  return { fetch, last }
}

describe('withOptions propagation into nested sub-resources', () => {
  it('analytics.surfaces.* uses the scoped client AND hits the right URL', async () => {
    const a = spyFetch()
    const b = spyFetch()
    const ca = new AmigoClient({ apiKey: TEST_API_KEY, workspaceId: TEST_WORKSPACE_ID, fetch: a.fetch })
    const cb = new AmigoClient({ apiKey: TEST_API_KEY, workspaceId: TEST_WORKSPACE_ID, fetch: b.fetch })

    await ca.analytics
      .withOptions({ headers: { 'x-trace': 'A' } })
      .surfaces.getCompletionRates()

    // Only spy A should have seen the call; spy B must remain untouched —
    // proves we're observing this client's scoped pipeline, not a leak.
    expect(a.last.trace).toBe('A')
    expect(a.last.url).toBe(`/v1/${TEST_WORKSPACE_ID}/analytics/surfaces/completion-rates`)
    expect(b.last.url).toBe('NOT_CALLED')
    void cb
  })

  it('simulations.runs.list uses the scoped client AND hits the right URL', async () => {
    const a = spyFetch()
    const b = spyFetch()
    const ca = new AmigoClient({ apiKey: TEST_API_KEY, workspaceId: TEST_WORKSPACE_ID, fetch: a.fetch })
    const cb = new AmigoClient({ apiKey: TEST_API_KEY, workspaceId: TEST_WORKSPACE_ID, fetch: b.fetch })

    await ca.simulations.withOptions({ headers: { 'x-trace': 'B' } }).runs.list()

    expect(a.last.trace).toBe('B')
    expect(a.last.url).toBe(`/v1/${TEST_WORKSPACE_ID}/simulations/runs`)
    expect(b.last.url).toBe('NOT_CALLED')
    void cb
  })

  it('class-level methods also propagate (calibration)', async () => {
    const { fetch, last } = spyFetch()
    const client = new AmigoClient({ apiKey: TEST_API_KEY, workspaceId: TEST_WORKSPACE_ID, fetch })

    await client.simulations
      .withOptions({ headers: { 'x-trace': 'class' } })
      .createSession({
        service_id: 'svc-1',
      } as Parameters<typeof client.simulations.createSession>[0])

    expect(last.trace).toBe('class')
    expect(last.url).toBe(`/v1/${TEST_WORKSPACE_ID}/simulations/sessions`)
  })
})
