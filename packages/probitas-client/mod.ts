/**
 * Core utilities and types for Probitas client libraries.
 *
 * This package provides shared types, error classes, and utilities used across
 * all `@probitas-test/client-*` packages.
 *
 * ## Features
 *
 * - **Common Options**: Shared configuration types like `CommonOptions` and `RetryOptions`
 * - **Error Hierarchy**: Base error classes (`ClientError`, `ConnectionError`, `TimeoutError`, `AbortError`)
 *
 * ## Installation
 *
 * ```bash
 * npm install @probitas-test/client
 * ```
 *
 * ## Usage
 *
 * This package is typically used as a dependency by other client packages.
 * End users rarely need to import from it directly.
 *
 * ```ts
 * import type { CommonOptions, RetryOptions } from "@probitas-test/client";
 * import { ClientError, ConnectionError, TimeoutError } from "@probitas-test/client";
 *
 * // Use CommonOptions for timeout and abort signal support
 * async function fetchData(options?: CommonOptions) {
 *   // Implementation with timeout and signal handling
 * }
 *
 * // Catch and handle errors
 * try {
 *   await fetchData({ timeout: 5000 });
 * } catch (error) {
 *   if (error instanceof TimeoutError) {
 *     console.log(`Timed out after ${error.timeoutMs}ms`);
 *   } else if (error instanceof ConnectionError) {
 *     console.log("Failed to connect");
 *   }
 * }
 * ```
 *
 * ## Related Packages
 *
 * | Package | Description |
 * |---------|-------------|
 * | [`@probitas-test/client-http`](https://www.npmjs.com/package/@probitas-test/client-http) | HTTP client |
 * | [`@probitas-test/client-graphql`](https://www.npmjs.com/package/@probitas-test/client-graphql) | GraphQL client |
 * | [`@probitas-test/client-grpc`](https://www.npmjs.com/package/@probitas-test/client-grpc) | gRPC client |
 * | [`@probitas-test/client-connectrpc`](https://www.npmjs.com/package/@probitas-test/client-connectrpc) | ConnectRPC client |
 * | [`@probitas-test/client-sql-postgres`](https://www.npmjs.com/package/@probitas-test/client-sql-postgres) | PostgreSQL client |
 * | [`@probitas-test/client-sql-mysql`](https://www.npmjs.com/package/@probitas-test/client-sql-mysql) | MySQL client |
 * | [`@probitas-test/client-sql-sqlite`](https://www.npmjs.com/package/@probitas-test/client-sql-sqlite) | SQLite client |
 * | [`@probitas-test/client-sql-duckdb`](https://www.npmjs.com/package/@probitas-test/client-sql-duckdb) | DuckDB client |
 * | [`@probitas-test/client-redis`](https://www.npmjs.com/package/@probitas-test/client-redis) | Redis client |
 * | [`@probitas-test/client-mongodb`](https://www.npmjs.com/package/@probitas-test/client-mongodb) | MongoDB client |
 * | [`@probitas-test/client-rabbitmq`](https://www.npmjs.com/package/@probitas-test/client-rabbitmq) | RabbitMQ client |
 * | [`@probitas-test/client-sqs`](https://www.npmjs.com/package/@probitas-test/client-sqs) | AWS SQS client |
 *
 * ## Links
 *
 * - [GitHub Repository](https://github.com/probitas-test/probitas-packages)
 * - [Probitas Framework](https://github.com/probitas-test/probitas)
 *
 * @module
 */

export type * from "./types.ts";
export * from "./errors.ts";
