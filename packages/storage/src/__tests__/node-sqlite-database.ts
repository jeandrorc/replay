import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';

import type {
  SqliteDatabase,
  SqliteExecutionResult,
} from '../sqlite-foundation.js';

const toSqlInput = (value: unknown): SQLInputValue => {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'bigint'
  ) {
    return value;
  }
  throw new TypeError('Unsupported SQLite test bind value.');
};

const positionalSql = (sql: string): string => sql.replaceAll(/\$\d+/gu, '?');

export class NodeSqliteDatabase implements SqliteDatabase {
  readonly #database: DatabaseSync;

  public constructor(path: string) {
    this.#database = new DatabaseSync(path);
  }

  public execute(
    sql: string,
    bindValues?: readonly unknown[],
  ): Promise<SqliteExecutionResult> {
    return Promise.resolve().then(() => {
      if (bindValues && bindValues.length > 0) {
        const result = this.#database
          .prepare(positionalSql(sql))
          .run(...bindValues.map(toSqlInput));
        return { rowsAffected: Number(result.changes) };
      }
      this.#database.exec(sql);
      return { rowsAffected: 0 };
    });
  }

  public select<Row>(
    sql: string,
    bindValues?: readonly unknown[],
  ): Promise<Row[]> {
    return Promise.resolve().then(
      () =>
        this.#database
          .prepare(positionalSql(sql))
          .all(...(bindValues ?? []).map(toSqlInput)) as Row[],
    );
  }

  public close(): Promise<void> {
    return Promise.resolve().then(() => {
      this.#database.close();
    });
  }
}

export interface TemporaryDatabase {
  readonly database: NodeSqliteDatabase;
  close(): Promise<void>;
}

export const createTemporaryDatabase = async (): Promise<TemporaryDatabase> => {
  const directory = await mkdtemp(join(tmpdir(), 'replay-storage-'));
  const database = new NodeSqliteDatabase(join(directory, 'test.sqlite3'));
  return {
    database,
    async close(): Promise<void> {
      await database.close();
      await rm(directory, { recursive: true });
    },
  };
};

export const withDatabase = async (
  run: (database: NodeSqliteDatabase) => Promise<void>,
): Promise<void> => {
  const temporary = await createTemporaryDatabase();
  try {
    await run(temporary.database);
  } finally {
    await temporary.close();
  }
};
