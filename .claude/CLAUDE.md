# Probitas Packages

Monorepo for Probitas scenario-based testing framework and client libraries.

## Quick Reference

- **Runtime**: Deno 2.x
- **Registry**: JSR (`@probitas/*`)
- **Framework Entry Point**: `@probitas/probitas` (user-facing API)
- **Client Packages**: `@probitas/client-*` (HTTP, gRPC, SQL, etc.)
- **Example Scenarios**: `probitas/*.probitas.ts`

## Repository Structure

This monorepo combines:

- **Framework Packages**: Builder, Runner, Reporter, Core, Discover, Expect,
  etc.
- **Client Libraries**: HTTP, gRPC, SQL (PostgreSQL, MySQL), Redis, MongoDB,
  etc.

Note: `@probitas/probitas` (Entrypoint, CLI) is maintained separately.

## Commands

```bash
deno task verify      # Run format, lint, type check and tests (USE THIS)
deno task test        # Run tests only
deno task probitas    # Run the CLI (e.g., deno task probitas run)
```
