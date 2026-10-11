---
globs: packages/probitas-client*/**/*.ts
---

# Client Package Dependency Restriction

Client packages (`@probitas-test/client-*`) should minimize dependencies on
other Probitas packages to maintain independence.

## Allowed Dependencies

### For all client packages:

- `@probitas-test/client` - Core client types and errors

### For specific client packages only:

- `@probitas-test/client-connectrpc` - Only from `@probitas-test/client-grpc`
  package
- `@probitas-test/client-sql` - Only from `@probitas-test/client-sql-*` packages

## Forbidden Dependencies

- `@probitas-test/core` - Use vendored or local implementations instead
- `@probitas-test/builder` - This is a framework package
- `@probitas-test/runner` - This is a framework package
- `@probitas-test/expect` - This is a consumer package, not a dependency
- Any other framework `@probitas-test/*` packages

## Rationale

Client packages are foundational libraries that other Probitas packages may
depend on (e.g., `@probitas-test/expect` uses clients for assertions). Creating
reverse dependencies would cause circular dependency issues. Keeping client
packages independent also makes them more reusable outside the Probitas
ecosystem.
