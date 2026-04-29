/**
 * Text chat over WebSocket — streaming responses with tool call events.
 *
 * Connects to the text-stream WebSocket, sends a message, and logs every
 * frame the server sends (typing indicators, tool calls, agent responses).
 *
 * Usage:
 *   AMIGO_API_KEY=... AMIGO_WORKSPACE_ID=... AMIGO_SERVICE_ID=... \
 *     npx tsx examples/conversations/text-chat.ts "Hello, what appointments are available?"
 */

import { AmigoClient } from '@amigo-ai/platform-sdk'
import WebSocket from 'ws'
import { requireEnv } from '../shared.js'

const apiKey = requireEnv('AMIGO_API_KEY')
const workspaceId = requireEnv('AMIGO_WORKSPACE_ID')
const serviceId = requireEnv('AMIGO_SERVICE_ID')
const message = process.argv[2] || 'Hello'

const client = new AmigoClient({
  apiKey,
  workspaceId,
  baseUrl: process.env.AMIGO_BASE_URL,
})

// Build the WebSocket URL — token in query param for Node.js
const wsUrl =
  client.conversations.textStreamUrl({ serviceId, token: apiKey }) + '&tool_events=true'

console.log(`Connecting to ${wsUrl.replace(apiKey, '***')}`)

const ws = new WebSocket(wsUrl)

ws.on('open', () => {
  console.log('Connected. Waiting for session_started...')
})

ws.on('message', (raw: Buffer) => {
  const frame = JSON.parse(raw.toString())

  switch (frame.type) {
    case 'session_started':
      console.log(`Session: ${frame.session_id}  Conversation: ${frame.conversation_id}`)
      console.log(`Sending: "${message}"`)
      ws.send(JSON.stringify({ type: 'message', text: message }))
      break

    case 'typing':
      process.stdout.write('...')
      break

    case 'tool_call_started':
      console.log(`\n[tool] ${frame.tool_name}(${JSON.stringify(frame.input)})`)
      break

    case 'tool_call_completed':
      console.log(
        `[tool] ${frame.tool_name} -> ${frame.succeeded ? frame.result.slice(0, 200) : 'FAILED: ' + frame.result}`,
      )
      break

    case 'message':
      console.log(`\nAgent: ${frame.text}`)
      // Close after first response for demo purposes
      ws.send(JSON.stringify({ type: 'stop' }))
      break

    case 'error':
      console.error(`Error: ${frame.message}`)
      break

    case 'session_ended':
      console.log(`Session ended: ${frame.reason}`)
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
