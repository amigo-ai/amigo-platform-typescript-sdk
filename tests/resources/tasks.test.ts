import { describe, it, expect } from 'vitest'
import { AmigoClient } from '../../src/index.js'
import { mockFetch } from '../helpers/mock-fetch.js'

const TEST_API_KEY = 'test-api-key'
const TEST_WORKSPACE_ID = 'ws-00000000-0000-0000-0000-000000000001'
const TASK_ID = 'task-001'
const CALL_SID = 'CA1234567890abcdef1234567890abcdef'
const BASE = `/v1/${TEST_WORKSPACE_ID}`


const client = new AmigoClient({
  apiKey: TEST_API_KEY,
  workspaceId: TEST_WORKSPACE_ID,
  fetch: mockFetch({
    [`GET ${BASE}/tasks/${TASK_ID}`]: () =>
      Response.json({ id: TASK_ID, status: 'completed' }),
    [`GET ${BASE}/tasks/by-call/${CALL_SID}`]: () => Response.json({ tasks: [] }),
  }),
})

describe('TasksResource', () => {
  it('gets a task by id', async () => {
    expect(await client.tasks.get(TASK_ID)).toMatchObject({ id: TASK_ID })
  })

  it('lists tasks for a call', async () => {
    expect(await client.tasks.listByCall(CALL_SID)).toBeDefined()
  })
})
