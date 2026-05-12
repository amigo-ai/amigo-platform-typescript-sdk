# Build a Text Chat Integration

This guide shows the production text-conversation flow for embedded web chat.

Do not use `client.simulations.*` for production/headless web chat. Simulation
sessions are for playground and coverage workflows.

## Concepts

**Conversations** are persistent, multi-turn text sessions with an agent. Use
these SDK methods for web chat:

- `client.conversations.create()` starts a production conversation.
- `client.conversations.createTurn()` sends a synchronous user turn.
- `client.conversationStreams.streamTurn()` sends a user turn and yields typed SSE
  events for tokens, tool calls, messages, and completion.

After each turn, the conversation may freeze/dormant on the server until the
next user turn resumes it. Keep the returned `conversation_id` and pass it into
the next request.

## User-First Synchronous Chat

Create the conversation once, store the returned ID, then send user turns to
that explicit conversation.

```typescript
import { AmigoClient } from '@amigo-ai/platform-sdk'

const client = new AmigoClient({
  apiKey: process.env.AMIGO_API_KEY!,
  workspaceId: process.env.AMIGO_WORKSPACE_ID!,
})

const conversation = await client.conversations.create({
  service_id: process.env.AMIGO_SERVICE_ID!,
  entity_id: 'optional-patient-entity-id',
  auto_greet: false,
})

const firstTurn = await client.conversations.createTurn(conversation.id, {
  message: 'Hi, I need help scheduling an appointment',
})

console.log(conversation.id)
console.log(firstTurn.output.map((message) => message.text))

const nextTurn = await client.conversations.createTurn(conversation.id, {
  message: 'Tuesday morning works',
})
```

`auto_greet: false` makes the conversation start with the user's first message.
Use `auto_greet: true` when your UI should show an agent greeting before the
first user turn.

## Streaming Chat

Use `create()` once, store the returned conversation ID, then call
`streamTurn()` for every user message.

```typescript
const conversation = await client.conversations.create({
  service_id: process.env.AMIGO_SERVICE_ID!,
  entity_id: 'optional-patient-entity-id',
  auto_greet: false,
})

for await (const event of client.conversationStreams.streamTurn(
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
for await (const event of client.conversationStreams.streamTurn(conversationId, {
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
3. Backend calls `client.conversations.createTurn()` or
   `client.conversationStreams.streamTurn()` and forwards the response to the
   browser using your app's preferred transport.
4. Browser stores the returned `conversation_id` for the next turn.

For a Node REPL example of the same durable streaming flow, see
[`examples/conversations/text-chat.ts`](../../examples/conversations/text-chat.ts).

## Troubleshooting

If a production web chat is not behaving as expected, check the SDK surface
being used:

- `client.conversations.*` is the production conversation flow.
- `client.conversationStreams.*` is the streaming variant for production
  conversations.
- `client.simulations.*` is for playground and coverage workflows.
- Legacy text WebSocket helpers may not be available in all deployments and
  should not be used for new headless web-chat integrations.
