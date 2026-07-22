import Database from '@tauri-apps/plugin-sql';

import type {
  SqliteDatabase,
  SqliteExecutionResult,
} from './sqlite-foundation.js';

const DATABASE_NAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;

export const sqliteConnectionUrl = (
  databaseName = 'replay.sqlite3',
): string => {
  if (!DATABASE_NAME_PATTERN.test(databaseName)) {
    throw new TypeError(
      'SQLite database name must be a safe relative file name.',
    );
  }
  return `sqlite:${databaseName}`;
};

export interface TauriSqliteDatabase extends SqliteDatabase {
  readonly connectionUrl: string;
}

export const createTauriSqliteDatabase = async (
  databaseName?: string,
): Promise<TauriSqliteDatabase> => {
  const connectionUrl = sqliteConnectionUrl(databaseName);
  const database = await Database.load(connectionUrl);
  let transactionTail: Promise<void> = Promise.resolve();
  const adapter: TauriSqliteDatabase = {
    connectionUrl,
    async execute(sql, bindValues): Promise<SqliteExecutionResult> {
      const result = await database.execute(
        sql,
        bindValues ? [...bindValues] : undefined,
      );
      return { rowsAffected: result.rowsAffected };
    },
    select<Row>(sql: string, bindValues?: readonly unknown[]): Promise<Row[]> {
      return database.select<Row[]>(
        sql,
        bindValues ? [...bindValues] : undefined,
      );
    },
    transaction<Result>(
      operation: (database: SqliteDatabase) => Promise<Result>,
    ): Promise<Result> {
      const result = transactionTail.then(async () => {
        await adapter.execute('BEGIN IMMEDIATE;');
        try {
          const value = await operation(adapter);
          await adapter.execute('COMMIT;');
          return value;
        } catch (cause: unknown) {
          await adapter.execute('ROLLBACK;');
          throw cause;
        }
      });
      transactionTail = result.then(
        () => undefined,
        () => undefined,
      );
      return result;
    },
    async close(): Promise<void> {
      await database.close();
    },
  };
  return adapter;
};
