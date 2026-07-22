export interface SqliteDatabase {
  execute(
    sql: string,
    bindValues?: readonly unknown[],
  ): Promise<SqliteExecutionResult>;
  select<Row>(sql: string, bindValues?: readonly unknown[]): Promise<Row[]>;
  transaction<Result>(
    operation: (database: SqliteDatabase) => Promise<Result>,
  ): Promise<Result>;
  close(): Promise<void>;
}

export interface SqliteExecutionResult {
  readonly rowsAffected: number;
}

export interface Migration {
  readonly version: number;
  readonly description: string;
  readonly sql: string;
}

export interface AppliedMigration {
  readonly version: number;
  readonly description: string;
}

export interface SqliteInitialization {
  readonly journalMode: 'wal';
  readonly foreignKeys: true;
  readonly appliedMigrations: readonly AppliedMigration[];
}

interface JournalModeRow {
  readonly journal_mode: string;
}

interface ForeignKeysRow {
  readonly foreign_keys: number;
}

interface MigrationRow {
  readonly version: number;
  readonly description: string;
}

const RECOVERY_GUIDANCE =
  'The previous schema remains available. Close Replay, back up the database file, and retry after resolving the migration error.';

export class MigrationError extends Error {
  readonly code = 'sqlite.migration_failed';
  readonly migrationVersion: number;
  readonly recoveryGuidance = RECOVERY_GUIDANCE;

  constructor(migrationVersion: number, options?: ErrorOptions) {
    super(
      `SQLite migration ${String(migrationVersion)} failed. ${RECOVERY_GUIDANCE}`,
      options,
    );
    this.name = 'MigrationError';
    this.migrationVersion = migrationVersion;
  }
}

const validateMigrations = (migrations: readonly Migration[]): void => {
  let previousVersion = 0;

  for (const migration of migrations) {
    if (
      !Number.isSafeInteger(migration.version) ||
      migration.version <= previousVersion ||
      migration.description.trim().length === 0 ||
      migration.sql.trim().length === 0
    ) {
      throw new TypeError(
        'Migrations require positive, strictly increasing versions and non-empty descriptions and SQL.',
      );
    }
    previousVersion = migration.version;
  }
};

const sqlLiteral = (value: string): string =>
  `'${value.replaceAll("'", "''")}'`;

const migrationBatch = (migration: Migration): string => `
BEGIN IMMEDIATE;
${migration.sql}
INSERT INTO replay_schema_migrations (version, description)
VALUES (${String(migration.version)}, ${sqlLiteral(migration.description)});
COMMIT;
`;

const configureConnection = async (database: SqliteDatabase): Promise<void> => {
  await database.execute('PRAGMA journal_mode = WAL;');
  await database.execute('PRAGMA foreign_keys = ON;');

  const journalModes = await database.select<JournalModeRow>(
    'PRAGMA journal_mode;',
  );
  const foreignKeys = await database.select<ForeignKeysRow>(
    'PRAGMA foreign_keys;',
  );

  if (journalModes[0]?.journal_mode.toLowerCase() !== 'wal') {
    throw new Error('SQLite WAL mode could not be enabled.');
  }
  if (foreignKeys[0]?.foreign_keys !== 1) {
    throw new Error('SQLite foreign-key enforcement could not be enabled.');
  }
};

const ensureMigrationLedger = async (
  database: SqliteDatabase,
): Promise<void> => {
  await database.execute(`
CREATE TABLE IF NOT EXISTS replay_schema_migrations (
  version INTEGER PRIMARY KEY,
  description TEXT NOT NULL,
  applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`);
};

export const initializeSqlite = async (
  database: SqliteDatabase,
  migrations: readonly Migration[],
): Promise<SqliteInitialization> => {
  validateMigrations(migrations);
  await configureConnection(database);
  await ensureMigrationLedger(database);

  const existing = await database.select<MigrationRow>(
    'SELECT version, description FROM replay_schema_migrations ORDER BY version;',
  );
  const appliedVersions = new Set(existing.map(({ version }) => version));
  const newlyApplied: AppliedMigration[] = [];

  for (const migration of migrations) {
    if (appliedVersions.has(migration.version)) {
      continue;
    }

    try {
      await database.execute(migrationBatch(migration));
    } catch (cause: unknown) {
      try {
        await database.execute('ROLLBACK;');
      } catch (rollbackCause: unknown) {
        void rollbackCause;
      }
      throw new MigrationError(migration.version, { cause });
    }

    newlyApplied.push({
      version: migration.version,
      description: migration.description,
    });
  }

  return {
    journalMode: 'wal',
    foreignKeys: true,
    appliedMigrations: newlyApplied,
  };
};
