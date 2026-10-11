# Probitas Packages

[![Test](https://github.com/probitas-test/probitas-packages/actions/workflows/test.yml/badge.svg)](https://github.com/probitas-test/probitas-packages/actions/workflows/test.yml)
[![codecov](https://codecov.io/gh/probitas-test/probitas-packages/graph/badge.svg?token=AwnSng0JAT)](https://codecov.io/gh/probitas-test/probitas-packages)

Monorepo containing core framework packages and client libraries for the
Probitas scenario-based testing framework.

This repository combines both the framework implementation (builder, runner,
reporter, etc.) and multi-protocol client libraries (HTTP, gRPC, SQL, Redis,
etc.) under a unified workspace for streamlined development and testing.

## Highlights

- **Framework Packages**: Type-safe scenario builder, execution engine,
  reporters, and expectation library
- **Multi-Protocol Clients**: HTTP, ConnectRPC/gRPC/gRPC-Web, GraphQL, SQL
  (Postgres/MySQL/SQLite/DuckDB), MongoDB, Redis, RabbitMQ, and SQS
- **Shared Error Model**: Consistent `ClientError` hierarchy across all clients
  for uniform error handling
- **Resource Management**: AsyncDisposable-aware clients for automatic cleanup
  in scenarios
- **Built for Bun**: Published on npm under `@probitas-test/*`, with a JSR
  mirror under `@probitas/*`

## Packages

### Framework Packages

| Package                                                 | npm                                                                                                                   | JSR                                                                                   | Description                       |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | --------------------------------- |
| [@probitas-test/builder](./packages/probitas-builder)   | [![npm](https://img.shields.io/npm/v/@probitas-test/builder)](https://www.npmjs.com/package/@probitas-test/builder)   | [![JSR](https://jsr.io/badges/@probitas/builder)](https://jsr.io/@probitas/builder)   | Type-safe scenario definition API |
| [@probitas-test/runner](./packages/probitas-runner)     | [![npm](https://img.shields.io/npm/v/@probitas-test/runner)](https://www.npmjs.com/package/@probitas-test/runner)     | [![JSR](https://jsr.io/badges/@probitas/runner)](https://jsr.io/@probitas/runner)     | Scenario execution engine         |
| [@probitas-test/reporter](./packages/probitas-reporter) | [![npm](https://img.shields.io/npm/v/@probitas-test/reporter)](https://www.npmjs.com/package/@probitas-test/reporter) | [![JSR](https://jsr.io/badges/@probitas/reporter)](https://jsr.io/@probitas/reporter) | Output formatters (List, JSON)    |
| [@probitas-test/core](./packages/probitas-core)         | [![npm](https://img.shields.io/npm/v/@probitas-test/core)](https://www.npmjs.com/package/@probitas-test/core)         | [![JSR](https://jsr.io/badges/@probitas/core)](https://jsr.io/@probitas/core)         | Scenario loading and filtering    |
| [@probitas-test/discover](./packages/probitas-discover) | [![npm](https://img.shields.io/npm/v/@probitas-test/discover)](https://www.npmjs.com/package/@probitas-test/discover) | [![JSR](https://jsr.io/badges/@probitas/discover)](https://jsr.io/@probitas/discover) | File discovery with glob patterns |
| [@probitas-test/expect](./packages/probitas-expect)     | [![npm](https://img.shields.io/npm/v/@probitas-test/expect)](https://www.npmjs.com/package/@probitas-test/expect)     | [![JSR](https://jsr.io/badges/@probitas/expect)](https://jsr.io/@probitas/expect)     | Expectation library               |

### Client Packages

| Package                                                                       | npm                                                                                                                                         | JSR                                                                                                         | Description                                                        |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| [@probitas-test/client](./packages/probitas-client)                           | [![npm](https://img.shields.io/npm/v/@probitas-test/client)](https://www.npmjs.com/package/@probitas-test/client)                           | [![JSR](https://jsr.io/badges/@probitas/client)](https://jsr.io/@probitas/client)                           | Core options and error base types shared by all clients            |
| [@probitas-test/client-http](./packages/probitas-client-http)                 | [![npm](https://img.shields.io/npm/v/@probitas-test/client-http)](https://www.npmjs.com/package/@probitas-test/client-http)                 | [![JSR](https://jsr.io/badges/@probitas/client-http)](https://jsr.io/@probitas/client-http)                 | HTTP client with buffered responses and cookie support             |
| [@probitas-test/client-connectrpc](./packages/probitas-client-connectrpc)     | [![npm](https://img.shields.io/npm/v/@probitas-test/client-connectrpc)](https://www.npmjs.com/package/@probitas-test/client-connectrpc)     | [![JSR](https://jsr.io/badges/@probitas/client-connectrpc)](https://jsr.io/@probitas/client-connectrpc)     | ConnectRPC client supporting Connect, gRPC, and gRPC-Web protocols |
| [@probitas-test/client-grpc](./packages/probitas-client-grpc)                 | [![npm](https://img.shields.io/npm/v/@probitas-test/client-grpc)](https://www.npmjs.com/package/@probitas-test/client-grpc)                 | [![JSR](https://jsr.io/badges/@probitas/client-grpc)](https://jsr.io/@probitas/client-grpc)                 | gRPC client (thin wrapper over client-connectrpc)                  |
| [@probitas-test/client-graphql](./packages/probitas-client-graphql)           | [![npm](https://img.shields.io/npm/v/@probitas-test/client-graphql)](https://www.npmjs.com/package/@probitas-test/client-graphql)           | [![JSR](https://jsr.io/badges/@probitas/client-graphql)](https://jsr.io/@probitas/client-graphql)           | GraphQL client with data/error helpers                             |
| [@probitas-test/client-sql](./packages/probitas-client-sql)                   | [![npm](https://img.shields.io/npm/v/@probitas-test/client-sql)](https://www.npmjs.com/package/@probitas-test/client-sql)                   | [![JSR](https://jsr.io/badges/@probitas/client-sql)](https://jsr.io/@probitas/client-sql)                   | Shared SQL result/transaction types                                |
| [@probitas-test/client-sql-postgres](./packages/probitas-client-sql-postgres) | [![npm](https://img.shields.io/npm/v/@probitas-test/client-sql-postgres)](https://www.npmjs.com/package/@probitas-test/client-sql-postgres) | [![JSR](https://jsr.io/badges/@probitas/client-sql-postgres)](https://jsr.io/@probitas/client-sql-postgres) | PostgreSQL client built on the shared SQL types                    |
| [@probitas-test/client-sql-mysql](./packages/probitas-client-sql-mysql)       | [![npm](https://img.shields.io/npm/v/@probitas-test/client-sql-mysql)](https://www.npmjs.com/package/@probitas-test/client-sql-mysql)       | [![JSR](https://jsr.io/badges/@probitas/client-sql-mysql)](https://jsr.io/@probitas/client-sql-mysql)       | MySQL client built on the shared SQL types                         |
| [@probitas-test/client-sql-sqlite](./packages/probitas-client-sql-sqlite)     | [![npm](https://img.shields.io/npm/v/@probitas-test/client-sql-sqlite)](https://www.npmjs.com/package/@probitas-test/client-sql-sqlite)     | [![JSR](https://jsr.io/badges/@probitas/client-sql-sqlite)](https://jsr.io/@probitas/client-sql-sqlite)     | SQLite client built on the shared SQL types                        |
| [@probitas-test/client-sql-duckdb](./packages/probitas-client-sql-duckdb)     | [![npm](https://img.shields.io/npm/v/@probitas-test/client-sql-duckdb)](https://www.npmjs.com/package/@probitas-test/client-sql-duckdb)     | [![JSR](https://jsr.io/badges/@probitas/client-sql-duckdb)](https://jsr.io/@probitas/client-sql-duckdb)     | DuckDB client built on the shared SQL types                        |
| [@probitas-test/client-mongodb](./packages/probitas-client-mongodb)           | [![npm](https://img.shields.io/npm/v/@probitas-test/client-mongodb)](https://www.npmjs.com/package/@probitas-test/client-mongodb)           | [![JSR](https://jsr.io/badges/@probitas/client-mongodb)](https://jsr.io/@probitas/client-mongodb)           | MongoDB client with session/transaction helpers                    |
| [@probitas-test/client-redis](./packages/probitas-client-redis)               | [![npm](https://img.shields.io/npm/v/@probitas-test/client-redis)](https://www.npmjs.com/package/@probitas-test/client-redis)               | [![JSR](https://jsr.io/badges/@probitas/client-redis)](https://jsr.io/@probitas/client-redis)               | Redis client for command execution                                 |
| [@probitas-test/client-sqs](./packages/probitas-client-sqs)                   | [![npm](https://img.shields.io/npm/v/@probitas-test/client-sqs)](https://www.npmjs.com/package/@probitas-test/client-sqs)                   | [![JSR](https://jsr.io/badges/@probitas/client-sqs)](https://jsr.io/@probitas/client-sqs)                   | SQS client targeting ElasticMQ for integration testing             |
| [@probitas-test/client-rabbitmq](./packages/probitas-client-rabbitmq)         | [![npm](https://img.shields.io/npm/v/@probitas-test/client-rabbitmq)](https://www.npmjs.com/package/@probitas-test/client-rabbitmq)         | [![JSR](https://jsr.io/badges/@probitas/client-rabbitmq)](https://jsr.io/@probitas/client-rabbitmq)         | RabbitMQ client with channel lifecycle management                  |

## Quick Start

This repository is intended for contributors developing the Probitas framework
itself. For using Probitas in your projects, refer to
[@probitas-test/probitas](https://github.com/probitas-test/probitas) - the main
framework package with unified API for writing scenarios.

## Development

### Prerequisites

- Bun 1.4+ (or use Nix: `nix develop`)
- Docker Compose (for integration testing services)

### Setup

```bash
# Clone the repository
git clone https://github.com/probitas-test/probitas-packages.git
cd probitas-packages

# Enter development environment (optional, using Nix)
nix develop

# Install dependencies
bun install

# Start integration test services
docker compose up -d
```

### Tasks

```bash
# Run all checks and tests (recommended before committing)
bun run verify

# Individual tasks
bun run fmt           # Format code (dprint)
bun run lint          # Lint code (Biome)
bun run check         # Type check (tsc)
bun run test          # Run tests

# Coverage
bun run test --coverage
```

### Integration Services

`compose.yaml` provides local dependencies for testing:

| Service         | Port  | Docker Image                                                                            |
| --------------- | ----- | --------------------------------------------------------------------------------------- |
| echo-http       | 8080  | [ghcr.io/probitas-test/echo-http](https://ghcr.io/probitas-test/echo-http)              |
| echo-connectrpc | 8090  | [ghcr.io/probitas-test/echo-connectrpc](https://ghcr.io/probitas-test/echo-connectrpc)  |
| echo-grpc       | 50051 | [ghcr.io/probitas-test/echo-grpc](https://ghcr.io/probitas-test/echo-grpc)              |
| echo-graphql    | 8100  | [ghcr.io/probitas-test/echo-graphql](https://ghcr.io/probitas-test/echo-graphql)        |
| postgres        | 5432  | [postgres:latest](https://hub.docker.com/_/postgres)                                    |
| mysql           | 3306  | [mysql:latest](https://hub.docker.com/_/mysql)                                          |
| redis           | 6379  | [redis:latest](https://hub.docker.com/_/redis)                                          |
| mongodb         | 27017 | [mongo:latest](https://hub.docker.com/_/mongo)                                          |
| rabbitmq        | 5672  | [rabbitmq:latest](https://hub.docker.com/_/rabbitmq)                                    |
| elasticmq       | 9324  | [softwaremill/elasticmq-native](https://hub.docker.com/r/softwaremill/elasticmq-native) |

## Architecture

### Framework Layers

1. **Discovery** (`@probitas-test/discover`) - File pattern matching and
   scenario discovery
2. **Core** (`@probitas-test/core`) - Scenario loading, filtering, and type
   definitions
3. **Builder** (`@probitas-test/builder`) - Fluent API for defining scenarios
   with type-safe step chaining
4. **Runner** (`@probitas-test/runner`) - Execution engine with concurrency
   control, retries, and resource lifecycle
5. **Reporter** (`@probitas-test/reporter`) - Output formatting (List, JSON)
6. **Expect** (`@probitas-test/expect`) - Protocol-specific expectation matchers

### Client Design Principles

- **Minimal Dependencies**: Client packages avoid depending on framework
  packages to prevent circular dependencies
- **Shared Error Model**: All clients extend `ClientError` from
  `@probitas-test/client` with typed `kind` discriminators
- **Resource Lifecycle**: Clients implement `AsyncDisposable` for automatic
  cleanup in scenario resources
- **Protocol Consistency**: Similar operations (queries, commands) share API
  patterns across clients

## Contributing

This repository uses Conventional Commits:

```bash
# Single package
feat(builder): add retry option to step execution
fix(client-http): handle connection pooling correctly

# Multiple packages
fix(runner,core): fix shared type definitions

# All packages
docs(*): update copyright headers
```

**Important**:

- Scopes are package names without the registry scope (e.g., `expect`,
  `client-http`)
- `feat:` → minor bump, `fix:`/`docs:`/`refactor:` → patch bump
- `BREAKING:` → major bump (except for `/unstable` scopes, always patch)
- Run `bun run verify` before committing

See [`.claude/rules/repository.md`](./.claude/rules/repository.md) for detailed
contribution guidelines.

## Related Repositories

- [@probitas-test/probitas](https://github.com/probitas-test/probitas) - Main
  framework package with unified API

## License

See [LICENSE](LICENSE) for details.
