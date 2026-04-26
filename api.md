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
- `listAutoPaging`
- `get`
- `update`
- `archive`
- `provision`
- `checkEnvironment`
- `convertEnvironment`

### `apiKeys`

- `me`
- `create`
- `list`
- `listAutoPaging`
- `revoke`
- `rotate`

### `agents`

- `create`
- `list`
- `listAutoPaging`
- `get`
- `update`
- `delete`
- `listVersions`
- `listVersionsAutoPaging`
- `getVersion`
- `createVersion`

### `skills`

- `create`
- `list`
- `listAutoPaging`
- `get`
- `update`
- `delete`
- `test`

### `actions`

- `create`
- `list`
- `listAutoPaging`
- `get`
- `update`
- `delete`
- `getReferences`
- `test`

### `operators`

- `list`
- `listAutoPaging`
- `create`
- `get`
- `update`
- `getDashboard`
- `getQueue`
- `getEscalations`
- `getEscalationsAutoPaging`
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
- `getAuditLogAutoPaging`

### `triggers`

- `list`
- `listAutoPaging`
- `create`
- `get`
- `update`
- `delete`
- `fire`
- `pause`
- `resume`
- `listRuns`
- `listRunsAutoPaging`

### `services`

- `create`
- `list`
- `listAutoPaging`
- `get`
- `update`
- `delete`

### `contextGraphs`

- `create`
- `list`
- `listAutoPaging`
- `get`
- `update`
- `delete`
- `createVersion`
- `listVersions`
- `listVersionsAutoPaging`
- `getVersion`

### `dataSources`

- `create`
- `list`
- `listAutoPaging`
- `get`
- `update`
- `delete`
- `getStatus`
- `getSyncHistory`
- `triggerSync`

### `world`

- `listEntities`
- `listEntitiesAutoPaging`
- `getEntity`
- `getRelationships`
- `getGraph`
- `getProvenance`
- `getLineage`
- `getMerged`
- `getConnectors`
- `getConnectorEntities`
- `getConnectorResources`
- `listEntityTypes`
- `listDuplicates`
- `search`
- `getTimeline`
- `getTimelineAutoPaging`
- `getSyncStatusBySink`
- `listSyncEvents`
- `listSyncEventsAutoPaging`
- `getSyncQueueDepth`
- `retrySyncEvent`
- `retryAllSyncEvents`
- `getStats`
- `getSourceBreakdown`

### `calls`

- `list`
- `listAutoPaging`
- `get`
- `getIntelligence`
- `getActiveIntelligence`
- `getBenchmarks`
- `getPhoneVolume`
- `getTraceAnalysis`

### `phoneNumbers`

- `provision`
- `list`
- `listAutoPaging`
- `get`
- `update`
- `release`
- `setForwarding`
- `clearForwarding`

### `integrations`

- `create`
- `list`
- `listAutoPaging`
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
- `getEventBreakdown`
- `getSafetyTrends`
- `getOperatorPerformance`
- `getAdvancedCallStats`
- `compareCallPeriods`

### `simulations`

- `createSession`
- `getSession`
- `deleteSession`
- `step`
- `recommend`
- `getIntelligence`

### `metrics`

- `listLatest`
- `getCatalog`
- `getValues`
- `getTrend`

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
- `behaviors.get`
- `behaviors.update`
- `gapScanner.get`
- `gapScanner.update`
- `scribe.get`
- `scribe.update`
- `metrics.get`
- `metrics.update`
- `environments.get`
- `environments.update`
- `workflows.get`
- `workflows.update`

### `billing`

- `getDashboard`
- `getUsage`
- `getUsageTrends`
- `listInvoices`
- `listInvoicesAutoPaging`
- `getInvoice`
- `getInvoicePdf`

### `memory`

- `getEntityDimensions`
- `getEntityFacts`
- `getAnalytics`

### `personas`

- `list`
- `listAutoPaging`
- `create`
- `get`
- `update`
- `delete`

### `reviewQueue`

- `list`
- `listAutoPaging`
- `get`
- `getStats`
- `getDashboard`
- `getMyQueue`
- `getMyQueueAutoPaging`
- `approve`
- `reject`
- `claim`
- `unclaim`
- `correct`
- `batchApprove`
- `batchReject`
- `getHistory`
- `getHistoryAutoPaging`
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
- `listAutoPaging`
- `getSummary`
- `getPhiAccess`
- `getPhiAccessAutoPaging`
- `createExport`
- `listExports`
- `getEntityAccessLog`
- `getEntityAccessLogAutoPaging`

### `webhookDestinations`

- `list`
- `listAutoPaging`
- `create`
- `get`
- `update`
- `delete`
- `listDeliveries`
- `listDeliveriesAutoPaging`
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

### `api`
