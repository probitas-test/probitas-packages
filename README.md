# Probitas Packages

[![Test](https://github.com/probitas-test/probitas-packages/actions/workflows/test.yml/badge.svg)](https://github.com/probitas-test/probitas-packages/actions/workflows/test.yml)
[![Publish](https://github.com/probitas-test/probitas-packages/actions/workflows/publish.yml/badge.svg)](https://github.com/probitas-test/probitas-packages/actions/workflows/publish.yml)

Monorepo containing core framework packages and client libraries for the
Probitas scenario-based testing framework.

This repository combines both the framework implementation (builder, runner,
reporter, etc.) and multi-protocol client libraries (HTTP, gRPC, SQL, Redis,
etc.) under a unified workspace for streamlined development and testing.

## Highlights

- **Framework Packages**: Type-safe scenario builder, execution engine,
  reporters, and expectation library
- **Multi-Protocol Clients**: HTTP, ConnectRPC/gRPC/gRPC-Web, GraphQL, SQL
  (Postgres/MySQL/SQLite/DuckDB), MongoDB, Redis, RabbitMQ, SQS, and Deno KV
- **Shared Error Model**: Consistent `ClientError` hierarchy across all clients
  for uniform error handling
- **Resource Management**: AsyncDisposable-aware clients for automatic cleanup
  in scenarios
- **Built for Deno 2.x**: All packages published on JSR under the `@probitas/*`
  namespace

## Packages

### Framework Packages

| Package                                            | JSR                                                                                   | Description                       |
| -------------------------------------------------- | ------------------------------------------------------------------------------------- | --------------------------------- |
| [@probitas/builder](./packages/probitas-builder)   | [![JSR](https://jsr.io/badges/@probitas/builder)](https://jsr.io/@probitas/builder)   | Type-safe scenario definition API |
| [@probitas/runner](./packages/probitas-runner)     | [![JSR](https://jsr.io/badges/@probitas/runner)](https://jsr.io/@probitas/runner)     | Scenario execution engine         |
| [@probitas/reporter](./packages/probitas-reporter) | [![JSR](https://jsr.io/badges/@probitas/reporter)](https://jsr.io/@probitas/reporter) | Output formatters (List, JSON)    |
| [@probitas/core](./packages/probitas-core)         | [![JSR](https://jsr.io/badges/@probitas/core)](https://jsr.io/@probitas/core)         | Scenario loading and filtering    |
| [@probitas/discover](./packages/probitas-discover) | [![JSR](https://jsr.io/badges/@probitas/discover)](https://jsr.io/@probitas/discover) | File discovery with glob patterns |
| [@probitas/expect](./packages/probitas-expect)     | [![JSR](https://jsr.io/badges/@probitas/expect)](https://jsr.io/@probitas/expect)     | Expectation library               |

### Client Packages

| Package                                                                  | JSR                                                                                                         | Description                                                        |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| [@probitas/client](./packages/probitas-client)                           | [![JSR](https://jsr.io/badges/@probitas/client)](https://jsr.io/@probitas/client)                           | Core options and error base types shared by all clients            |
| [@probitas/client-http](./packages/probitas-client-http)                 | [![JSR](https://jsr.io/badges/@probitas/client-http)](https://jsr.io/@probitas/client-http)                 | HTTP client with buffered responses and cookie support             |
| [@probitas/client-connectrpc](./packages/probitas-client-connectrpc)     | [![JSR](https://jsr.io/badges/@probitas/client-connectrpc)](https://jsr.io/@probitas/client-connectrpc)     | ConnectRPC client supporting Connect, gRPC, and gRPC-Web protocols |
| [@probitas/client-grpc](./packages/probitas-client-grpc)                 | [![JSR](https://jsr.io/badges/@probitas/client-grpc)](https://jsr.io/@probitas/client-grpc)                 | gRPC client (thin wrapper over client-connectrpc)                  |
| [@probitas/client-graphql](./packages/probitas-client-graphql)           | [![JSR](https://jsr.io/badges/@probitas/client-graphql)](https://jsr.io/@probitas/client-graphql)           | GraphQL client with data/error helpers                             |
| [@probitas/client-sql](./packages/probitas-client-sql)                   | [![JSR](https://jsr.io/badges/@probitas/client-sql)](https://jsr.io/@probitas/client-sql)                   | Shared SQL result/transaction types                                |
| [@probitas/client-sql-postgres](./packages/probitas-client-sql-postgres) | [![JSR](https://jsr.io/badges/@probitas/client-sql-postgres)](https://jsr.io/@probitas/client-sql-postgres) | PostgreSQL client built on the shared SQL types                    |
| [@probitas/client-sql-mysql](./packages/probitas-client-sql-mysql)       | [![JSR](https://jsr.io/badges/@probitas/client-sql-mysql)](https://jsr.io/@probitas/client-sql-mysql)       | MySQL client built on the shared SQL types                         |
| [@probitas/client-sql-sqlite](./packages/probitas-client-sql-sqlite)     | [![JSR](https://jsr.io/badges/@probitas/client-sql-sqlite)](https://jsr.io/@probitas/client-sql-sqlite)     | SQLite client built on the shared SQL types                        |
| [@probitas/client-sql-duckdb](./packages/probitas-client-sql-duckdb)     | [![JSR](https://jsr.io/badges/@probitas/client-sql-duckdb)](https://jsr.io/@probitas/client-sql-duckdb)     | DuckDB client built on the shared SQL types                        |
| [@probitas/client-mongodb](./packages/probitas-client-mongodb)           | [![JSR](https://jsr.io/badges/@probitas/client-mongodb)](https://jsr.io/@probitas/client-mongodb)           | MongoDB client with session/transaction helpers                    |
| [@probitas/client-redis](./packages/probitas-client-redis)               | [![JSR](https://jsr.io/badges/@probitas/client-redis)](https://jsr.io/@probitas/client-redis)               | Redis client for command execution                                 |
| [@probitas/client-deno-kv](./packages/probitas-client-deno-kv)           | [![JSR](https://jsr.io/badges/@probitas/client-deno-kv)](https://jsr.io/@probitas/client-deno-kv)           | Deno KV client for key-value storage                               |
| [@probitas/client-sqs](./packages/probitas-client-sqs)                   | [![JSR](https://jsr.io/badges/@probitas/client-sqs)](https://jsr.io/@probitas/client-sqs)                   | SQS client targeting LocalStack for integration testing            |
| [@probitas/client-rabbitmq](./packages/probitas-client-rabbitmq)         | [![JSR](https://jsr.io/badges/@probitas/client-rabbitmq)](https://jsr.io/@probitas/client-rabbitmq)         | RabbitMQ client with channel lifecycle management                  |

## Quick Start

This repository is intended for contributors developing the Probitas framework
itself. For using Probitas in your projects, refer to
[@probitas/probitas](https://github.com/probitas-test/probitas) - the main
framework package with unified API for writing scenarios.

## Development

### Prerequisites

- Deno 2.x (or use Nix: `nix develop`)
- Docker Compose (for integration testing services)

### Setup

```bash
# Clone the repository
git clone https://github.com/probitas-test/probitas-packages.git
cd probitas-packages

# Enter development environment (optional, using Nix)
nix develop

# Start integration test services
docker compose up -d
```

### Tasks

```bash
# Run all checks and tests (recommended before committing)
deno task verify

# Individual tasks
deno fmt              # Format code
deno lint             # Lint code
deno task check       # Type check
deno task test        # Run tests

# Coverage
deno task test:coverage
deno task coverage
```

### Integration Services

`compose.yaml` provides local dependencies for testing:

| Service         | Port  | Docker Image                                                                           |
| --------------- | ----- | -------------------------------------------------------------------------------------- |
| echo-http       | 8080  | [ghcr.io/probitas-test/echo-http](https://ghcr.io/probitas-test/echo-http)             |
| echo-connectrpc | 8090  | [ghcr.io/probitas-test/echo-connectrpc](https://ghcr.io/probitas-test/echo-connectrpc) |
| echo-grpc       | 50051 | [ghcr.io/probitas-test/echo-grpc](https://ghcr.io/probitas-test/echo-grpc)             |
| echo-graphql    | 8100  | [ghcr.io/probitas-test/echo-graphql](https://ghcr.io/probitas-test/echo-graphql)       |
| postgres        | 5432  | [postgres:latest](https://hub.docker.com/_/postgres)                                   |
| mysql           | 3306  | [mysql:latest](https://hub.docker.com/_/mysql)                                         |
| redis           | 6379  | [redis:latest](https://hub.docker.com/_/redis)                                         |
| mongodb         | 27017 | [mongo:latest](https://hub.docker.com/_/mongo)                                         |
| rabbitmq        | 5672  | [rabbitmq:latest](https://hub.docker.com/_/rabbitmq)                                   |
| localstack      | 4566  | [localstack/localstack:latest](https://hub.docker.com/r/localstack/localstack)         |
| denokv          | 4512  | [ghcr.io/denoland/denokv](https://github.com/denoland/denokv/pkgs/container/denokv)    |

## Architecture

### Framework Layers

1. **Discovery** (`@probitas/discover`) - File pattern matching and scenario
   discovery
2. **Core** (`@probitas/core`) - Scenario loading, filtering, and type
   definitions
3. **Builder** (`@probitas/builder`) - Fluent API for defining scenarios with
   type-safe step chaining
4. **Runner** (`@probitas/runner`) - Execution engine with concurrency control,
   retries, and resource lifecycle
5. **Reporter** (`@probitas/reporter`) - Output formatting (List, JSON)
6. **Expect** (`@probitas/expect`) - Protocol-specific expectation matchers

### Client Design Principles

- **Minimal Dependencies**: Client packages avoid depending on framework
  packages to prevent circular dependencies
- **Shared Error Model**: All clients extend `ClientError` from
  `@probitas/client` with typed `kind` discriminators
- **Resource Lifecycle**: Clients implement `AsyncDisposable` for automatic
  cleanup in scenario resources
- **Protocol Consistency**: Similar operations (queries, commands) share API
  patterns across clients

## Contributing

This repository uses Conventional Commits for automatic versioning with
[@deno/bump-workspaces](https://github.com/denoland/bump-workspaces):

```bash
# Single package
feat(@probitas/builder): add retry option to step execution
fix(@probitas/client-http): handle connection pooling correctly

# Multiple packages
fix(@probitas/runner,@probitas/core): fix shared type definitions

# All packages
docs(*): update copyright headers
```

**Important**:

- Scopes must use full package names (e.g., `@probitas/expect`)
- `feat:` → minor bump, `fix:`/`docs:`/`refactor:` → patch bump
- `BREAKING:` → major bump (except for `/unstable` scopes, always patch)
- Run `deno task verify` before committing

See [`.claude/rules/repository.md`](./.claude/rules/repository.md) for detailed
contribution guidelines.

## Related Repositories

- [@probitas/probitas](https://github.com/probitas-test/probitas) - Main
  framework package with unified API

## License

See [LICENSE](LICENSE) for details.
