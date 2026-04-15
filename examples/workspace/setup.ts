/**
 * Example: Workspace setup
 * Bootstrap a new workspace with an API key and basic agent.
 */

import { AmigoClient } from '@amigo-ai/platform-sdk'

// Use a root-level API key to create and configure a workspace
const rootClient = new AmigoClient({
  apiKey: process.env['AMIGO_ROOT_API_KEY']!,
  workspaceId: process.env['AMIGO_ROOT_WORKSPACE_ID']!,
})

async function main() {
  // Check current key info
  const me = await rootClient.apiKeys.me()
  console.log('Authenticated as key:', me.key_id)
  console.log('Workspace:', me.workspace_id)

  // Create a workspace-scoped API key for your application
  const appKey = await rootClient.apiKeys.create({
    name: 'Production App Key',
    duration_days: 90,
    role: 'member',
    permissions: ['agents:read', 'agents:write', 'calls:read'],
  })
  // Store this key securely — it's only shown once
  console.log('App API key:', appKey.api_key)
  console.log('Expires at:', appKey.expires_at)

  // Use the new key to configure your app
  const appClient = new AmigoClient({
    apiKey: appKey.api_key,
    workspaceId: me.workspace_id,
  })

  // Create your first agent
  const agent = await appClient.agents.create({
    name: 'Main Receptionist',
    description: 'Handles inbound calls and schedules appointments',
    model: 'claude-sonnet-4-6',
  })
  console.log('Created agent:', agent.id)

  // List all API keys (using root client)
  const { items: keys } = await rootClient.apiKeys.list()
  console.log(`Workspace has ${keys.length} API key(s)`)
}

main().catch(console.error)
