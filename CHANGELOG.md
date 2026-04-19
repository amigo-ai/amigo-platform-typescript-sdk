# Changelog

This changelog tracks user-facing changes to the published SDK. Entries are curated from the mainline release history so internal branch noise and version bump commits do not leak into the public record.

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

### Improvements

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
