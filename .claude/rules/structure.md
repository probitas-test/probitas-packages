---
paths: "packages/**/*, deno.jsonc"
---

# Package Structure

Workspace organization and dependency management for Probitas monorepo.

## Directory Layout

```
probitas-packages/
├── deno.jsonc                    # Root workspace config
├── packages/
│   ├── probitas/                 # @probitas/probitas - Primary library (user-facing API)
│   ├── probitas-builder/         # @probitas/builder - Type-safe scenario definition
│   ├── probitas-runner/          # @probitas/runner - Scenario execution engine
│   ├── probitas-reporter/        # @probitas/reporter - Output formatters
│   ├── probitas-core/            # @probitas/core - Scenario loading/filtering
│   ├── probitas-discover/        # @probitas/discover - File discovery
│   ├── probitas-expect/          # @probitas/expect - Expectation library
│   ├── probitas-client/          # @probitas/client - Core client library
│   ├── probitas-client-http/     # @probitas/client-http - HTTP client
│   ├── probitas-client-grpc/     # @probitas/client-grpc - gRPC client
│   ├── probitas-client-sql/      # @probitas/client-sql - SQL client base
│   ├── probitas-client-sql-postgres/
│   ├── probitas-client-sql-mysql/
│   └── ... (redis, mongodb, rabbitmq, sqs, etc.)
└── probitas/                     # Example scenarios
```

Note: The CLI is maintained in a
[separate repository](https://github.com/jsr-probitas/cli).

## Package Hierarchy

### Framework Packages

```mermaid
graph TD
    probitas[probitas] --> builder[probitas-builder]
    probitas --> runner[probitas-runner]
    probitas --> expect[probitas-expect]
    runner --> builder
    core[probitas-core] --> builder
    reporter[probitas-reporter] --> runner
```

### Client Packages

```mermaid
graph TD
    client-http[probitas-client-http] --> client[probitas-client]
    client-grpc[probitas-client-grpc] --> client
    client-sql-postgres[probitas-client-sql-postgres] --> client-sql[probitas-client-sql]
    client-sql-mysql[probitas-client-sql-mysql] --> client-sql
    client-sql --> client
    client-redis[probitas-client-redis] --> client
```

## Dependency Management

- **Workspace-level dependencies**: All dependencies are managed in the
  workspace root `deno.jsonc`. Individual package `deno.json` files should not
  contain `imports` or `scopes`.
- **JSR protocol for internal deps**: Use `jsr:@probitas/xxx@^0` for
  inter-package dependencies (workspace root provides path overrides for
  development)
- Root `deno.jsonc` contains: workspace definition, all project dependencies,
  shared dev dependencies (testing), and local path overrides for development.
