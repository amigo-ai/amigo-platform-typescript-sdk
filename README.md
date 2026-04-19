# @amigo-ai/platform-sdk

[![npm version](https://img.shields.io/npm/v/@amigo-ai/platform-sdk.svg)](https://www.npmjs.com/package/@amigo-ai/platform-sdk)
[![CI](https://github.com/amigo-ai/amigo-platform-typescript-sdk/actions/workflows/test.yml/badge.svg)](https://github.com/amigo-ai/amigo-platform-typescript-sdk/actions/workflows/test.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

Official TypeScript SDK for the [Amigo Platform API](https://api.platform.amigo.ai/v1/docs).

## Installation

```bash
npm install @amigo-ai/platform-sdk
```

## Quick start

```typescript
import { AmigoClient } from '@amigo-ai/platform-sdk'

const client = new AmigoClient({
  apiKey: 'your-api-key',
  workspaceId: 'your-workspace-id',
})

// List agents
const { items: agents } = await client.agents.list({ limit: 10 })
console.log(agents.map((agent) => agent.name))

// Search entities in the world model
const entityResults = await client.world.listEntities({
  q: 'Jane Doe',
  entity_type: ['patient'],
  limit: 5,
})
console.log(entityResults.entities[0]?.display_name)

// Get call analytics for the last 30 days
const stats = await client.analytics.getCalls({ days: 30 })
console.log(stats.total_calls, stats.avg_duration_seconds)
```

## Examples and Docs

- Product docs and API reference: [docs.amigo.ai](https://docs.amigo.ai/)
- Repo-local SDK examples: [examples/README.md](./examples/README.md)
- Repo-local API surface guide: [api.md](./api.md)

The docs site remains the primary reference. The examples in this repo stay close to the package surface and are typechecked in CI to reduce drift.

## Configuration

| Option        | Type           | Required | Description                                                          |
| ------------- | -------------- | -------- | -------------------------------------------------------------------- |
| `apiKey`      | `string`       | Yes      | Your Platform API key — create one at Workspace Settings > API Keys  |
| `workspaceId` | `string`       | Yes      | Your workspace ID — all resource operations are scoped to this       |
| `baseUrl`     | `string`       | No       | Override the API base URL (default: `https://api.platform.amigo.ai`) |
| `retry`       | `RetryOptions` | No       | Retry configuration for transient failures                           |
| `maxRetries`  | `number`       | No       | Convenience alias for retry count                                    |
| `timeout`     | `number`       | No       | Default request timeout in milliseconds                              |
| `headers`     | `HeadersInit`  | No       | Default headers added to every request                               |
| `hooks`       | `ClientHooks`  | No       | Request/response lifecycle hooks for tracing or logging              |
| `fetch`       | `typeof fetch` | No       | Custom fetch for BFF proxy, cookie forwarding, or test mocking       |

### Retry options

```typescript
const client = new AmigoClient({
  apiKey: 'your-key',
  workspaceId: 'your-workspace-id',
  retry: {
    maxAttempts: 3, // Total attempts including first. Default: 3
    baseDelayMs: 250, // Base delay for exponential backoff. Default: 250
    maxDelayMs: 30000, // Cap on delay. Default: 30_000
  },
})
```

GET requests are retried on 408, 429, 500, 502, 503, 504. POST requests are only retried on 429 with a `Retry-After` header. Backoff uses full jitter.

### Runtime requirements

The SDK is built around web-standard primitives. Use it in runtimes that provide:

- `fetch`, `Request`, `Response`, `Headers`, `URL`
- `AbortController`
- `TextEncoder` / `TextDecoder`
- `crypto.subtle` for webhook signature verification

CI currently validates Node-based packaging and runtime behavior. Standards-based edge/server runtimes with the same APIs work well with the low-level request wrappers.

## Generated Types

The SDK ships with generated OpenAPI types and re-exports them for direct use:

```typescript
import type { components, operations, paths } from '@amigo-ai/platform-sdk'

type Agent = components['schemas']['AgentResponse']
type ListAgentsQuery = operations['list_agents_v1__workspace_id__agents_get']['parameters']['query']
```

Public builds are generated from the committed [`openapi.json`](./openapi.json) snapshot in this repo so type output stays deterministic across machines and CI runs. When you need to refresh that snapshot, run:

```bash
npm run openapi:sync
```

For a repo-local overview of the exported client surface, see the generated [api.md](./api.md).

## Advanced request control

The normal resource surface supports scoped request overrides, so you can keep the ergonomic API while adding timeout, retry, and header controls:

```typescript
const agents = await client
  .withOptions({
    timeout: 5_000,
    maxRetries: 1,
    headers: { 'X-Debug-Trace': 'true' },
  })
  .agents.list({ limit: 10 })

console.log(agents._request_id)
console.log(agents.lastResponse.statusCode)
console.log(agents.items)
```

You can scope options to a single resource as well:

```typescript
const agent = await client.agents.withOptions({ timeout: 2_000 }).get('agent-id')
```

For lower-level control, use the built-in typed HTTP helpers. Workspace-scoped routes automatically receive your configured `workspaceId`, and the configured value wins if `workspace_id` is provided manually.

```typescript
const result = await client.GET('/v1/{workspace_id}/agents', {
  params: { query: { limit: 10 } },
  timeout: 5_000,
  maxRetries: 1,
  headers: { 'X-Debug-Trace': 'true' },
})

console.log(result.requestId)
console.log(result.data.items)
console.log(result.rateLimit.remaining)
```

Available helpers:

- `client.GET(...)`
- `client.POST(...)`
- `client.PUT(...)`
- `client.PATCH(...)`
- `client.DELETE(...)`
- `client.HEAD(...)`
- `client.OPTIONS(...)`
- `client.withOptions(...)`
- `client.<resource>.withOptions(...)`

### Response metadata

Object responses from resource methods include non-enumerable request metadata:

```typescript
const agent = await client.agents.get('agent-id')

console.log(agent._request_id)
console.log(agent.lastResponse.statusCode)
console.log(agent.lastResponse.rateLimit.remaining)
```

Low-level request helpers return the raw `Response` alongside parsed data:

```typescript
const { data, response, requestId } = await client.GET('/v1/{workspace_id}/agents')

console.log(requestId)
console.log(response.headers.get('content-type'))
console.log(data.items)
```

### Request hooks

Use hooks for logging, tracing, and metrics without wrapping `fetch` yourself:

```typescript
const client = new AmigoClient({
  apiKey: 'your-api-key',
  workspaceId: 'your-workspace-id',
  hooks: {
    onRequest({ request, schemaPath }) {
      console.log('request', request.method, schemaPath)
    },
    onResponse({ response, requestId }) {
      console.log('response', response.status, requestId)
    },
  },
})
```

## Resources

### Agents

```typescript
// Create an agent
const agent = await client.agents.create({
  name: 'Patient Intake Agent',
  description: 'Handles inbound scheduling calls',
})

// Create a version (the versioned config object)
const version = await client.agents.createVersion(agent.id, {
  name: 'v1',
  identity: {
    name: 'Alex',
    role: 'Scheduling Coordinator',
    developed_by: 'Acme Health',
    default_spoken_language: 'en',
    relationship_to_developer: {
      ownership: 'Acme Health',
      type: 'assistant',
      conversation_visibility: 'public',
      thought_visibility: 'private',
    },
  },
})

// Get the latest version
const latest = await client.agents.getVersion(agent.id, 'latest')

const { items: agents } = await client.agents.list({ search: 'intake' })
```

### Actions

Actions are reusable agent capabilities (formerly "skills").

```typescript
const action = await client.actions.create({
  slug: 'schedule-appointment',
  name: 'Schedule Appointment',
  description: 'Books appointments in the scheduling system',
  input_schema: {
    type: 'object',
    properties: {
      patient_id: { type: 'string' },
      appointment_type: { type: 'string' },
    },
    required: ['patient_id', 'appointment_type'],
  },
  execution_tier: 'orchestrated',
})

// Test with a sample input
const result = await client.actions.test(action.id, {
  input: { patient_id: 'ID-001', appointment_type: 'follow-up' },
})
console.log(result.result, result.duration_ms)
```

### Services

Services wire together an agent + context graph + phone channel.

```typescript
const { items: services } = await client.services.list()
const service = await client.services.get('service-id')
console.log(service.agent_name, service.channel_type, service.version_sets)
```

### World Model

The world model tracks entities (patients, contacts, appointments) and the events that flow through them.

```typescript
// Filter entities with simple list queries
const patients = await client.world.listEntities({
  q: 'Jane Doe',
  entity_type: ['patient'],
  limit: 10,
})
console.log(patients.entities.length)

// Get a single entity
const patient = await client.world.getEntity('entity-id')
console.log(patient.display_name, patient.entity_type)

// Query timeline
const timeline = await client.world.getTimeline('entity-id', { limit: 20 })

// Semantic search over the world model
const results = await client.world.search({
  q: 'Jane Doe',
  entity_type: 'patient',
  limit: 5,
})

// View sync status from connectors
const syncStatus = await client.world.getSyncStatusBySink()
```

### Calls

Calls are read-only — they are created by the voice pipeline.

```typescript
const { items: calls } = await client.calls.list({
  direction: 'inbound',
  service_id: 'service-id',
})

// Get full detail with transcript and intelligence
const detail = await client.calls.get(calls[0].call_sid)
console.log(detail.intelligence?.summary)
console.log(detail.transcript)

// Analytics benchmarks
const benchmarks = await client.calls.getBenchmarks({ days: 30 })
```

### Analytics

```typescript
// Dashboard KPIs with period-over-period deltas
const dashboard = await client.analytics.getDashboard({ days: 7 })
console.log(dashboard.call_volume.value, dashboard.call_volume.delta_pct)
console.log(dashboard.avg_quality.value)

// Call volume time series
const calls = await client.analytics.getCalls({ days: 30, interval: '1d' })
console.log(calls.total_calls, calls.calls_by_date)

// Per-agent performance
const { agents } = await client.analytics.getAgents({ period: '7d' })

// Compare two periods
const comparison = await client.analytics.compareCallPeriods({
  current_from: '2026-04-01',
  current_to: '2026-04-15',
  previous_from: '2026-03-15',
  previous_to: '2026-03-31',
})
```

### Agent Memory

Agent Memory tracks structured long-term facts about entities across conversations.

```typescript
// Get all dimension scores for an entity
const dims = await client.memory.getEntityDimensions('entity-id')
console.log(dims.dimensions) // preferences, health_history, etc.

// Get individual facts for a dimension
const facts = await client.memory.getEntityFacts('entity-id', { dimension: 'preferences' })

// Workspace-level memory health
const analytics = await client.memory.getAnalytics()
console.log(analytics.coverage_rate, analytics.total_facts)
```

### Integrations

```typescript
const { items: integrations } = await client.integrations.list({ enabled: true })

// Test a specific endpoint
const result = await client.integrations.testEndpoint('integration-id', 'geocode', {
  textQuery: '123 Main St, Springfield',
})
```

### Data Sources

```typescript
const { items: sources } = await client.dataSources.list()
const source = await client.dataSources.get('source-id')
console.log(source.source_type, source.health_status, source.last_sync_at)
```

### Settings

```typescript
// Voice
const voice = await client.settings.voice.get()
await client.settings.voice.update({ voice_id: 'new-voice-id', speed: 1.1 })

// Retention
const retention = await client.settings.retention.get()
await client.settings.retention.update({ call_recordings_days: 90 })

// Memory dimensions
const memory = await client.settings.memory.get()
console.log(memory.dimensions) // list of configured memory dimensions
```

### Billing

```typescript
const dashboard = await client.billing.getDashboard()
const usage = await client.billing.getUsage()
const { items: invoices } = await client.billing.listInvoices()
const pdf = await client.billing.getInvoicePdf('invoice-id')
```

### Operators

```typescript
const { items: operators } = await client.operators.list()
const dashboard = await client.operators.getDashboard()
const queue = await client.operators.getQueue()
const escalations = await client.operators.getActiveEscalations()

// Join/leave calls, switch mode, send guidance
await client.operators.joinCall('operator-id', { call_sid: 'call-sid' })
await client.operators.sendGuidance('operator-id', { text: 'Ask about allergies' })
await client.operators.wrapUp('operator-id', { outcome: 'resolved' })
```

### Triggers (Automations)

```typescript
const trigger = await client.triggers.create({
  name: 'Daily outreach',
  schedule: '0 9 * * 1-5',
  timezone: 'America/New_York',
  action_id: 'skill-id',
  event_type: 'trigger.scheduled',
  input_template: { campaign: 'follow-up' },
})

await client.triggers.fire(trigger.id)
await client.triggers.pause(trigger.id)
await client.triggers.resume(trigger.id)
const runs = await client.triggers.listRuns(trigger.id)
```

### Review Queue

```typescript
const stats = await client.reviewQueue.getStats()
const dashboard = await client.reviewQueue.getDashboard()
const { items } = await client.reviewQueue.list({ status: 'pending' })

// Claim, approve, reject, correct
await client.reviewQueue.claim('item-id')
await client.reviewQueue.approve('item-id', { notes: 'Verified correct' })
await client.reviewQueue.reject('item-id', { reason: 'Data mismatch' })
await client.reviewQueue.batchApprove({ item_ids: ['id1', 'id2'] })
```

### Personas

```typescript
const persona = await client.personas.create({
  name: 'Friendly Scheduler',
  voice_style: 'warm and professional',
})
const { items: personas } = await client.personas.list()
```

### Compliance & Safety

```typescript
const hipaa = await client.compliance.getHipaa()
const safetyConfig = await client.safety.getConfig()
const templates = await client.safety.listTemplates()
```

### Audit

```typescript
const { items: events } = await client.audit.list({ limit: 50 })
const summary = await client.audit.getSummary()
await client.audit.createExport({ start_date: '2026-01-01', end_date: '2026-03-31' })
```

### Recordings

```typescript
const urls = await client.recordings.getUrls('call-sid')
const metadata = await client.recordings.getMetadata('call-sid')
```

### Functions (UC Functions)

```typescript
const catalog = await client.functions.getCatalog()
const { items: functions } = await client.functions.list()
const result = await client.functions.test('my-function', { input: { query: 'test' } })
```

### Webhook Destinations

```typescript
const dest = await client.webhookDestinations.create({
  name: 'My Webhook',
  url: 'https://example.com/webhook',
  events: ['call.completed'],
})
const deliveries = await client.webhookDestinations.listDeliveries(dest.id)
```

## Webhook Verification

Use the raw request body when verifying webhook deliveries. Timestamped signatures are replay-protected by default.

```typescript
import { parseWebhookEvent, WebhookVerificationError } from '@amigo-ai/platform-sdk'

const body = await request.text()

try {
  const event = await parseWebhookEvent({
    payload: body,
    signature: request.headers.get('x-amigo-signature') ?? '',
    timestamp: request.headers.get('x-amigo-timestamp') ?? undefined,
    secret: process.env.AMIGO_WEBHOOK_SECRET!,
  })

  console.log(event.type, event.data)
} catch (error) {
  if (error instanceof WebhookVerificationError) {
    console.error('Rejected webhook:', error.message)
  } else {
    throw error
  }
}
```

If your delivery channel only provides a legacy HMAC without a timestamp, the original helper signature still works:

```typescript
import { parseWebhookEvent } from '@amigo-ai/platform-sdk'

const event = await parseWebhookEvent(rawBody, signature, secret)
```

## BFF Proxy (Next.js)

For frontend apps that use a Backend-for-Frontend proxy:

```typescript
const client = new AmigoClient({
  apiKey: 'bff-proxy',
  workspaceId: 'ws-id',
  baseUrl: '/api/platform',
  fetch: customFetchWithCookies,
})
```

## Pagination

All list methods return `{ items, has_more, continuation_token }`. Use the `paginate` utility to iterate all pages automatically:

```typescript
import { AmigoClient, paginate } from '@amigo-ai/platform-sdk'

for await (const entity of paginate((token) =>
  client.world.listEntities({ continuation_token: token, limit: 100 }),
)) {
  // process entity
}
```

## Error handling

All SDK errors extend `AmigoError`. Use type guards for specific handling:

```typescript
import {
  AmigoClient,
  AmigoError,
  isNotFoundError,
  isRateLimitError,
  isAuthenticationError,
} from '@amigo-ai/platform-sdk'

try {
  await client.agents.get('agent-id')
} catch (err) {
  if (isNotFoundError(err)) {
    console.log('Agent not found')
  } else if (isRateLimitError(err)) {
    console.log('Rate limited, retry after:', err.retryAfter, 'seconds')
  } else if (isAuthenticationError(err)) {
    console.log('Invalid API key')
  } else if (err instanceof AmigoError) {
    console.log('API error:', err.message, err.errorCode, err.requestId)
  }
}
```

Webhook verification errors are separate from API transport errors and throw `WebhookVerificationError`.

### Error classes

| Class                 | HTTP Status | Description                             |
| --------------------- | ----------- | --------------------------------------- |
| `BadRequestError`     | 400         | Malformed request                       |
| `AuthenticationError` | 401         | Invalid or expired API key              |
| `PermissionError`     | 403         | Insufficient permissions                |
| `NotFoundError`       | 404         | Resource does not exist                 |
| `ConflictError`       | 409         | Duplicate slug or version conflict      |
| `ValidationError`     | 422         | Request body validation failure         |
| `RateLimitError`      | 429         | Too many requests — check `.retryAfter` |
| `ServerError`         | 5xx         | Server-side error                       |
| `ConfigurationError`  | —           | SDK misconfiguration at init time       |
| `NetworkError`        | —           | Fetch/network failure                   |
| `RequestTimeoutError` | —           | Request exceeded the configured timeout |

## CommonJS (CJS) usage

```javascript
const { AmigoClient } = require('@amigo-ai/platform-sdk')
```

## License

MIT
