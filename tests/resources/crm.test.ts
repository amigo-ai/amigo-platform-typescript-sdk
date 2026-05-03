import { describe, it, expect } from 'vitest'
import { AmigoClient } from '../../src/index.js'
import { mockFetch } from '../helpers/mock-fetch.js'

const TEST_API_KEY = 'test-api-key'
const TEST_WORKSPACE_ID = 'ws-00000000-0000-0000-0000-000000000001'
const BASE = `/v1/${TEST_WORKSPACE_ID}`
const CONTACT_ID = 'contact-001'
const COMPANY_ID = 'company-001'
const DEAL_ID = 'deal-001'


const client = new AmigoClient({
  apiKey: TEST_API_KEY,
  workspaceId: TEST_WORKSPACE_ID,
  fetch: mockFetch({
    [`GET ${BASE}/crm/status`]: () => Response.json({ status: 'connected' }),
    [`GET ${BASE}/crm/contacts`]: () => Response.json({ items: [] }),
    [`GET ${BASE}/crm/contacts/${CONTACT_ID}`]: () => Response.json({ id: CONTACT_ID }),
    [`GET ${BASE}/crm/contacts/${CONTACT_ID}/timeline`]: () => Response.json({ events: [] }),
    [`GET ${BASE}/crm/companies`]: () => Response.json({ items: [] }),
    [`GET ${BASE}/crm/companies/${COMPANY_ID}`]: () => Response.json({ id: COMPANY_ID }),
    [`GET ${BASE}/crm/deals`]: () => Response.json({ items: [] }),
    [`GET ${BASE}/crm/deals/${DEAL_ID}`]: () => Response.json({ id: DEAL_ID }),
    [`GET ${BASE}/crm/deals/pipeline`]: () => Response.json({ stages: [] }),
  }),
})

describe('CrmResource', () => {
  it('gets status', async () => {
    expect(await client.crm.getStatus()).toMatchObject({ status: 'connected' })
  })

  it('contacts: list/get/timeline', async () => {
    expect(await client.crm.contacts.list({ q: 'jane' })).toBeDefined()
    expect(await client.crm.contacts.get(CONTACT_ID)).toMatchObject({ id: CONTACT_ID })
    expect(await client.crm.contacts.getTimeline(CONTACT_ID)).toBeDefined()
  })

  it('companies: list/get', async () => {
    expect(await client.crm.companies.list()).toBeDefined()
    expect(await client.crm.companies.get(COMPANY_ID)).toMatchObject({ id: COMPANY_ID })
  })

  it('deals: list/get/pipeline', async () => {
    expect(await client.crm.deals.list()).toBeDefined()
    expect(await client.crm.deals.get(DEAL_ID)).toMatchObject({ id: DEAL_ID })
    expect(await client.crm.deals.getPipeline()).toBeDefined()
  })
})
