/**
 * PostgreSQL client for [Probitas](https://github.com/probitas-test/probitas) scenario testing framework.
 *
 * This package provides a PostgreSQL client designed for integration testing,
 * with transaction support and LISTEN/NOTIFY capabilities.
 *
 * ## Features
 *
 * - **Query Execution**: Parameterized queries with type-safe results
 * - **Transactions**: Full transaction support with isolation levels
 * - **LISTEN/NOTIFY**: Real-time notifications for async testing
 * - **COPY Protocol**: High-performance bulk data loading
 * - **Connection Pooling**: Configurable pool with idle timeout
 * - **Resource Management**: Implements `AsyncDisposable` for proper cleanup
 *
 * ## Installation
 *
 * ```bash
 * npm install @probitas-test/client-sql-postgres
 * ```
 *
 * ## Quick Start
 *
 * ```ts
 * import { createPostgresClient } from "@probitas-test/client-sql-postgres";
 *
 * const client = await createPostgresClient({
 *   url: "postgres://user:pass@localhost:5432/mydb",
 * });
 *
 * // Query with parameters
 * const result = await client.query<{ id: number; name: string }>(
 *   "SELECT id, name FROM users WHERE active = $1",
 *   [true]
 * );
 * console.log(result.rows);
 *
 * // Get first row
 * const user = await client.queryOne<{ id: number; name: string }>(
 *   "SELECT * FROM users WHERE id = $1",
 *   [1]
 * );
 *
 * await client.close();
 * ```
 *
 * ## Transactions
 *
 * ```ts
 * import { createPostgresClient } from "@probitas-test/client-sql-postgres";
 * import type { SqlTransaction } from "@probitas-test/client-sql";
 *
 * const client = await createPostgresClient({
 *   url: "postgres://localhost:5432/testdb",
 * });
 *
 * await client.transaction(async (tx: SqlTransaction) => {
 *   await tx.query("INSERT INTO accounts (id, balance) VALUES ($1, $2)", [1, 100]);
 *   await tx.query("INSERT INTO accounts (id, balance) VALUES ($1, $2)", [2, 200]);
 *   // Automatically committed if no error, rolled back on exception
 * }, { isolationLevel: "serializable" });
 *
 * await client.close();
 * ```
 *
 * ## LISTEN/NOTIFY
 *
 * ```ts
 * import { createPostgresClient } from "@probitas-test/client-sql-postgres";
 *
 * const client = await createPostgresClient({
 *   url: "postgres://localhost:5432/testdb",
 * });
 *
 * // Listen for notifications
 * const listener = await client.listen("events");
 * for await (const notification of listener) {
 *   console.log("Received:", notification.payload);
 *   break;
 * }
 *
 * // Send notification
 * await client.notify("events", JSON.stringify({ type: "created", id: 123 }));
 *
 * await client.close();
 * ```
 *
 * ## Using with `using` Statement
 *
 * ```ts
 * import { createPostgresClient } from "@probitas-test/client-sql-postgres";
 *
 * await using client = await createPostgresClient({
 *   url: "postgres://localhost:5432/testdb",
 * });
 *
 * const result = await client.query("SELECT 1 as n");
 * // Client automatically closed when block exits
 * ```
 *
 * ## Related Packages
 *
 * | Package | Description |
 * |---------|-------------|
 * | [`@probitas-test/client-sql`](https://www.npmjs.com/package/@probitas-test/client-sql) | Common SQL types and utilities |
 * | [`@probitas-test/client-sql-mysql`](https://www.npmjs.com/package/@probitas-test/client-sql-mysql) | MySQL client |
 * | [`@probitas-test/client-sql-sqlite`](https://www.npmjs.com/package/@probitas-test/client-sql-sqlite) | SQLite client |
 * | [`@probitas-test/client-sql-duckdb`](https://www.npmjs.com/package/@probitas-test/client-sql-duckdb) | DuckDB client |
 *
 * ## Links
 *
 * - [GitHub Repository](https://github.com/probitas-test/probitas-packages)
 * - [Probitas Framework](https://github.com/probitas-test/probitas)
 * - [PostgreSQL](https://www.postgresql.org/)
 *
 * @module
 */

// Client
export * from "./client.ts";

// Transaction
export type * from "./transaction.ts";

// Types
export type * from "./types.ts";

// Errors
export * from "./errors.ts";

// Re-export common types from @probitas-test/client-sql
export * from "@probitas-test/client-sql";
