/**
 * Interactive text chat over synchronous REST turns.
 *
 * Creates one durable conversation, then sends each REPL message through
 * client.conversations.createTurn(conversation.id, ...).
 *
 * Usage:
 *   AMIGO_API_KEY=... AMIGO_WORKSPACE_ID=... AMIGO_SERVICE_ID=... \
 *     npx tsx examples/conversations/text-chat.ts
 *
 * Optional:
 *   AMIGO_ENTITY_ID=... binds the conversation to an existing world entity.
 */

import { stdin as input, stdout as output } from 'node:process'
import * as readline from 'node:readline/promises'
import { createClient, requireEnv } from '../shared.js'

const serviceId = requireEnv('AMIGO_SERVICE_ID')
const entityId = process.env.AMIGO_ENTITY_ID
const client = createClient()

const conversation = await client.conversations.create({
  service_id: serviceId,
  ...(entityId ? { entity_id: entityId } : {}),
})

console.log(`Conversation: ${conversation.id}`)
if (conversation.entity_id) console.log(`Entity: ${conversation.entity_id}`)
console.log('Type /quit to exit.\n')

const rl = readline.createInterface({ input, output })

try {
  while (true) {
    const text = (await rl.question('You: ')).trim()
    if (!text) continue
    if (text === '/quit') break

    const turn = await client.conversations.createTurn(conversation.id, {
      message: text,
    })

    for (const message of turn.output) {
      if (message.text.trim()) console.log(`Agent: ${message.text}\n`)
    }
  }
} finally {
  rl.close()
}
