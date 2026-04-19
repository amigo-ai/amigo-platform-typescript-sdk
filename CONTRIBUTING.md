# Contributing to Amigo Platform SDK

Thank you for your interest in contributing to the Amigo Platform SDK! This guide covers development setup, testing, code generation, and the release process.

## Development Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

## Package.json Scripts Overview

### Build & Development

- **`npm run build`** — Full build: generate types → esbuild (ESM+CJS) → tsc declarations
- **`npm run typecheck`** — Run TypeScript compiler in check mode (`tsc --noEmit`)
- **`npm run gen-types`** — Regenerate TypeScript types from the OpenAPI spec

### Testing

- **`npm test`** — Run unit tests (Vitest)
- **`npx vitest run`** — Run all tests including core utilities
- **`npx vitest run tests/integration/`** — Run integration tests (requires API credentials)

### Code Quality

- **`npm run lint`** — ESLint with zero warnings policy
- **`npm run format`** — Check formatting with Prettier
- **`npm run format:write`** — Auto-format with Prettier

## Testing

This project uses **Vitest** as the testing framework.

### Test Structure

```
tests/
├── core/           # Core utility tests (rate-limit, webhooks)
├── integration/    # Integration tests (require real API credentials)
└── resources/      # Per-resource unit tests
```

### Running Tests

```bash
npm test                              # Unit tests (fast)
npx vitest run                        # All tests
npx vitest run tests/integration/     # Integration tests (needs env vars)
npx vitest run --coverage             # With coverage report
```

### Writing Tests

- Place resource tests in `tests/resources/`
- Use mock fetch for unit tests (no MSW needed — see existing tests for pattern)
- Integration tests skip automatically when `AMIGO_TEST_API_KEY` is not set

## OpenAPI Type Generation

Types are auto-generated from the committed OpenAPI spec in `amigo-ai/platform`.

### How it Works

1. `scripts/gen-types.mjs` reads `openapi.json` (local or from the platform repo)
2. Patches FastAPI's spec to add missing path parameters (`workspace_id`, etc.)
3. Runs `openapi-typescript` to generate `src/generated/api.ts`
4. These types drive all SDK resource methods with full type safety

### Regenerating Types

```bash
npm run gen-types                                      # auto-detect local spec
npm run gen-types -- --spec path/to/openapi.json       # explicit file
```

**Never manually edit** files in `src/generated/` — they will be overwritten.

## Project Structure

```
src/
├── core/           # Auth, errors, retry, rate-limit, webhooks, branded types
├── generated/      # Auto-generated OpenAPI types (DO NOT EDIT)
├── resources/      # API resource classes (one per domain)
└── index.ts        # AmigoClient entry point, public exports

tests/
├── core/           # Core utility tests
├── integration/    # Integration tests (require credentials)
└── resources/      # Per-resource unit tests

scripts/
├── gen-types.mjs         # OpenAPI → TypeScript codegen
├── build.mjs             # esbuild bundler (ESM + CJS)
└── generate-changelog.sh # Conventional commit changelog generator
```

## Development Workflow

1. **Start**: `npm install`
2. **Write code**: Edit `src/resources/` or `src/core/`
3. **Write tests**: Add tests in `tests/`
4. **Validate**: `npm run lint && npm run typecheck && npm test && npm run build`
5. **Submit PR**: See Pull Request Guidelines below

## Adding a New Resource

1. Ensure the platform-api endpoint exists and `openapi.json` has been regenerated
2. Check the generated types: `grep 'your-endpoint' src/generated/api.ts`
3. Create `src/resources/your-resource.ts` extending `WorkspaceScopedResource`
4. Use `this.client.GET/POST/PUT/DELETE` with typed path strings
5. Use `extractData(await this.client.METHOD(...))` for data-returning calls
6. Register in `src/index.ts` constructor
7. Add tests in `tests/resources/your-resource.test.ts`
8. Export types from `src/index.ts`

## Pull Request Guidelines

1. Ensure all tests pass: `npm test`
2. Lint your code: `npm run lint`
3. Typecheck passes: `npm run typecheck`
4. Build succeeds: `npm run build`
5. Add tests for new functionality
6. Update README if adding new resources or features

## Release Process

Releases are handled via GitHub Actions (`release.yml`):

1. Reuses the test workflow to validate the build
2. Regenerates types from the committed OpenAPI spec
3. Bumps the version (patch/minor/major)
4. Builds and packs the package
5. Publishes to npm with provenance attestation
6. Generates CHANGELOG.md entries from conventional commits
7. Creates a Git tag and GitHub Release with release notes
8. Uploads build artifacts (tarball + dist/)

### Triggering a Release

Go to **Actions → Release → Run workflow**, select the version type, and run.

### Auto-Release (Spec Sync)

When the platform API spec changes on `main`, the `spec-sync.yml` workflow:
1. Detects spec differences
2. Opens a PR with regenerated types
3. Optionally auto-releases a minor version

### Required Repository Secrets

- `NPM_TOKEN` — npm automation token for publishing
- `CODECOV_TOKEN` — Codecov upload token (optional)
- `AMIGO_TEST_API_KEY` — API key for integration tests
- `AMIGO_TEST_WORKSPACE_ID` — Workspace ID for integration tests
