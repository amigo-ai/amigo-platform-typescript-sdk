# Changelog

## [0.28.0] - 2026-05-03

### ⚠️ Breaking changes

- **Removed `client.workspaces.createSelfService()`** — the underlying route `POST /v1/workspaces/self-service` was deleted in platform-api PR #2472. Migrate to **`client.me.createWorkspace(body)`** which calls the new `POST /v1/me/workspaces` endpoint. Request body and response shape are unchanged; only the URL moved.

  Why: the legacy URL nested an account-scoped operation under `/v1/workspaces/<x>` — the developer-console BFF proxy parsed the literal `self-service` as a workspace_id and sent identity a JWT-refresh request scoped to that string, which 4xx'd before the call ever reached platform-api. Lifting the route to `/v1/me/...` (already in the BFF's global-segment allowlist) makes the failure mode structurally impossible. A platform-api hygiene test now blocks any future literal segment under `/v1/workspaces/`.

  Datadog confirmed zero successful traffic on the legacy route in the 7 days before removal — no production callers exist.

### Features

- **`client.me`** — new `MeResource` for account-scoped operations on the authenticated identity. Initial method: `createWorkspace(body)` (replaces `client.workspaces.createSelfService`).

### Maintenance

- sync API types from platform (`edac384e3`) — `/v1/me/workspaces` (POST, op `create-my-workspace`, tag `Account`) added; `/v1/workspaces/self-service` removed.

### Schema changes (call-intelligence response shapes)

Picked up from platform-api PR 3b of the call-intelligence typed-cols program (commit `831f0e8ff`, "V091 Pydantic response alignment to producer keys"). The historical Pydantic shapes declared fields the producer never actually emitted — they were silently dropped by `extra="ignore"` and SDK consumers always saw `None` / `0` / `[]` for these fields. The renames + drops align the response shape to producer truth.

Removed fields (the SDK type for these no longer compiles; consumers reading them get `undefined` at runtime today regardless):

- `EmotionSummary.avg_valence` → use **`average_valence`**
- `EmotionSummary.caller_distress_detected` (removed; never populated)
- `EmotionSummary.emotion_shifts` (removed; never populated)
- `RiskSummary.flags` (removed; never populated)
- `SafetySummary.categories` (removed; never populated)
- `ConversationSummary.topic_changes` (removed; never populated)
- `ConversationSummary.avg_turn_duration_seconds` (removed; never populated)
- `LatencySummary.total_silence_seconds` (removed; never populated)
- `OperatorIntelligenceSummary.operator_handle_time_seconds` (removed; never populated)

If your code references any of the above, replace with the renamed field where applicable; for the removed fields, either drop the read or compute the value yourself from the underlying call data.

Type-bound additions to existing fields (non-breaking; tightening `string` schemas to `PhoneE164` / bounded-length strings):

- `phone_number` fields now refer to `PhoneE164` instead of bare `string`.
- Multiple `string` fields gained `maxLength` / `minLength` constraints (e.g. `email_id`, `entity_types`, `sync_schedule`, `skills` items). Existing valid inputs continue to compile; the SDK now rejects strings that exceed the documented bounds at type-check time.

## [0.27.0] - 2026-05-03

### Security

- close dev-console gaps with 16 typed resources + spec-sync rolling PR (#155)

### Documentation

- document realtime event streams (subscribeToWorkspace, observers, ReconnectingWebSocket) (#156)

## [0.26.0] - 2026-05-02

### Maintenance

- sync API types from platform (dc8c9ee1) (#154)

## [0.25.0] - 2026-05-01

### Features

- **Typed error bodies** — `AmigoError` now carries a discriminated `errorBody` (`HttpExceptionBody | HttpValidationErrorBody | UnparseableErrorBody`) plus a verbatim `rawBody` (truncated to 8 KB). New body type guards — `isHttpException`, `isHttpValidationError`, `isUnparseableErrorBody` — let consumers narrow the union without `any`/`unknown` casts. Status-class type guards added: `isPermissionError`, `isConflictError`, `isValidationError`, `isServerError`, `isNetworkError`. Backward compat preserved: existing `err.message` / `err.detail` / `err.errorCode` / `err.requestId` and the legacy `ParseError.body: string` still work unchanged.
- **`createApiError` parse-failure handling hardened** — body reads no longer throw on malformed JSON, empty bodies, or connection-drop mid-read. The factory always returns an `AmigoError` subclass; the unparseable fallback puts the verbatim text on `errorBody.raw_body` for diagnostics.
- **`client.defineRoute(method, path)` path helper** — captures a path literal at definition time, returning a fully-typed callable that survives reassignment, export, and composition across modules. Solves the CLAUDE.md "explicit `as const` on path params" footgun by making the literal-path constraint structural at the call site, with full request/response inference. Workspace IDs continue to be auto-injected; runtime behavior is identical to calling the matching `client.GET/POST/PUT/...` directly.

## [0.24.0] - 2026-05-01

### Features

- Add `client.events.subscribeToWorkspace()` — typed SSE consumer for `WorkspaceSSEEvent`. Wraps `GET /v1/{workspace_id}/events/stream` with automatic reconnect (exponential backoff with full jitter, honoring server-sent `retry:` directives), gapless replay via `Last-Event-ID`, and discriminated-union dispatch (no `any`/`unknown` casts at the consumer). Honors `AbortSignal` for cleanup. Drift-tolerant: malformed or unknown frames are dropped silently. Observer WebSocket helper deferred — see follow-up issue.

## [0.23.0] - 2026-05-01

### Improvements

- Add streamTurn async iterator (typed TurnStreamEvent stream) (#144)

## [0.22.0] - 2026-05-01

### Improvements

- Add includeToolCalls option to ConversationsResource.createTurn (#143)

## [0.21.0] - 2026-05-01

### Features

- add sessionConnectUrl helper for /v1/{ws}/sessions/connect (v0.20.0)

### Maintenance

- sync API types from platform (2c9cf6d9) (#142)
- sync API types from platform (74bd55d2) (#141)

## [0.19.0] - 2026-05-01

### Features

- add TurnStreamEvent types + createTurnStream (v0.18.0) (#140)

## [0.17.2] - 2026-04-29

### Features

- add agentBaseUrl for split-host WebSocket connections

### Bug Fixes

- add clxxa to CODEOWNERS (#124)

### Documentation

- regenerate api.md for agentBaseUrl

## [0.17.1] - 2026-04-29

### Features

- sync API types from platform — add TurnResponse.tool_calls

### Bug Fixes

- clean up text-chat-app proxy and frontend
- make text-chat example interactive instead of one-shot
- use token query param auth (not dual), respect AMIGO_BASE_URL

## [0.17.0] - 2026-04-28

### Features

- add toolEvents SDK param and text-chat reference app
- add text chat reference example and guide (#123)

### Bug Fixes

- add @types/ws dev dependency for example typechecking

## [0.16.0] - 2026-04-28

### Features

- sync API types from platform 90bb35099

### Documentation

- add device code authentication docs and example (#121)

## [0.15.1] - 2026-04-28

### Bug Fixes

- address PR #118 review feedback
- correct device code default identity URL to api.platform.amigo.ai (#119)

## [0.15.0] - 2026-04-28

### Maintenance

- sync API types from platform d42476352

## [0.14.0] - 2026-04-28

### Features

- add text conversation resource (#115)

## [0.13.0] - 2026-04-28

### Maintenance

- sync API types from platform ac4311cb

## [0.12.0] - 2026-04-28

### Maintenance

- sync API types from platform d8a47d66

## [0.11.3] - 2026-04-28

### Maintenance

- No public SDK changes were recorded in this release.

## [0.11.2] - 2026-04-28

### Maintenance

- No public SDK changes were recorded in this release.

## [0.11.1] - 2026-04-28

### Bug Fixes

- handle bootstrap token with workspaceId + add /self/profile path
- handle bootstrap token in device code flow

## [0.11.0] - 2026-04-28

### Features

- device code login for desktop and CLI apps (#112)

## [0.10.0] - 2026-04-27

### Bug Fixes

- harden release test workflow lookup

### Maintenance

- sync API types from platform (d02115a1)

## [0.9.3] - 2026-04-27

### Features

- publish scribe clinical settings in sdk (#99)

### Improvements

- Sync platform API types

## [0.9.1] - 2026-04-27

### Improvements

- Add typed `client.calls.getTimeline(callId)` for the canonical call playback timeline endpoint.

## [0.9.0] - 2026-04-27

### Maintenance

- sync API types from platform call timeline

## [0.8.0] - 2026-04-27

### Improvements

- Expose call timeline actor types (#89)

## [0.7.0] - 2026-04-26

### Improvements

- Add metrics resource (#85)
- Harden release publish visibility check (#84)

## Unreleased

### Breaking Changes

- Metric values now use the exported `MetricValue` discriminated union
  (`numerical`, `categorical`, or `boolean`) generated from the platform
  OpenAPI schema. The previous generated `MetricValueResponse` schema has been
  replaced by value-type-specific schemas. A deprecated top-level
  `MetricValueResponse` compatibility alias remains available from the SDK
  entrypoint.

```ts
if (metric.metric_type === 'numerical') {
  const value: number | null = metric.value
}
```

### Features

- Add `client.metrics` for metric catalogs, latest values, metric history, and
  metric trends.

## [0.6.1] - 2026-04-26

### Improvements

- harden SDK packaging and release automation (#82)

## [0.6.0] - 2026-04-26

### Bug Fixes

- update test fixture for call_duration_seconds rename

### Maintenance

- sync API types from platform (54356672)

## [0.5.10] - 2026-04-25

### Maintenance

- sync API types from platform (f799a6ce) (#73)

## [0.5.9] - 2026-04-25

### Maintenance

- sync API types from platform (6c4d5d8f) (#70)

## [0.5.8] - 2026-04-25

### Maintenance

- sync API types from platform (20f0d9db) (#68)

## [0.5.6] - 2026-04-25

### Maintenance

- sync API types from platform (009bf9cd) (#66)

## [0.5.5] - 2026-04-24

### Maintenance

- sync API types from platform (81ea5e71) (#65)

## [0.5.4] - 2026-04-24

### Maintenance

- sync API types from platform (fb8530c8) (#59)
- sync API types from platform — webhook hardening (PR #1852) (#56)

## [0.5.3] - 2026-04-24

### Features

- add provision, checkEnvironment, convertEnvironment methods (#54)

### Documentation

- add build-a-form and build-a-scribe developer guides

## [0.5.2] - 2026-04-23

### Bug Fixes

- expose api field type for path-level inference in GET/POST/PUT

### Documentation

- regenerate api.md after exposing api field

## [0.5.1] - 2026-04-23

### Maintenance

- sync openapi spec from platform (356 paths, 617 schemas)

## [0.5.0] - 2026-04-22

### Features

- add triggerSync resource method (#45)

### Bug Fixes

- prefix tarball path with ./ so npm treats it as a file, not a package name (#37)
- write .npmrc explicitly for npm publish (setup-node breaks tarball resolution) (#36)
- drop --provenance from npm publish (causes git ls-remote on tarball) (#35)

### Maintenance

- sync API types from platform (04db1b94) (#44)
- sync API types — intake upload links (#38)
- sync API types — dashboard definitions endpoints (#34)

## [0.4.5] - 2026-04-19

### Bug Fixes

- restore README platform svg (#17)

## [0.4.4] - 2026-04-19

### Features

- refresh README platform context and release hardening (#16)

### Security

- Polish the public repo surface and close security findings

### Improvements

- Stabilize Node 18 retry handling and refine the README platform graphic (#15)

### Maintenance

- Refresh generated SDK types from the committed Platform API spec

This changelog tracks notable user-facing changes to the published SDK. Entries stay focused on package behavior, developer experience, and release hardening rather than internal branch noise.

## [0.4.3] - 2026-04-19

### Improvements

- Extend request overrides across the ergonomic resource surface with `withOptions(...)`
- Preserve required non-workspace path parameters in low-level request helpers
- Generate and validate `api.md` in CI
- Validate Node 18, 20, and 22 along with packed tarball installs

## [0.4.2] - 2026-04-19

### Features

- Add advanced request controls, typed low-level HTTP helpers, and response metadata
- Document the advanced surface with repo-local examples and an API surface guide

## [0.4.1] - 2026-04-19

### Improvements

- Add repo-local examples and validate them in CI
- Add ESM and CommonJS dist validation before release
- Align README examples with the shipped client surface

## [0.4.0] - 2026-04-19

### Security

- Harden release automation, spec sync, and package verification for published builds

## [0.3.0] - 2026-04-19

### Improvements

- Add public repo governance and contributor standards
- Add coverage reporting and tighten repo QA checks
- Refresh README presentation and align terminology with the shipped actions surface

### Maintenance

- Stabilize local toolchain defaults and native dependency resolution

## [0.2.1] - 2026-04-19

### Features

- Expand customer-facing resource coverage and align types to the validated Platform API surface
- Rebuild the client on generated OpenAPI types with typed request middleware and custom fetch support
- Add structured error context, serialization helpers, and webhook verification utilities
- Mature the release process with spec sync, changelog generation, and integration test scaffolding

### Bug Fixes

- Align resources, request signatures, and generated types with the validated API surface
- Fix workflow reuse and publish configuration edge cases discovered during release automation

### Documentation

- Expand README coverage for the public resource surface and BFF proxy configuration

### Maintenance

- Tighten package metadata, generated types, and release packaging
