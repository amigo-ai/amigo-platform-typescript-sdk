# @amigo-ai/platform-sdk

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
const { items: agents } = await client.agents.list()

// Emit a world event
await client.world.emitEvent({
  entity_id: 'entity-id',
  event_type: 'appointment_scheduled',
  data: { appointment_id: 'appt-001' },
})

// Get call analytics for the last 30 days
const stats = await client.analytics.getCalls({ period: '30d' })
console.log(stats.total_calls, stats.avg_duration_seconds)
```

## Configuration

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `apiKey` | `string` | Yes | Your Platform API key — create one at Workspace Settings > API Keys |
| `workspaceId` | `string` | Yes | Your workspace ID — all resource operations are scoped to this |
| `baseUrl` | `string` | No | Override the API base URL (default: `https://api.platform.amigo.ai`) |
| `retry` | `RetryOptions` | No | Retry configuration for transient failures |

### Retry options

```typescript
const client = new AmigoClient({
  apiKey: 'your-key',
  workspaceId: 'your-workspace-id',
  retry: {
    maxAttempts: 3,    // Total attempts including first. Default: 3
    baseDelayMs: 250,  // Base delay for exponential backoff. Default: 250
    maxDelayMs: 30000, // Cap on delay. Default: 30_000
  },
})
```

GET requests are retried on 408, 429, 500, 502, 503, 504. POST requests are only retried on 429 with a `Retry-After` header. Backoff uses full jitter.

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

### Skills

```typescript
const skill = await client.skills.create({
  slug: 'schedule-appointment',
  name: 'Schedule Appointment',
  description: 'Books appointments in the EHR system',
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
const result = await client.skills.test(skill.id, {
  input: { patient_id: 'MRN-001', appointment_type: 'follow-up' },
})
console.log(result.success, result.output)
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
// Create an entity
const patient = await client.world.createEntity({
  entity_type: 'patient',
  canonical_id: 'MRN-12345',
  display_name: 'Jane Doe',
})

// Emit an event
await client.world.emitEvent({
  entity_id: patient.id,
  event_type: 'call_completed',
  data: { duration_seconds: 180, outcome: 'appointment_scheduled' },
})

// Query timeline
const timeline = await client.world.getTimeline(patient.id)

// Search entities
const results = await client.world.search('Jane Doe', { entity_type: 'patient' })

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
const calls = await client.analytics.getCalls({ period: '30d' })
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
const result = await client.integrations.testEndpoint(
  'integration-id',
  'geocode',
  { textQuery: '123 Main St, Springfield' },
)
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
const usage = await client.billing.getUsage()
console.log(usage.meters, usage.total_events)

const { items: invoices } = await client.billing.listInvoices()
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

### Error classes

| Class | HTTP Status | Description |
|-------|-------------|-------------|
| `BadRequestError` | 400 | Malformed request |
| `AuthenticationError` | 401 | Invalid or expired API key |
| `PermissionError` | 403 | Insufficient permissions |
| `NotFoundError` | 404 | Resource does not exist |
| `ConflictError` | 409 | Duplicate slug or version conflict |
| `ValidationError` | 422 | Request body validation failure |
| `RateLimitError` | 429 | Too many requests — check `.retryAfter` |
| `ServerError` | 5xx | Server-side error |
| `ConfigurationError` | — | SDK misconfiguration at init time |
| `NetworkError` | — | Fetch/network failure |

## CommonJS (CJS) usage

```javascript
const { AmigoClient } = require('@amigo-ai/platform-sdk')
```

## License

MIT
