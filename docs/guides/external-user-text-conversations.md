# External User Text Conversations

This quick start shows how to configure an external integration backend that
mints external-user tokens and uses the TypeScript SDK to create customer text
conversations with Amigo agents.

External-user tokens are for customer systems that need to act on behalf of one
of their own users without adding that user to the Amigo workspace. The backend
owns a constrained parent credential, mints a short-lived child token for one
subject and service, and then uses that child token for conversation routes.

## 1. Install and configure

```bash
npm install @amigo-ai/platform-sdk
```

Set these values on your backend:

```bash
AMIGO_API_KEY=... # admin/owner key used only for setup
AMIGO_WORKSPACE_ID=...
AMIGO_SERVICE_ID=... # the Amigo service the customer may chat with
AMIGO_EXTERNAL_INTEGRATION_CLIENT_ID=...
AMIGO_EXTERNAL_INTEGRATION_CLIENT_SECRET=...
AMIGO_EXTERNAL_SUBJECT_KEY=customer-user-123
AMIGO_CONSUMER_ENTITY_ID=... # optional existing world entity UUID
```

## 2. Create the parent integration credential

Run this from an admin/owner backend or setup job. Save the returned
`client_id` and one-time `client_secret`; list responses will not show the
secret again.

```typescript
import { AmigoClient } from '@amigo-ai/platform-sdk'

const workspaceId = process.env.AMIGO_WORKSPACE_ID!
const serviceId = process.env.AMIGO_SERVICE_ID!

const admin = new AmigoClient({
  apiKey: process.env.AMIGO_API_KEY!,
  workspaceId,
  baseUrl: process.env.AMIGO_BASE_URL,
})

const integration = await admin.externalIntegrations.create({
  name: 'customer-portal',
  display_name: 'Customer Portal',
  description: 'Backend for customer text conversations',
})

const { credential, client_secret } = await admin.externalIntegrations.createCredential(
  integration.id,
  {
    name: 'production backend',
    service_ids: [serviceId],
  },
)

console.log('client_id:', credential.client_id)
console.log('client_secret:', client_secret)
```

The credential can mint external-user sessions only for the configured
`service_ids`. External users do not get workspace memberships or workspace
roles.

## 3. Mint an external-user session

Use the external integration credential from your customer backend:

```typescript
import { AmigoClient, EXTERNAL_USER_SESSION_CREATE_SCOPE } from '@amigo-ai/platform-sdk'

const workspaceId = process.env.AMIGO_WORKSPACE_ID!
const serviceId = process.env.AMIGO_SERVICE_ID!

const backend = new AmigoClient({
  apiKey: process.env.AMIGO_API_KEY!,
  workspaceId,
  baseUrl: process.env.AMIGO_BASE_URL,
})

const parent = await backend.tokens.exchangeClientCredentials({
  clientId: process.env.AMIGO_EXTERNAL_INTEGRATION_CLIENT_ID!,
  clientSecret: process.env.AMIGO_EXTERNAL_INTEGRATION_CLIENT_SECRET!,
  scope: EXTERNAL_USER_SESSION_CREATE_SCOPE,
})

const externalSession = await backend.tokens.createExternalUserSession({
  parentAccessToken: parent.access_token,
  externalSubjectKey: process.env.AMIGO_EXTERNAL_SUBJECT_KEY!,
  subjectType: 'user',
  serviceId,
  consumerEntityId: process.env.AMIGO_CONSUMER_ENTITY_ID,
  ttlSeconds: 1800,
})
```

`externalSubjectKey` should be stable in your system, such as your customer user
ID. Amigo stores a keyed hash of this value. Pass `consumerEntityId` only when
the subject already has a materialized world entity UUID.

## 4. Create and continue a text conversation

Use the child `external_user` access token with a separate SDK client:

```typescript
const externalUser = new AmigoClient({
  apiKey: externalSession.access_token,
  workspaceId,
  baseUrl: process.env.AMIGO_BASE_URL,
})

const conversation = await externalUser.conversations.create({
  service_id: serviceId,
})

const firstTurn = await externalUser.conversations.createTurn(conversation.id, {
  message: 'Hello, I need help scheduling.',
})

for (const message of firstTurn.output) {
  console.log(message.text)
}
```

For streaming responses, use the same external-user client:

```typescript
for await (const event of externalUser.conversations.streamTurn(conversation.id, {
  message: 'Can I get a Tuesday appointment?',
})) {
  if (event.event === 'token') process.stdout.write(event.text)
  if (event.event === 'done') break
}
```

## 5. Refresh before expiry

External-user access tokens are short-lived. Rotate the refresh token from your
backend and replace the child-token client:

```typescript
if (!externalSession.refresh_token) {
  throw new Error('external-user session did not include a refresh token')
}

const refreshed = await backend.tokens.refresh({
  refreshToken: externalSession.refresh_token,
  workspaceId,
})

const refreshedExternalUser = new AmigoClient({
  apiKey: refreshed.access_token,
  workspaceId,
  baseUrl: process.env.AMIGO_BASE_URL,
})

await refreshedExternalUser.conversations.createTurn(conversation.id, {
  message: 'Tuesday morning works.',
})
```

## Operational constraints

- Parent credentials need exactly the `external_user_sessions:create` scope.
- Parent credentials are not general platform API credentials.
- Child tokens are bound to the workspace, subject, service, and session.
- Child tokens cannot list workspace conversations.
- Child tokens cannot request `include_tool_calls`.
- Conversation create derives the user binding from the token; do not send a
  conflicting entity in external-user flows.
- Service or entity mismatch responses mean the child token does not match the
  requested conversation.
- Treat refresh reuse/theft errors as terminal. Start a new external-user
  session from the parent credential.

See
[`examples/auth/external-user-session.ts`](../../examples/auth/external-user-session.ts)
for a complete typechecked script.
