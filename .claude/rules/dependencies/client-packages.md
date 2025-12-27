---
globs: packages/probitas-client*/**/*.ts
---

# Client Package Dependency Restriction

Client packages (`@probitas/client-*`) should minimize dependencies on other
Probitas packages to maintain independence.

## Allowed Dependencies

### For all client packages:

- `@probitas/client` - Core client types and errors

### For specific client packages only:

- `@probitas/client-connectrpc` - Only from `@probitas/client-grpc` package
- `@probitas/client-sql` - Only from `@probitas/client-sql-*` packages

## Forbidden Dependencies

- `@probitas/core` - Use vendored or local implementations instead
- `@probitas/builder` - This is a framework package
- `@probitas/runner` - This is a framework package
- `@probitas/expect` - This is a consumer package, not a dependency
- Any other framework `@probitas/*` packages

## Rationale

Client packages are foundational libraries that other Probitas packages may
depend on (e.g., `@probitas/expect` uses clients for assertions). Creating
reverse dependencies would cause circular dependency issues. Keeping client
packages independent also makes them more reusable outside the Probitas
ecosystem.
