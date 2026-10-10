/**
 * Common SQL types and utilities for [Probitas](https://github.com/probitas-test/probitas) SQL client packages.
 *
 * This package provides shared types, result classes, and errors used across
 * all SQL-related client packages.
 *
 * ## Features
 *
 * - **Query Results**: `SqlQueryResult` class with row iteration and metadata
 * - **Transactions**: Common transaction interface with isolation levels
 * - **Error Hierarchy**: SQL-specific errors (`SqlError`, `QuerySyntaxError`, `ConstraintError`, `DeadlockError`)
 *
 * ## Installation
 *
 * ```bash
 * npm install @probitas-test/client-sql
 * ```
 *
 * ## Usage
 *
 * This package is typically used as a dependency by database-specific packages.
 * End users should import from the specific database client packages instead.
 *
 * ```ts
 * // Example of SQL error handling (requires database-specific client)
 * import {
 *   SqlQueryResult,
 *   SqlError,
 *   ConstraintError,
 * } from "@probitas-test/client-sql";
 * import type { SqlTransaction, SqlIsolationLevel } from "@probitas-test/client-sql";
 *
 * // Error types are available for use with database-specific clients
 * const isolationLevel: SqlIsolationLevel = "read_committed";
 * console.log("Isolation level:", isolationLevel);
 * ```
 *
 * ## Database-Specific Packages
 *
 * | Package | Description |
 * |---------|-------------|
 * | [`@probitas-test/client-sql-postgres`](https://www.npmjs.com/package/@probitas-test/client-sql-postgres) | PostgreSQL client |
 * | [`@probitas-test/client-sql-mysql`](https://www.npmjs.com/package/@probitas-test/client-sql-mysql) | MySQL client |
 * | [`@probitas-test/client-sql-sqlite`](https://www.npmjs.com/package/@probitas-test/client-sql-sqlite) | SQLite client |
 * | [`@probitas-test/client-sql-duckdb`](https://www.npmjs.com/package/@probitas-test/client-sql-duckdb) | DuckDB client |
 *
 * ## Links
 *
 * - [GitHub Repository](https://github.com/probitas-test/probitas-packages)
 * - [Probitas Framework](https://github.com/probitas-test/probitas)
 *
 * @module
 */

export type * from "./transaction.ts";
export * from "./errors.ts";
export * from "./result.ts";
