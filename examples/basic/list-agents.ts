import { createClient } from '../shared.js'

const client = createClient()

const { items: agents } = await client.agents.list({ limit: 10 })

console.log(`Fetched ${agents.length} agents`)
for (const agent of agents) {
  console.log(`${agent.id}\t${agent.name}`)
}
