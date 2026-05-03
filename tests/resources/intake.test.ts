import { describe, it, expect } from 'vitest'
import { AmigoClient } from '../../src/index.js'
import { mockFetch } from '../helpers/mock-fetch.js'

const TEST_API_KEY = 'test-api-key'
const TEST_WORKSPACE_ID = 'ws-00000000-0000-0000-0000-000000000001'
const LINK_ID = 'lnk-001'
const UPLOAD_ID = 'up-001'
const BASE = `/v1/${TEST_WORKSPACE_ID}`


const client = new AmigoClient({
  apiKey: TEST_API_KEY,
  workspaceId: TEST_WORKSPACE_ID,
  fetch: mockFetch({
    [`GET ${BASE}/intake/links`]: () => Response.json([{ id: LINK_ID }]),
    [`POST ${BASE}/intake/links`]: () => Response.json({ id: LINK_ID }),
    [`DELETE ${BASE}/intake/links/${LINK_ID}`]: () => new Response(null, { status: 204 }),
    [`GET ${BASE}/intake/links/${LINK_ID}/uploads`]: () => Response.json([{ id: UPLOAD_ID }]),
    [`GET ${BASE}/intake/links/${LINK_ID}/uploads/${UPLOAD_ID}/download`]: () =>
      Response.json({ url: 'https://example/dl' }),
  }),
})

describe('IntakeResource', () => {
  it('manages links and reads uploads', async () => {
    expect(await client.intake.links.list()).toBeDefined()
    expect(
      await client.intake.links.create({} as Parameters<
        typeof client.intake.links.create
      >[0]),
    ).toMatchObject({ id: LINK_ID })
    expect(await client.intake.links.listUploads(LINK_ID)).toBeDefined()
    expect(await client.intake.links.downloadUpload(LINK_ID, UPLOAD_ID)).toMatchObject({
      url: 'https://example/dl',
    })
    await expect(client.intake.links.delete(LINK_ID)).resolves.toBeUndefined()
  })
})
