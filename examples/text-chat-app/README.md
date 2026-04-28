# Text Chat Reference App

Self-contained reference implementation showing end-to-end platform v2 text integration:

- **Streaming responses** via WebSocket typing and message frames
- **Streamed tool calls** via `tool_call_started` / `tool_call_completed` frames
- **Simple frontend** — single HTML file, no build step, no framework

## Architecture

```
Browser (index.html)  <-->  Local server (server.ts)  <-->  Platform WebSocket
   vanilla JS/HTML            relays frames,                /agent/text-stream
                              keeps API key                 ?tool_events=true
                              server-side
```

The server proxies the WebSocket connection so the API key never reaches the browser. In production, replace this relay with your own backend — the frame protocol is the same.

## Quick start

```bash
export AMIGO_API_KEY="your-api-key"
export AMIGO_WORKSPACE_ID="your-workspace-id"
export AMIGO_SERVICE_ID="your-service-id"

npx tsx examples/text-chat-app/server.ts
```

Open [http://localhost:3000](http://localhost:3000) and start chatting.

## WebSocket frame types

### Client -> Server

| Frame     | Fields                             | Description            |
| --------- | ---------------------------------- | ---------------------- |
| `message` | `{ type: "message", text: "..." }` | Send user input        |
| `stop`    | `{ type: "stop" }`                 | End session gracefully |

### Server -> Client

| Frame                 | Fields                                            | Description           |
| --------------------- | ------------------------------------------------- | --------------------- |
| `session_started`     | `{ type, session_id, conversation_id }`           | Session ready         |
| `typing`              | `{ type: "typing" }`                              | Agent is generating   |
| `tool_call_started`   | `{ type, tool_name, call_id, input }`             | Tool invocation began |
| `tool_call_completed` | `{ type, tool_name, call_id, result, succeeded }` | Tool finished         |
| `message`             | `{ type, text }`                                  | Agent response        |
| `error`               | `{ type, message }`                               | Error occurred        |
| `session_ended`       | `{ type, reason }`                                | Session closed        |

## Tool call wiring

Tools are configured server-side via your agent's context graph. When the agent invokes a tool:

1. `tool_call_started` frame arrives with the tool name and input parameters
2. The platform calls the tool's REST endpoint (your API)
3. `tool_call_completed` frame arrives with the result

To receive tool events, pass `toolEvents: true` when building the WebSocket URL:

```typescript
const wsUrl = client.conversations.textStreamUrl({
  serviceId: 'your-service',
  toolEvents: true,
})
```

## Adapting to your frontend

The key integration points are in `index.html`:

1. **Connect**: `new WebSocket(url)` — establish the connection
2. **Handle frames**: `ws.onmessage` — parse JSON, switch on `frame.type`
3. **Send messages**: `ws.send(JSON.stringify({ type: 'message', text }))` — send user input
4. **Render tool calls**: show loading state on `tool_call_started`, update on `tool_call_completed`

The frame protocol is transport-agnostic — the same JSON shapes work with any WebSocket client library (React, Vue, native mobile, etc.).
