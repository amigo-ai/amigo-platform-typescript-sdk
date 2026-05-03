import { describe, it, expect } from 'vitest'
import { AmigoClient } from '../../src/index.js'
import { mockFetch } from '../helpers/mock-fetch.js'

const TEST_API_KEY = 'test-api-key'
const TEST_WORKSPACE_ID = 'ws-00000000-0000-0000-0000-000000000001'
const SURFACE_ID = 'surf-001'
const BASE = `/v1/${TEST_WORKSPACE_ID}`


const SURFACE_FIXTURE = { id: SURFACE_ID, status: 'pending', title: 'Intake' }

const client = new AmigoClient({
  apiKey: TEST_API_KEY,
  workspaceId: TEST_WORKSPACE_ID,
  fetch: mockFetch({
    [`GET ${BASE}/surfaces`]: () =>
      Response.json({ items: [SURFACE_FIXTURE], has_more: false, continuation_token: null }),
    [`GET ${BASE}/surfaces/review`]: () =>
      Response.json({ items: [SURFACE_FIXTURE], has_more: false, continuation_token: null }),
    [`POST ${BASE}/surfaces`]: () => Response.json({ id: SURFACE_ID }, { status: 201 }),
    [`GET ${BASE}/surfaces/${SURFACE_ID}`]: () => Response.json(SURFACE_FIXTURE),
    [`PATCH ${BASE}/surfaces/${SURFACE_ID}`]: () => Response.json(SURFACE_FIXTURE),
    [`DELETE ${BASE}/surfaces/${SURFACE_ID}`]: () => Response.json({ archived_at: 'now' }),
    [`POST ${BASE}/surfaces/${SURFACE_ID}/deliver`]: () => Response.json({ status: 'delivered' }),
    [`GET ${BASE}/surfaces/${SURFACE_ID}/progress`]: () => Response.json({ percent: 50 }),
    [`POST ${BASE}/surfaces/${SURFACE_ID}/approve`]: () => Response.json({ ok: true }),
    [`POST ${BASE}/surfaces/${SURFACE_ID}/reject`]: () => Response.json({ ok: true }),
    [`POST ${BASE}/surfaces/${SURFACE_ID}/reshape`]: () => Response.json({ id: 'surf-002' }),
  }),
})

describe('SurfacesResource', () => {
  it('lists, list-for-review, paginates', async () => {
    expect((await client.surfaces.list())?.items?.[0]?.id).toBe(SURFACE_ID)
    expect((await client.surfaces.listForReview())?.items?.[0]?.id).toBe(SURFACE_ID)
  })

  it('CRUD', async () => {
    expect(
      await client.surfaces.create({} as Parameters<typeof client.surfaces.create>[0]),
    ).toMatchObject({ id: SURFACE_ID })
    expect(await client.surfaces.get(SURFACE_ID)).toMatchObject({ id: SURFACE_ID })
    expect(
      await client.surfaces.update(
        SURFACE_ID,
        {} as Parameters<typeof client.surfaces.update>[1],
      ),
    ).toMatchObject({ id: SURFACE_ID })
    expect(await client.surfaces.archive(SURFACE_ID)).toMatchObject({ archived_at: 'now' })
  })

  it('delivery + lifecycle', async () => {
    expect(
      await client.surfaces.deliver(
        SURFACE_ID,
        {} as Parameters<typeof client.surfaces.deliver>[1],
      ),
    ).toMatchObject({ status: 'delivered' })
    expect(await client.surfaces.getProgress(SURFACE_ID)).toMatchObject({ percent: 50 })
    expect(await client.surfaces.approve(SURFACE_ID)).toMatchObject({ ok: true })
    expect(
      await client.surfaces.reject(
        SURFACE_ID,
        {} as Parameters<typeof client.surfaces.reject>[1],
      ),
    ).toMatchObject({ ok: true })
    expect(await client.surfaces.reshape(SURFACE_ID)).toMatchObject({ id: 'surf-002' })
  })
})
