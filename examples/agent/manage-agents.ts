/**
 * Example: Agent management
 * Create, configure, and version agents.
 */

import { AmigoClient } from '@amigo-ai/platform-sdk'

const client = new AmigoClient({
  apiKey: process.env['AMIGO_API_KEY']!,
  workspaceId: process.env['AMIGO_WORKSPACE_ID']!,
})

async function main() {
  // Create an agent
  const agent = await client.agents.create({
    name: 'Patient Intake Agent',
    description: 'Handles new patient intake calls with empathetic tone',
    model: 'claude-sonnet-4-6',
    skill_ids: [],
  })
  console.log('Created agent:', agent.id)

  // List all agents
  const { items: agents } = await client.agents.list({ is_active: true })
  console.log(`Workspace has ${agents.length} active agents`)

  // Update the agent
  const updated = await client.agents.update(agent.id, {
    is_active: true,
  })
  console.log('Agent active:', updated.is_active)

  // Create a version snapshot before making changes
  const version = await client.agents.createVersion(agent.id)
  console.log('Created version:', version.version)

  // List versions for rollback reference
  const { items: versions } = await client.agents.listVersions(agent.id)
  console.log(`Agent has ${versions.length} version(s)`)
}

main().catch(console.error)
