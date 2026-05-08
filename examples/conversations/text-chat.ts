/**
 * Interactive durable text chat — streaming responses with tool call events.
 *
 * Creates a `/conversations` row first, then streams each user turn through
 * the same conversations API used by the developer-console text playground.
 * The session appears in the developer console Conversations page.
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
    auto_greet: false,
  })

  console.log(`Conversation: ${conversation.id}`)
  console.log('Type /quit to exit.\n')

  while (true) {
    const text = (await question('You: ')).trim()
    if (!text) continue
    if (text === '/quit') break

    await streamTurn(conversation.id, text)
  }
}

async function streamTurn(conversationId: string, message: string): Promise<void> {
  let wroteTokens = false

  for await (const event of client.conversations.streamTurn(
    conversationId,
    { message },
    { includeToolCalls: true },
  )) {
    switch (event.event) {
      case 'token':
        if (!wroteTokens) {
          process.stdout.write('Agent: ')
          wroteTokens = true
        }
        process.stdout.write(event.text)
        break

      case 'message':
        if (!wroteTokens) console.log(`Agent: ${event.text}`)
        break

      case 'tool_call_started':
        console.log(`\n  [tool] ${event.tool_name}(${JSON.stringify(event.input).slice(0, 120)})`)
        break

      case 'tool_call_completed':
        console.log(
          `  [tool] ${event.tool_name} -> ${
            event.succeeded ? event.result.slice(0, 200) : `FAILED: ${event.result}`
          }`,
        )
        break

      case 'error':
        console.error(`\nError: ${event.message}`)
        break

      case 'done':
        if (wroteTokens) process.stdout.write('\n')
        console.log('')
        break

      case 'thinking':
        break
    }
  }
}

main()
  .catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : String(err))
    process.exitCode = 1
  })
  .finally(() => rl.close())
