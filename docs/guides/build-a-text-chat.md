# Build a Text Chat Integration

This guide shows the production text-conversation flow for embedded web chat.

Do not use `client.simulations.*` for production/headless web chat. Simulation
sessions are for playground and coverage workflows.

## Concepts

**Conversations** are persistent, multi-turn text sessions with an agent. Use
these SDK methods for web chat:

- `client.conversations.create()` starts a production conversation.
- `client.conversations.createTurn()` sends a synchronous user turn.

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
  start_mode: 'user_first',
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

`start_mode: 'user_first'` makes the conversation start with the user's first
message. Use `start_mode: 'agent_first'` when your UI should show an agent
greeting before the first user turn.

## Resume a Conversation

Persist `conversation.id` in your app session. Send later turns to the same ID:

```typescript
await client.conversations.createTurn(
  conversationId,
  { message: 'Can you book that slot?' },
  { includeToolCalls: true },
)
```

## Browser Architecture

Do not expose workspace API keys directly in browser code. Put the SDK calls
behind your backend or BFF:

1. Browser posts the user's message to your backend.
2. Backend calls `client.conversations.create()` if there is no conversation ID.
3. Backend calls `client.conversations.createTurn()` and forwards the response
   to the browser using your app's preferred transport.
4. Browser stores the returned `conversation_id` for the next turn.

For a Node REPL example of the same REST conversation flow, see
[`examples/conversations/text-chat.ts`](../../examples/conversations/text-chat.ts).

## Troubleshooting

If a production web chat is not behaving as expected, check the SDK surface
being used:

- `client.conversations.*` is the production conversation flow.
- `client.simulations.*` is for playground and coverage workflows.
