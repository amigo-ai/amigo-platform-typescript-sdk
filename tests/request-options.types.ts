import { AmigoClient } from '../src/index.js'

const client = new AmigoClient({
  apiKey: 'test-key',
  workspaceId: 'ws-001',
})

void client.GET('/v1/{workspace_id}/agents')
void client.GET('/v1/{workspace_id}/agents/{agent_id}', {
  params: { path: { agent_id: 'agent-123' } },
})

// @ts-expect-error agent_id must stay required on low-level helpers
void client.GET('/v1/{workspace_id}/agents/{agent_id}')

const scopedClient = client.withOptions({
  headers: { 'X-Test': 'true' },
  timeout: 1_000,
})

void scopedClient.GET('/v1/{workspace_id}/agents')
void scopedClient.agents.withOptions({ timeout: 500 }).get('agent-123')
