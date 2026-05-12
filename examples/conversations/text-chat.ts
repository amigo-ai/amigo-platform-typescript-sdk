/**
 * Interactive durable text chat — synchronous REST turns.
 *
 * Creates a production text conversation first, then sends each user turn with
 * the JSON REST conversation API.
 *
 * Usage:
 *   AMIGO_API_KEY=... AMIGO_WORKSPACE_ID=... AMIGO_SERVICE_ID=... \
 *     npx tsx examples/conversations/text-chat.ts
 */

import { AmigoClient } from '@amigo-ai/platform-sdk'
import * as readline from 'node:readline'
import { requireEnv } from '../shared.js'

const apiKey = requireEnv('AMIGO_API_KEY')
const workspaceId = requireEnv('AMIGO_WORKSPACE_ID')
const serviceId = requireEnv('AMIGO_SERVICE_ID')
const entityId = process.env.AMIGO_ENTITY_ID

const client = new AmigoClient({
  apiKey,
  workspaceId,
  baseUrl: process.env.AMIGO_BASE_URL,
})

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => rl.question(prompt, resolve))
}

async function main() {
  const conversation = await client.conversations.create({
    service_id: serviceId,
    ...(entityId && { entity_id: entityId }),
    start_mode: 'user_first',
  })

  console.log(`Conversation: ${conversation.id}`)
  console.log('Type /quit to exit.\n')

  while (true) {
    const text = (await question('You: ')).trim()
    if (!text) continue
    if (text === '/quit') break

    await sendTurn(conversation.id, text)
  }
}

async function sendTurn(conversationId: string, message: string): Promise<void> {
  const turn = await client.conversations.createTurn(
    conversationId,
    { message },
    { includeToolCalls: true },
  )

  for (const toolCall of turn.tool_calls ?? []) {
    const result = toolCall.result ?? ''
    console.log(`  [tool] ${toolCall.tool_name} -> ${result.slice(0, 200)}`)
  }

  for (const output of turn.output) {
    console.log(`Agent: ${output.text}`)
  }

  console.log('')
}

main()
  .catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : String(err))
    process.exitCode = 1
  })
  .finally(() => rl.close())
