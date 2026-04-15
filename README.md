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

// Create a trigger
const trigger = await client.triggers.create({
  name: 'Daily Outreach',
  action_id: 'skill-id',
  schedule: '0 13 * * 1-5',
  timezone: 'America/New_York',
})

// Emit a world event
await client.world.emitEvent({
  entity_id: 'entity-id',
  event_type: 'appointment_scheduled',
  data: { appointment_id: 'appt-001' },
})
```

## Configuration

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `apiKey` | `string` | Yes | Your Platform API key (create at workspace settings) |
| `workspaceId` | `string` | Yes | Your workspace ID (all resource operations are scoped to this) |
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
    maxDelayMs: 30000, // Max delay cap. Default: 30_000
  },
})
```

GET requests are retried on 408, 429, 500, 502, 503, 504. POST requests are only retried on 429 with a `Retry-After` header (idempotency concern). Backoff uses full jitter to avoid thundering herds.

## Resources

### Workspaces

```typescript
const workspace = await client.workspaces.get('workspace-id')
const { items } = await client.workspaces.list()
await client.workspaces.update('workspace-id', { name: 'New Name' })
```

### API Keys

```typescript
// Check current key info
const me = await client.apiKeys.me()

// Create a key with limited permissions
const key = await client.apiKeys.create({
  name: 'App Key',
  duration_days: 30,
  role: 'member',
})
console.log(key.api_key) // Only shown once — store it securely

// Rotate a key
const rotated = await client.apiKeys.rotate(key.key_id)
```

### Agents

```typescript
const agent = await client.agents.create({
  name: 'Patient Intake Agent',
  model: 'claude-sonnet-4-6',
  skill_ids: ['skill-id-1', 'skill-id-2'],
})

// Create a version snapshot before modifying
await client.agents.createVersion(agent.id)

const { items: agents } = await client.agents.list({ is_active: true })
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

### Triggers

```typescript
// Create a scheduled trigger (cron)
const trigger = await client.triggers.create({
  name: 'Daily Outreach',
  action_id: 'skill-id',
  schedule: '0 13 * * 1-5',  // Weekdays at 1 PM ET
  timezone: 'America/New_York',
  input_template: { lookback_hours: 24 },
})

// Fire immediately (for testing)
const run = await client.triggers.fire(trigger.id)

// Pause / resume
await client.triggers.pause(trigger.id)
await client.triggers.resume(trigger.id)
```

### World Model

```typescript
// Create an entity
const patient = await client.world.createEntity({
  entity_type: 'patient',
  canonical_id: 'MRN-12345',
  properties: { name: 'Jane Doe', phone: '+15555550123' },
})

// Emit events
await client.world.emitEvent({
  entity_id: patient.id,
  event_type: 'call_completed',
  data: { duration_seconds: 180, outcome: 'appointment_scheduled' },
})

// Query timeline
const timeline = await client.world.getTimeline(patient.id)

// Find duplicate/similar entities
const similar = await client.world.getSimilar(patient.id)
```

### Calls

```typescript
const { items: calls } = await client.calls.list({
  direction: 'inbound',
  start_date: '2026-04-01',
  end_date: '2026-04-15',
})

const detail = await client.calls.get(calls[0].id)
console.log(detail.intelligence?.summary)
console.log(detail.transcript)
```

### Analytics

```typescript
const summary = await client.analytics.getSummary({
  start_date: '2026-04-01',
  end_date: '2026-04-15',
})
console.log(summary.total_calls, summary.conversion_rate)

const daily = await client.analytics.getDaily({ granularity: 'day' })
const agentPerf = await client.analytics.getAgentPerformance()
```

### Integrations

```typescript
const integration = await client.integrations.create({
  name: 'Epic EHR',
  type: 'epic',
  config: { base_url: 'https://fhir.epic.com', client_id: '...' },
})

// Test the connection
const test = await client.integrations.test(integration.id)
console.log(test.success, test.latency_ms)

// Trigger a manual sync
await client.integrations.sync(integration.id)
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

## Generating types from the OpenAPI spec

The SDK ships with manually-authored types in `src/types/api.ts`. To regenerate them from the live spec:

```bash
npx openapi-typescript https://api.platform.amigo.ai/v1/openapi.json -o src/types/api.ts
```

## Development

```bash
npm install
npm run build       # build ESM + CJS
npm test            # unit tests (mocked)
npm run test:dist   # verify built artifacts
npm run lint
npm run typecheck
```

## License

MIT
