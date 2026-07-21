import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import test from 'node:test';

import {
  initializeSqlite,
  MigrationError,
  sqliteConnectionUrl,
  type Migration,
  type SqliteDatabase,
} from '../index.js';

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

class NodeSqliteDatabase implements SqliteDatabase {
  readonly #database: DatabaseSync;

  constructor(path: string) {
    this.#database = new DatabaseSync(path);
  }

  execute(sql: string, bindValues?: readonly unknown[]): Promise<void> {
    return Promise.resolve().then(() => {
      if (bindValues && bindValues.length > 0) {
        this.#database.prepare(sql).run(...bindValues.map(toSqlInput));
        return;
      }
      this.#database.exec(sql);
    });
  }

  select<Row>(sql: string, bindValues?: readonly unknown[]): Promise<Row[]> {
    return Promise.resolve().then(
      () =>
        this.#database
          .prepare(sql)
          .all(...(bindValues ?? []).map(toSqlInput)) as Row[],
    );
  }

  close(): Promise<void> {
    return Promise.resolve().then(() => {
      this.#database.close();
    });
  }
}

const migrations: readonly Migration[] = [
  {
    version: 1,
    description: 'create parents',
    sql: 'CREATE TABLE parents (id INTEGER PRIMARY KEY);',
  },
  {
    version: 2,
    description: 'create children',
    sql: `CREATE TABLE children (
      id INTEGER PRIMARY KEY,
      parent_id INTEGER NOT NULL REFERENCES parents(id)
    );`,
  },
];

const withDatabase = async (
  run: (database: NodeSqliteDatabase, path: string) => Promise<void>,
): Promise<void> => {
  const directory = await mkdtemp(join(tmpdir(), 'replay-storage-'));
  const path = join(directory, 'test.sqlite3');
  const database = new NodeSqliteDatabase(path);
  try {
    await run(database, path);
  } finally {
    await database.close();
    await rm(directory, { recursive: true });
  }
};

await test('uses a safe configurable Tauri application-data database name', () => {
  assert.equal(sqliteConnectionUrl(), 'sqlite:replay.sqlite3');
  assert.equal(sqliteConnectionUrl('test.sqlite3'), 'sqlite:test.sqlite3');
  assert.throws(() => sqliteConnectionUrl('../outside.sqlite3'), TypeError);
});

await test('configures WAL and foreign keys and applies ordered migrations once', async () => {
  await withDatabase(async (database) => {
    const first = await initializeSqlite(database, migrations);
    const second = await initializeSqlite(database, migrations);
    const ledger = await database.select<{ version: number }>(
      'SELECT version FROM replay_schema_migrations ORDER BY version;',
    );

    assert.deepEqual(first.appliedMigrations, [
      { version: 1, description: 'create parents' },
      { version: 2, description: 'create children' },
    ]);
    assert.deepEqual(second.appliedMigrations, []);
    assert.deepEqual(
      ledger.map(({ version }) => version),
      [1, 2],
    );
    await assert.rejects(
      database.execute('INSERT INTO children (id, parent_id) VALUES (1, 999);'),
    );
  });
});

await test('rolls back a failed migration and keeps the previous schema usable', async () => {
  await withDatabase(async (database) => {
    await initializeSqlite(database, migrations.slice(0, 1));

    await assert.rejects(
      initializeSqlite(database, [
        ...migrations.slice(0, 1),
        {
          version: 2,
          description: 'broken migration',
          sql: 'CREATE TABLE transient_table (id INTEGER); INVALID SQL;',
        },
      ]),
      (error: unknown) =>
        error instanceof MigrationError &&
        error.migrationVersion === 2 &&
        error.recoveryGuidance.includes('back up the database file'),
    );

    const tables = await database.select<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name;",
    );
    const ledger = await database.select<{ version: number }>(
      'SELECT version FROM replay_schema_migrations ORDER BY version;',
    );

    assert.equal(
      tables.some(({ name }) => name === 'parents'),
      true,
    );
    assert.equal(
      tables.some(({ name }) => name === 'transient_table'),
      false,
    );
    assert.deepEqual(
      ledger.map(({ version }) => version),
      [1],
    );
  });
});

await test('rejects unordered migrations before changing the database', async () => {
  await withDatabase(async (database) => {
    const first = migrations[0];
    const second = migrations[1];
    assert.ok(first);
    assert.ok(second);

    await assert.rejects(
      initializeSqlite(database, [second, first]),
      TypeError,
    );
    const tables = await database.select<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE name = 'replay_schema_migrations';",
    );
    assert.deepEqual(tables, []);
  });
});
