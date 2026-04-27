# Changelog

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
