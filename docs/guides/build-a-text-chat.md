# Build a Text Chat Integration

This guide shows the durable text-conversation flow used by the developer-console
text playground. It creates rows through `/v1/{workspace_id}/conversations`, so
the resulting sessions appear in `/{workspace}/conversations`.

Do not use `client.simulations.*` for production/headless web chat. Simulation
sessions are for test coverage and are stored as simulated call intelligence,
not as conversation rows.

## Concepts

**Conversations** are persistent, multi-turn text sessions with an agent. Use
these SDK methods for web chat:

- `client.conversations.create()` starts a durable conversation row.
- `client.conversations.createTurn()` sends a synchronous user turn.
- `client.conversations.streamTurn()` sends a user turn and yields typed SSE
  events for tokens, tool calls, messages, and completion.
- `client.conversations.sendMessage()` is a user-first convenience helper that
  creates a conversation when `conversation_id` is omitted, then sends the turn.

After each turn, the conversation may freeze/dormant on the server until the
next user turn resumes it. Keep the returned `conversation_id` and pass it into
the next request.

## User-First Synchronous Chat

Use `sendMessage()` when your backend wants a simple request/response flow.

```typescript
import { AmigoClient } from '@amigo-ai/platform-sdk'

const client = new AmigoClient({
  apiKey: process.env.AMIGO_API_KEY!,
  workspaceId: process.env.AMIGO_WORKSPACE_ID!,
})

const firstTurn = await client.conversations.sendMessage({
  service_id: process.env.AMIGO_SERVICE_ID!,
  entity_id: 'optional-patient-entity-id',
  message: 'Hi, I need help scheduling an appointment',
})

console.log(firstTurn.conversation_id)
console.log(firstTurn.messages.map((message) => message.text))

const nextTurn = await client.conversations.sendMessage({
  conversation_id: firstTurn.conversation_id,
  message: 'Tuesday morning works',
})
```

`sendMessage()` defaults the initial create call to `auto_greet: false`, so the
conversation starts with the user's first message. That matches most embedded
web-chat experiences.

## Streaming Chat

Use `create()` once, store the returned conversation ID, then call
`streamTurn()` for every user message.

```typescript
const conversation = await client.conversations.create({
  service_id: process.env.AMIGO_SERVICE_ID!,
  entity_id: 'optional-patient-entity-id',
  auto_greet: false,
})

for await (const event of client.conversations.streamTurn(
  conversation.id,
  { message: 'What appointments are available tomorrow?' },
  { includeToolCalls: true },
)) {
  switch (event.event) {
    case 'token':
      process.stdout.write(event.text)
      break

    case 'tool_call_started':
      console.log(`tool started: ${event.tool_name}`)
      break

    case 'tool_call_completed':
      console.log(`tool completed: ${event.tool_name}`)
      break

    case 'message':
      console.log(event.text)
      break

    case 'done':
      console.log(`conversation ${event.conversation_id} is ${event.status}`)
      break

    case 'error':
      throw new Error(event.message)
  }
}
```

## Resume a Conversation

Persist `conversation.id` in your app session. Send later turns to the same ID:

```typescript
await client.conversations.createTurn(
  conversationId,
  { message: 'Can you book that slot?' },
  { includeToolCalls: true },
)
```

or stream it:

```typescript
for await (const event of client.conversations.streamTurn(conversationId, {
  message: 'Can you book that slot?',
})) {
  // render token/message/tool/done events
}
```

## Browser Architecture

Do not expose workspace API keys directly in browser code. Put the SDK calls
behind your backend or BFF:

1. Browser posts the user's message to your backend.
2. Backend calls `client.conversations.create()` if there is no conversation ID.
3. Backend calls `streamTurn()` and forwards typed events to the browser using
   your app's preferred transport.
4. Browser stores the returned `conversation_id` for the next turn.

For a Node REPL example of the same durable streaming flow, see
[`examples/conversations/text-chat.ts`](../../examples/conversations/text-chat.ts).

## Troubleshooting

If a chat does not show in `/{workspace}/conversations`, check the SDK surface
being used:

- `client.conversations.*` writes durable conversation rows.
- `client.simulations.*` writes simulation/call-intelligence artifacts instead.
- Legacy text WebSocket helpers may not be available in all deployments and
  should not be used for new headless web-chat integrations.
