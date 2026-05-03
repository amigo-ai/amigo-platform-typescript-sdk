import { describe, it, expect } from 'vitest'
import { AmigoClient } from '../../src/index.js'
import { mockFetch } from '../helpers/mock-fetch.js'

const TEST_API_KEY = 'test-api-key'
const TEST_WORKSPACE_ID = 'ws-00000000-0000-0000-0000-000000000001'
const ENTITY_ID = 'ent-001'
const BASE = `/v1/${TEST_WORKSPACE_ID}`
const FIXTURE = { brief_text: 'Active patient.', generated_at: '2026-01-01T00:00:00Z' }


const client = new AmigoClient({
  apiKey: TEST_API_KEY,
  workspaceId: TEST_WORKSPACE_ID,
  fetch: mockFetch({
    [`GET ${BASE}/brief`]: () => Response.json(FIXTURE),
    [`POST ${BASE}/brief`]: () => Response.json(FIXTURE),
    [`GET ${BASE}/entities/${ENTITY_ID}/brief`]: () => Response.json(FIXTURE),
    [`POST ${BASE}/entities/${ENTITY_ID}/brief`]: () => Response.json(FIXTURE),
  }),
})

describe('BriefsResource', () => {
  it('reads + regenerates workspace brief', async () => {
    expect(await client.briefs.get()).toMatchObject({ brief_text: 'Active patient.' })
    expect(await client.briefs.regenerate()).toMatchObject({ brief_text: 'Active patient.' })
  })

  it('reads + regenerates per-entity brief', async () => {
    expect(await client.briefs.getForEntity(ENTITY_ID)).toMatchObject({
      brief_text: 'Active patient.',
    })
    expect(await client.briefs.regenerateForEntity(ENTITY_ID)).toMatchObject({
      brief_text: 'Active patient.',
    })
  })
})
