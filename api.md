# API Surface

> Generated from source. Do not edit directly.

Repo-local reference for the public TypeScript SDK surface. This document complements the product docs and stays focused on the package exports that ship from this repository.

## Client

### `AmigoClient`

Configuration fields:

- `apiKey: string`
- `workspaceId: string`
- `baseUrl?: string`
- `retry?: RetryOptions`
- `maxRetries?: number`
- `timeout?: number`
- `headers?: HeadersOptions`
- `hooks?: ClientHooks`
- `fetch?: typeof globalThis.fetch`

Instance fields:

- `workspaceId: string`
- `baseUrl: string`

Client methods:

- `withOptions(options)`
- `GET(path, options?)`
- `POST(path, options?)`
- `PUT(path, options?)`
- `PATCH(path, options?)`
- `DELETE(path, options?)`
- `HEAD(path, options?)`
- `OPTIONS(path, options?)`

Notes:

- Workspace-scoped paths receive the configured `workspaceId` automatically, and the configured value wins if `workspace_id` is provided manually.
- `client.withOptions(options)` and `client.<resource>.withOptions(options)` layer headers, timeout, and retry overrides onto the normal resource surface.
- Low-level helpers return `AmigoResponse<T>` with `data`, `response`, `requestId`, and `rateLimit`.
- Object responses from resource methods include `_request_id` and `lastResponse` metadata.

## Core exports

- Errors: `AmigoError`, `BadRequestError`, `AuthenticationError`, `PermissionError`, `NotFoundError`, `ConflictError`, `ValidationError`, `RateLimitError`, `ServerError`, `ServiceUnavailableError`, `NetworkError`, `RequestTimeoutError`, `ParseError`, `ConfigurationError`
- Error guards: `isAmigoError`, `isNotFoundError`, `isRateLimitError`, `isAuthenticationError`, `isRequestTimeoutError`
- Request option types: `AmigoRequestOptions`, `ScopedRequestOptions`
- Webhooks: `verifyWebhookSignature`, `parseWebhookEvent`, `WebhookVerificationError`
- Pagination and response helpers: `paginate`, `buildLastResponse`, `extractRequestId`
- Response and hook types: `PaginatedList`, `ListParams`, `LastResponseInfo`, `ResponseMetadata`, `WithResponseMetadata`, `AmigoResponse`, `RetryOptions`, `RateLimitInfo`, `ClientHooks`, `RequestHookContext`, `ResponseHookContext`, `ErrorHookContext`
- Generated OpenAPI types: `paths`, `components`, `operations`

## Resources

All workspace-scoped resources also expose `withOptions(options)`.

### `workspaces`

- `create`
- `list`
- `get`
- `update`
- `archive`

### `apiKeys`

- `me`
- `create`
- `list`
- `revoke`
- `rotate`

### `agents`

- `create`
- `list`
- `get`
- `update`
- `delete`
- `listVersions`
- `getVersion`
- `createVersion`

### `skills`

- `create`
- `list`
- `get`
- `update`
- `delete`
- `test`

### `actions`

- `create`
- `list`
- `get`
- `update`
- `delete`
- `test`

### `operators`

- `list`
- `create`
- `get`
- `getDashboard`
- `getQueue`
- `getEscalations`
- `getActiveEscalations`
- `getEscalationStats`
- `getPerformance`
- `getAccessToken`
- `joinCall`
- `leaveCall`
- `switchMode`
- `sendGuidance`
- `createBriefing`
- `wrapUp`
- `getCallTranscript`
- `getAuditLog`

### `triggers`

- `list`
- `create`
- `get`
- `update`
- `delete`
- `fire`
- `pause`
- `resume`
- `listRuns`

### `services`

- `create`
- `list`
- `get`
- `update`
- `delete`

### `contextGraphs`

- `create`
- `list`
- `get`
- `update`
- `delete`
- `createVersion`
- `listVersions`
- `getVersion`

### `dataSources`

- `create`
- `list`
- `get`
- `update`
- `delete`
- `getStatus`
- `getSyncHistory`

### `world`

- `listEntities`
- `getEntity`
- `getRelationships`
- `getGraph`
- `getProvenance`
- `getLineage`
- `getMerged`
- `listEntityTypes`
- `listDuplicates`
- `search`
- `getTimeline`
- `getSyncStatusBySink`
- `listSyncEvents`
- `getSyncQueueDepth`
- `retrySyncEvent`
- `retryAllSyncEvents`
- `getStats`
- `getSourceBreakdown`

### `calls`

- `list`
- `get`
- `getIntelligence`
- `getActiveIntelligence`
- `getBenchmarks`
- `getTraceAnalysis`

### `phoneNumbers`

- `provision`
- `list`
- `get`
- `update`
- `release`
- `setForwarding`
- `clearForwarding`

### `integrations`

- `create`
- `list`
- `get`
- `update`
- `delete`
- `testEndpoint`
- `getHealthCheck`

### `analytics`

- `getDashboard`
- `getCalls`
- `getAgents`
- `getCallQuality`
- `getEmotionTrends`
- `getLatency`
- `getToolPerformance`
- `getDataQuality`
- `getUsage`
- `getAdvancedCallStats`
- `compareCallPeriods`

### `simulations`

- `createSession`
- `getSession`
- `deleteSession`
- `step`
- `recommend`
- `getIntelligence`

### `settings`

- `voice.get`
- `voice.update`
- `branding.get`
- `branding.update`
- `outreach.get`
- `outreach.update`
- `memory.get`
- `memory.update`
- `security.get`
- `security.update`
- `retention.get`
- `retention.update`
- `workflows.get`
- `workflows.update`

### `billing`

- `getDashboard`
- `getUsage`
- `getUsageTrends`
- `listInvoices`
- `getInvoice`
- `getInvoicePdf`

### `memory`

- `getEntityDimensions`
- `getEntityFacts`
- `getAnalytics`

### `personas`

- `list`
- `create`
- `get`
- `update`
- `delete`

### `reviewQueue`

- `list`
- `get`
- `getStats`
- `getDashboard`
- `getMyQueue`
- `approve`
- `reject`
- `claim`
- `unclaim`
- `correct`
- `batchApprove`
- `batchReject`
- `getHistory`
- `getTrends`
- `getPerformance`
- `getCorrectionSchema`
- `getDiff`

### `recordings`

- `getUrls`
- `getMetadata`
- `download`

### `audit`

- `list`
- `getSummary`
- `getPhiAccess`
- `createExport`
- `listExports`
- `getEntityAccessLog`

### `webhookDestinations`

- `list`
- `create`
- `get`
- `update`
- `delete`
- `listDeliveries`
- `rotateSecret`

### `safety`

- `getConfig`
- `updateConfig`
- `listTemplates`
- `getTemplate`
- `applyTemplate`

### `compliance`

- `getDashboard`
- `getHipaa`
- `getAccessReview`

### `functions`

- `list`
- `create`
- `delete`
- `test`
- `getCatalog`
- `query`
- `sync`
