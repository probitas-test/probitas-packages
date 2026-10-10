/**
 * SQLite client for [Probitas](https://github.com/probitas-test/probitas) scenario testing framework.
 *
 * This package provides a SQLite client designed for integration testing,
 * with transaction support and in-memory database capabilities.
 *
 * ## Features
 *
 * - **Query Execution**: Parameterized queries with type-safe results
 * - **Transactions**: Full transaction support with isolation levels
 * - **In-Memory Databases**: Perfect for isolated test scenarios
 * - **File-Based Databases**: Persist data for stateful testing
 * - **Resource Management**: Implements `AsyncDisposable` for proper cleanup
 *
 * ## Installation
 *
 * ```bash
 * npm install @probitas-test/client-sql-sqlite
 * ```
 *
 * ## Quick Start
 *
 * ```ts
 * import { createSqliteClient } from "@probitas-test/client-sql-sqlite";
 *
 * // In-memory database for testing
 * const client = await createSqliteClient({
 *   path: ":memory:",
 * });
 *
 * // Create table
 * await client.query(`
 *   CREATE TABLE users (
 *     id INTEGER PRIMARY KEY,
 *     name TEXT NOT NULL,
 *     active INTEGER DEFAULT 1
 *   )
 * `);
 *
 * // Insert and query with parameters (uses ? placeholders)
 * await client.query("INSERT INTO users (name) VALUES (?)", ["Alice"]);
 *
 * const result = await client.query<{ id: number; name: string }>(
 *   "SELECT id, name FROM users WHERE active = ?",
 *   [1]
 * );
 * console.log(result.rows);
 *
 * await client.close();
 * ```
 *
 * ## Transactions
 *
 * ```ts
 * import { createSqliteClient } from "@probitas-test/client-sql-sqlite";
 * import type { SqlTransaction } from "@probitas-test/client-sql";
 *
 * const client = await createSqliteClient({ path: ":memory:" });
 * await client.transaction(async (tx: SqlTransaction) => {
 *   await tx.query("INSERT INTO accounts (id, balance) VALUES (?, ?)", [1, 100]);
 *   await tx.query("INSERT INTO accounts (id, balance) VALUES (?, ?)", [2, 200]);
 *   // Automatically committed if no error, rolled back on exception
 * });
 * await client.close();
 * ```
 *
 * ## Using with `using` Statement
 *
 * ```ts
 * import { createSqliteClient } from "@probitas-test/client-sql-sqlite";
 *
 * await using client = await createSqliteClient({ path: ":memory:" });
 *
 * await client.query("CREATE TABLE test (id INTEGER PRIMARY KEY)");
 * // Client automatically closed when block exits
 * ```
 *
 * ## Related Packages
 *
 * | Package | Description |
 * |---------|-------------|
 * | [`@probitas-test/client-sql`](https://www.npmjs.com/package/@probitas-test/client-sql) | Common SQL types and utilities |
 * | [`@probitas-test/client-sql-postgres`](https://www.npmjs.com/package/@probitas-test/client-sql-postgres) | PostgreSQL client |
 * | [`@probitas-test/client-sql-mysql`](https://www.npmjs.com/package/@probitas-test/client-sql-mysql) | MySQL client |
 * | [`@probitas-test/client-sql-duckdb`](https://www.npmjs.com/package/@probitas-test/client-sql-duckdb) | DuckDB client |
 *
 * ## Links
 *
 * - [GitHub Repository](https://github.com/probitas-test/probitas-packages)
 * - [Probitas Framework](https://github.com/probitas-test/probitas)
 * - [SQLite](https://www.sqlite.org/)
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
