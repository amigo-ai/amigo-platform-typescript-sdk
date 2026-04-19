# Changelog

## [0.4.1] - 2026-04-19

### Features

- harden package verification and examples (#2)

## [0.4.0] - 2026-04-19

### Features

- harden sdk release and verification surface (#1)

## [0.3.0] - 2026-04-19

### Features

- add coverage reporting, fix README badges, rebrand skills to actions in docs
- Claude on Vertex AI code review — matches platform repo pattern
- supreme grade repo — CONTRIBUTING, SECURITY, CODE_OF_CONDUCT, PR review, CODEOWNERS

### Chores

- fix vitest/rollup native bindings, add .nvmrc + .npmrc, coverage reporting

## [0.2.1] - 2026-04-19

### Features

- mature release process — OIDC publish, auto-changelog, spec-sync, integration tests
- supreme grade SDK — tightened types, actions rebrand, maturity features
- v0.2.0 — 94 tests, 24 resources, supreme-grade type safety
- add error context sanitization, toJSON, and captureStackTrace
- add 10 resource classes + regenerate types from tightened spec
- rebuild SDK with openapi-fetch + codegen from committed spec
- strip internal resources, add Agent Memory
- add 10 customer-facing resources

### Bug Fixes

- use NPM_TOKEN for publish (OIDC Trusted Publisher requires package-level config)
- remove environment constraint for OIDC publish (npm trusted publisher may not require it)
- add workflow_call trigger to test.yml for reusable workflow
- reconcile all types against real API (validated with live workspace)
- align types and signatures with dev-console reality
- align resources with dev-console API client

### Documentation

- add all 24 resources to README + BFF proxy section

### Chores

- switch npm publish to OIDC Trusted Publisher (no token needed)
- regenerate types — AgentVersionResponse defaults + E.164 validation
- regenerate types from tightened platform-api spec
- publish prep — LICENSE, clean README, clean build script
