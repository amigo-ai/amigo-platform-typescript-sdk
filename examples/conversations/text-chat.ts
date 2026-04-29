/**
 * Interactive text chat over WebSocket — streaming responses with tool call events.
 *
 * Connects to the text-stream WebSocket and starts an interactive REPL.
 * Type messages, see tool calls and agent responses stream in real-time.
 *
 * Usage:
 *   AMIGO_API_KEY=... AMIGO_WORKSPACE_ID=... AMIGO_SERVICE_ID=... \
 *     npx tsx examples/conversations/text-chat.ts
 */

import { AmigoClient } from '@amigo-ai/platform-sdk'
import * as readline from 'readline'
import WebSocket from 'ws'
import { requireEnv } from '../shared.js'

const apiKey = requireEnv('AMIGO_API_KEY')
const workspaceId = requireEnv('AMIGO_WORKSPACE_ID')
const serviceId = requireEnv('AMIGO_SERVICE_ID')

const client = new AmigoClient({
  apiKey,
  workspaceId,
  baseUrl: process.env.AMIGO_BASE_URL,
})

const wsUrl =
  client.conversations.textStreamUrl({ serviceId, token: apiKey }) + '&tool_events=true'

console.log(`Connecting to ${wsUrl.replace(apiKey, '***')}`)

const ws = new WebSocket(wsUrl)
const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

function prompt() {
  rl.question('You: ', (text) => {
    if (!text.trim()) return prompt()
    if (text.trim() === '/quit') {
      ws.send(JSON.stringify({ type: 'stop' }))
      return
    }
    ws.send(JSON.stringify({ type: 'message', text: text.trim() }))
  })
}

ws.on('open', () => {
  console.log('Connected. Waiting for session...\n')
})

ws.on('message', (raw: Buffer) => {
  const frame = JSON.parse(raw.toString())

  switch (frame.type) {
    case 'session_started':
      console.log(`Session: ${frame.session_id}`)
      console.log(`Conversation: ${frame.conversation_id}\n`)
      break

    case 'typing':
      break

    case 'tool_call_started':
      console.log(`  [tool] ${frame.tool_name}(${JSON.stringify(frame.input).slice(0, 120)})`)
      break

    case 'tool_call_completed':
      console.log(
        `  [tool] ${frame.tool_name} → ${frame.succeeded ? frame.result.slice(0, 200) : 'FAILED: ' + frame.result}`,
      )
      break

    case 'message':
      console.log(`Agent: ${frame.text}\n`)
      prompt()
      break

    case 'error':
      console.error(`Error: ${frame.message}\n`)
      prompt()
      break

    case 'session_ended':
      console.log(`\nSession ended: ${frame.reason}`)
      rl.close()
      ws.close()
      break
  }
})

ws.on('close', (code: number, reason: Buffer) => {
  console.log(`Disconnected (${code}: ${reason.toString() || 'clean'})`)
  process.exit(0)
})

ws.on('error', (err: Error) => {
  console.error(`WebSocket error: ${err.message}`)
  process.exit(1)
})
