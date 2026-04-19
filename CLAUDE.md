# @amigo-ai/platform-sdk

Official TypeScript SDK for the Amigo Platform API.

## Architecture

Single runtime dependency: `openapi-fetch`. All types auto-generated from the platform-api OpenAPI spec.

```
platform/services/platform-api/openapi.json  (committed, CI-checked)
       ↓  scripts/gen-types.mjs (openapi-typescript)
src/generated/api.ts  (auto-generated — DO NOT EDIT)
       ↓
src/resources/*.ts  (typed resource classes using openapi-fetch client)
       ↓
src/index.ts  (AmigoClient — entry point, injects client into all resources)
```

## Key Patterns

- **openapi-fetch client** with middleware chain: auth → error → retry
- **Auto-generated types** from `openapi-typescript` — never hand-write API types
- **Resource classes** extend `WorkspaceScopedResource`, receive injected `PlatformFetch` client
- **Branded types** for ID safety (`WorkspaceId`, `AgentId`, etc.) — zero runtime cost
- **Error hierarchy**: `AmigoError` base → status-specific subclasses (401→AuthenticationError, etc.)
- **Exponential backoff + jitter** — GET retries on 5xx/408/429, POST only on 429 with Retry-After
- **Custom fetch support** — `new AmigoClient({ fetch: customFetch })` for BFF proxy patterns
- **Dual ESM/CJS** — esbuild bundles, tsc emits declarations only

## Codegen

Types are generated from the committed OpenAPI spec in `amigo-ai/platform`:

```bash
npm run gen-types                                      # auto-detect local spec
npm run gen-types -- --spec path/to/openapi.json       # explicit file
npm run gen-types -- --url https://api.platform.amigo.ai/v1/openapi.json  # live API
```

The script patches FastAPI's spec to add missing path parameters (`workspace_id`, `agent_id`, etc.) that FastAPI declares via `Depends()` instead of standard OpenAPI path parameters.

After any `openapi.json` change in `amigo-ai/platform`, run `npm run gen-types` to regenerate. The script auto-detects the local spec at `../platform/services/platform-api/openapi.json`.

## Breaking Changes

Response field removal, rename, or type change breaks this SDK and all consumers. Never publish a version with TypeScript errors in developer-console. Coordinate with `amigo-ai/platform` (spec change) and `amigo-ai/developer-console` (Zod schema + UI updates) before releasing a version with breaking type changes.

## Testing

- **Unit tests**: MSW (Mock Service Worker) for HTTP mocking, Vitest
- **Dist tests**: verify built artifacts import correctly
- **Integration tests**: real API calls (requires credentials)
- **Coverage thresholds**: 85% lines, 80% branches

```bash
npm test             # unit tests
npm run test:dist    # built artifact tests
npm run test:all     # everything
```

## Adding a New Resource

0. Ensure the platform-api endpoint exists and `openapi.json` has been regenerated. If the path is missing from generated types, the backend hasn't added it yet
1. Check the generated types: `grep 'your-endpoint' src/generated/api.ts`
2. Create `src/resources/your-resource.ts` extending `WorkspaceScopedResource`
3. Use `this.client.GET/POST/PUT/DELETE` with typed path strings from generated types
4. Use `extractData(await this.client.METHOD(...))` for data-returning calls
5. Register in `src/index.ts` constructor
6. Add tests in `tests/resources/your-resource.test.ts`
7. Export types from `src/index.ts`

## Build

```bash
npm run build    # gen-types → esbuild (ESM+CJS) → tsc (declarations)
npm run lint     # eslint --max-warnings 0
npm run typecheck  # tsc --noEmit
```
