# Build a Text Chat Integration

This guide shows the REST flow for production text chat integrations. Create a
conversation once, then send each user message to that conversation with a
synchronous turn request.

## Concepts

**Conversations** are durable, multi-turn text sessions with an agent. Create
one conversation when a chat session starts and persist its `id` in your backend
or session state.

**Turns** are user messages sent to an existing conversation. Each turn returns
the user input, the agent output messages, and a snapshot of the conversation.

**Entity context** is optional. If you already have a world-model entity for the
patient or user, pass its existing `entity_id` when creating the conversation so
the agent can use that context.

## Step 1: Create the SDK client

Run platform API calls from your backend so API keys are not exposed to the
browser.

```typescript
import { AmigoClient } from '@amigo-ai/platform-sdk'

const client = new AmigoClient({
  apiKey: process.env.AMIGO_API_KEY!,
  workspaceId: process.env.AMIGO_WORKSPACE_ID!,
})
```

## Step 2: Create a conversation

Create the conversation before the first user message. In a production web chat,
do this when the user opens a new chat session, then store `conversation.id` and
reuse it for every user turn in that session.

```typescript
const conversation = await client.conversations.create({
  service_id: 'your-service-id',
  entity_id: 'existing-patient-entity-id', // optional existing world entity
})

console.log(conversation.id)
console.log(conversation.entity_id)
```

If you do not have an entity yet, omit `entity_id`:

```typescript
const conversation = await client.conversations.create({
  service_id: 'your-service-id',
})
```

## Step 3: Send user turns

Send each user message to the conversation with `createTurn()`.

```typescript
const firstTurn = await client.conversations.createTurn(conversation.id, {
  message: 'Hello, I need help scheduling an appointment',
})

for (const message of firstTurn.output) {
  console.log(message.text)
}

const nextTurn = await client.conversations.createTurn(conversation.id, {
  message: 'Tuesday morning works',
})

console.log(nextTurn.conversation.turn_count)
console.log(nextTurn.output.map((message) => message.text).join('\n'))
```

Pass `includeToolCalls: true` when your backend needs tool-call details for
debugging, audit, or UI display.

```typescript
const turn = await client.conversations.createTurn(
  conversation.id,
  { message: 'What appointments are available next week?' },
  { includeToolCalls: true },
)

for (const toolCall of turn.tool_calls ?? []) {
  console.log(toolCall.tool_name, toolCall.succeeded)
}
```

## Step 4: Expose backend routes

A browser chat UI should call your backend. The backend creates the conversation
and sends turns to the Platform API.

```typescript
app.post('/chat/conversations', async (req, res) => {
  const conversation = await client.conversations.create({
    service_id: process.env.AMIGO_SERVICE_ID!,
    entity_id: req.body.entityId,
  })

  res.json({ conversationId: conversation.id })
})

app.post('/chat/conversations/:conversationId/turns', async (req, res) => {
  const turn = await client.conversations.createTurn(req.params.conversationId, {
    message: req.body.message,
  })

  res.json({
    conversation: turn.conversation,
    messages: turn.output.map((message) => ({
      role: message.role,
      text: message.text,
      timestamp: message.timestamp,
    })),
  })
})
```

## Step 5: Keep conversation state

Store the conversation ID wherever you keep chat session state. Every follow-up
message should use the same ID:

```typescript
await client.conversations.createTurn(savedConversationId, {
  message: userMessage,
})
```

Start a new conversation only when the user starts a separate chat session or
workflow. Do not use simulation sessions for production user text conversations.

## Error handling

Common REST errors:

| Status | Meaning                | Action                                                      |
| ------ | ---------------------- | ----------------------------------------------------------- |
| `400`  | Bad request            | Validate the message body and conversation state            |
| `401`  | Unauthorized           | Check the API key                                           |
| `403`  | Forbidden              | Check workspace and service permissions                     |
| `404`  | Conversation not found | Confirm the conversation ID belongs to this workspace       |
| `422`  | Validation error       | Check `service_id`, `entity_id`, and request payload fields |

## REPL example

The SDK repo includes a synchronous REST REPL:

```bash
AMIGO_API_KEY=... AMIGO_WORKSPACE_ID=... AMIGO_SERVICE_ID=... \
  npx tsx examples/conversations/text-chat.ts
```

To bind the conversation to an existing world entity, also set
`AMIGO_ENTITY_ID`.
