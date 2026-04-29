/**
 * Reference text-chat server — streaming responses with tool call events.
 *
 * Serves a static HTML chat UI and proxies WebSocket authentication so the
 * API key stays server-side. The browser connects to a local WebSocket that
 * relays frames to/from the platform text-stream endpoint.
 *
 * Usage:
 *   AMIGO_API_KEY=... AMIGO_WORKSPACE_ID=... AMIGO_SERVICE_ID=... \
 *     npx tsx examples/text-chat-app/server.ts
 *
 *   Then open http://localhost:3000
 */

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { WebSocketServer, WebSocket } from 'ws'
import { AmigoClient, textStreamAuthProtocols } from '@amigo-ai/platform-sdk'
import { requireEnv } from '../shared.js'

const apiKey = requireEnv('AMIGO_API_KEY')
const workspaceId = requireEnv('AMIGO_WORKSPACE_ID')
const serviceId = requireEnv('AMIGO_SERVICE_ID')
const port = Number(process.env.PORT || 3000)

const client = new AmigoClient({
  apiKey,
  workspaceId,
  baseUrl: process.env.AMIGO_BASE_URL,
})

const indexHtml = readFileSync(join(import.meta.dirname, 'public', 'index.html'))

const httpServer = createServer((_req: IncomingMessage, res: ServerResponse) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
  res.end(indexHtml)
})

const wss = new WebSocketServer({ server: httpServer, path: '/ws' })

wss.on('connection', (browserWs: WebSocket) => {
  const wsUrl = client.conversations.textStreamUrl({
    serviceId,
    toolEvents: true,
    token: apiKey,
  })

  const platformWs = new WebSocket(wsUrl, [...textStreamAuthProtocols(apiKey)])
  let open = false

  platformWs.on('open', () => {
    open = true
    browserWs.send(JSON.stringify({ type: 'connected' }))
  })

  platformWs.on('message', (data) => {
    if (browserWs.readyState === WebSocket.OPEN) {
      browserWs.send(String(data))
    }
  })

  platformWs.on('close', (code, reason) => {
    open = false
    if (browserWs.readyState === WebSocket.OPEN) {
      browserWs.close(code, String(reason))
    }
  })

  platformWs.on('error', () => {
    open = false
    if (browserWs.readyState === WebSocket.OPEN) {
      browserWs.send(JSON.stringify({ type: 'error', message: 'Platform connection failed' }))
      browserWs.close()
    }
  })

  browserWs.on('message', (data) => {
    if (open && platformWs.readyState === WebSocket.OPEN) {
      platformWs.send(String(data))
    }
  })

  browserWs.on('close', () => {
    if (open && platformWs.readyState === WebSocket.OPEN) {
      platformWs.send(JSON.stringify({ type: 'stop' }))
      platformWs.close()
    }
    open = false
  })
})

httpServer.listen(port, () => {
  console.log(`Text chat app running at http://localhost:${port}`)
  console.log(`Workspace: ${workspaceId}`)
  console.log(`Service:   ${serviceId}`)
})
