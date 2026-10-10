/**
 * `bun:sqlite` adapter exposing the subset of the `@db/sqlite` API that this
 * client uses.
 *
 * `bun:sqlite` reports `changes` / `lastInsertRowid` per `run()` call instead
 * of on the database, so they are captured here after each run.
 *
 * @module
 * @internal
 */

import { Database as BunDatabase } from "bun:sqlite";

export type BindValue =
  | string
  | number
  | bigint
  | boolean
  | null
  | undefined
  | Uint8Array;

const SQLITE_OPEN_READONLY = 0x00000001;

export interface Statement {
  all<T = Record<string, unknown>>(...params: BindValue[]): T[];
  run(...params: BindValue[]): void;
  finalize(): void;
}

export class Database {
  readonly #db: BunDatabase;
  changes = 0;
  lastInsertRowId = 0;

  constructor(path: string, options: { flags?: number } = {}) {
    const readonly = options.flags === SQLITE_OPEN_READONLY;
    this.#db = new BunDatabase(
      path,
      readonly ? { readonly: true } : { readwrite: true, create: true },
    );
  }

  exec(sql: string): void {
    this.#db.exec(sql);
  }

  prepare(sql: string): Statement {
    const stmt = this.#db.prepare(sql);
    return {
      all: <T>(...params: BindValue[]) =>
        stmt.all(...(params as never[])) as T[],
      run: (...params: BindValue[]) => {
        const result = stmt.run(...(params as never[]));
        this.changes = result.changes;
        this.lastInsertRowId = Number(result.lastInsertRowid);
      },
      finalize: () => stmt.finalize(),
    };
  }

  close(): void {
    this.#db.close();
  }
}
