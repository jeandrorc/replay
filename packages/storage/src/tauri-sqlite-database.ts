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

  return {
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
    async close(): Promise<void> {
      await database.close();
    },
  };
};
