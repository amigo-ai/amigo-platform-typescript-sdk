import { describe, it, expect } from 'vitest'
import { AmigoClient } from '../../src/index.js'
import { mockFetch } from '../helpers/mock-fetch.js'

const TEST_API_KEY = 'test-api-key'
const TEST_WORKSPACE_ID = 'ws-00000000-0000-0000-0000-000000000001'
const BASE = `/v1/${TEST_WORKSPACE_ID}`
const PATIENT_ID = 'pat-001'
const RESOURCE_TYPE = 'Patient'
const RESOURCE_ID = 'res-001'


const client = new AmigoClient({
  apiKey: TEST_API_KEY,
  workspaceId: TEST_WORKSPACE_ID,
  fetch: mockFetch({
    [`GET ${BASE}/fhir/status`]: () => Response.json({ status: 'healthy' }),
    [`GET ${BASE}/fhir/sync-failures`]: () => Response.json({ items: [], total: 0 }),
    [`POST ${BASE}/fhir/import`]: () => Response.json({ run_id: 'imp-1' }, { status: 202 }),
    [`GET ${BASE}/fhir/patients`]: () => Response.json({ items: [], total: 0 }),
    [`GET ${BASE}/fhir/patients/${PATIENT_ID}/summary`]: () =>
      Response.json({ patient_id: PATIENT_ID }),
    [`GET ${BASE}/fhir/patients/${PATIENT_ID}/timeline`]: () =>
      Response.json({ patient_id: PATIENT_ID, events: [] }),
    [`GET ${BASE}/fhir/resources/${RESOURCE_TYPE}`]: () => Response.json({ items: [] }),
    [`POST ${BASE}/fhir/resources/${RESOURCE_TYPE}`]: () =>
      Response.json({ id: RESOURCE_ID }, { status: 201 }),
    [`GET ${BASE}/fhir/resources/${RESOURCE_TYPE}/${RESOURCE_ID}`]: () =>
      Response.json({ id: RESOURCE_ID }),
    [`PUT ${BASE}/fhir/resources/${RESOURCE_TYPE}/${RESOURCE_ID}`]: () =>
      Response.json({ id: RESOURCE_ID }),
    [`GET ${BASE}/fhir/resources/${RESOURCE_TYPE}/${RESOURCE_ID}/history`]: () =>
      Response.json({ items: [] }),
    [`GET ${BASE}/fhir/views/patients`]: () => Response.json({ items: [] }),
    [`GET ${BASE}/fhir/views/appointments`]: () => Response.json({ items: [] }),
    [`GET ${BASE}/fhir/views/practitioners`]: () => Response.json({ items: [] }),
    [`GET ${BASE}/fhir/views/organizations`]: () => Response.json({ items: [] }),
    [`GET ${BASE}/fhir/views/locations`]: () => Response.json({ items: [] }),
    [`GET ${BASE}/fhir/views/slots`]: () => Response.json({ items: [] }),
  }),
})

describe('FhirResource', () => {
  it('gets status', async () => {
    expect(await client.fhir.getStatus()).toMatchObject({ status: 'healthy' })
  })

  it('lists sync failures', async () => {
    expect(await client.fhir.getSyncFailures()).toMatchObject({ total: 0 })
  })

  it('triggers an import', async () => {
    const result = await client.fhir.import({} as Parameters<typeof client.fhir.import>[0])
    expect(result).toMatchObject({ run_id: 'imp-1' })
  })

  it('searches patients and gets summary/timeline', async () => {
    expect(await client.fhir.searchPatients()).toMatchObject({ total: 0 })
    expect(await client.fhir.getPatientSummary(PATIENT_ID)).toMatchObject({
      patient_id: PATIENT_ID,
    })
    expect(await client.fhir.getPatientTimeline(PATIENT_ID)).toMatchObject({
      patient_id: PATIENT_ID,
    })
  })

  it('CRUDs resources', async () => {
    expect(await client.fhir.resources.search(RESOURCE_TYPE)).toMatchObject({ items: [] })
    expect(
      await client.fhir.resources.create(
        RESOURCE_TYPE,
        {} as Parameters<typeof client.fhir.resources.create>[1],
      ),
    ).toMatchObject({ id: RESOURCE_ID })
    expect(await client.fhir.resources.get(RESOURCE_TYPE, RESOURCE_ID)).toMatchObject({
      id: RESOURCE_ID,
    })
    expect(
      await client.fhir.resources.update(
        RESOURCE_TYPE,
        RESOURCE_ID,
        {} as Parameters<typeof client.fhir.resources.update>[2],
      ),
    ).toMatchObject({ id: RESOURCE_ID })
    expect(await client.fhir.resources.getHistory(RESOURCE_TYPE, RESOURCE_ID)).toMatchObject({
      items: [],
    })
  })

  it('queries each typed view', async () => {
    expect(await client.fhir.views.patients()).toMatchObject({ items: [] })
    expect(await client.fhir.views.appointments()).toMatchObject({ items: [] })
    expect(await client.fhir.views.practitioners()).toMatchObject({ items: [] })
    expect(await client.fhir.views.organizations()).toMatchObject({ items: [] })
    expect(await client.fhir.views.locations()).toMatchObject({ items: [] })
    expect(await client.fhir.views.slots()).toMatchObject({ items: [] })
  })
})
