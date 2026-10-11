# Probitas Packages

Monorepo for Probitas scenario-based testing framework and client libraries.

## Quick Reference

- **Runtime**: Bun 1.4+ (pinned in `flake.nix`)
- **Registries**: npm (`@probitas-test/*`) and JSR (`@probitas/*`)
- **Framework Entry Point**: `@probitas-test/probitas` (user-facing API)
- **Client Packages**: `@probitas-test/client-*` (HTTP, gRPC, SQL, etc.)

## Repository Structure

This monorepo combines:

- **Framework Packages**: Builder, Runner, Reporter, Core, Discover, Expect,
  etc.
- **Client Libraries**: HTTP, gRPC, SQL (PostgreSQL, MySQL), Redis, MongoDB,
  etc.

Note: `@probitas-test/probitas` (Entrypoint, CLI) is maintained separately.

## Commands

```bash
bun run verify        # Run format check, lint, type check and tests (USE THIS)
bun run test          # Run tests only
bun run fmt           # Format with dprint
```
