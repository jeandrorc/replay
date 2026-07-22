import {
  LocalSettings,
  type LocalSettingsRepositoryPort,
  type ManualActivityRepositoryPort,
  type ReviewConfirmation,
  type ReviewStateRepositoryPort,
  type ReviewTargetId,
  type ReviseManualActivityResult,
  type SaveManualActivityResult,
  type StartManualActivityResult,
} from '@replay/application';
import {
  Identifier,
  ManualActivity,
  TimeRange,
  UtcInstant,
  type ManualActivityId,
  type ManualActivityTiming,
  type UserDecisionId,
} from '@replay/domain';

import type { SqliteDatabase } from './sqlite-foundation.js';
import { StorageCorruptionError } from './storage-corruption-error.js';

interface ManualRevisionRow {
  readonly decision_id: string;
  readonly activity_id: string;
  readonly supersedes_decision_id: string | null;
  readonly revision: number;
  readonly recorded_at: string;
  readonly title: string;
  readonly category: string | null;
  readonly ticket_reference: string | null;
  readonly timing_status: string;
  readonly started_at: string;
  readonly ended_at: string | null;
}

interface ReviewRow {
  readonly decision_id: string;
  readonly target_id: string;
  readonly confirmed: number;
  readonly decided_at: string;
}

interface SettingsRow {
  readonly capture_enabled: number;
  readonly time_zone: string;
  readonly day_boundary_minutes: number;
  readonly retention_days: number;
}

const revisionValues = (activity: ManualActivity): readonly unknown[] => {
  const startedAt =
    activity.timing.status === 'ongoing'
      ? activity.timing.startedAt
      : activity.timing.range.start;
  const endedAt =
    activity.timing.status === 'completed'
      ? activity.timing.range.end.toISOString()
      : null;
  return [
    activity.decisionId.value,
    activity.id.value,
    activity.supersedesDecisionId?.value ?? null,
    activity.revision,
    activity.recordedAt.toISOString(),
    activity.title,
    activity.category,
    activity.ticketReference,
    activity.timing.status,
    startedAt.toISOString(),
    endedAt,
  ];
};

const insertRevision = async (
  database: SqliteDatabase,
  activity: ManualActivity,
): Promise<void> => {
  await database.execute(
    `INSERT INTO manual_activity_revisions (
      decision_id, activity_id, supersedes_decision_id, revision, recorded_at,
      title, category, ticket_reference, timing_status, started_at, ended_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);`,
    revisionValues(activity),
  );
};

const mapRevisions = (rows: readonly ManualRevisionRow[]): ManualActivity => {
  const first = rows[0];
  if (first === undefined || first.revision !== 1) {
    throw new StorageCorruptionError('manual activity');
  }
  try {
    let activity = ManualActivity.create(
      Identifier.fromString<'ManualActivity'>(first.activity_id),
      {
        decisionId: Identifier.fromString<'UserDecision'>(first.decision_id),
        recordedAt: UtcInstant.parse(first.recorded_at),
        title: first.title,
        ...(first.category === null ? {} : { category: first.category }),
        ...(first.ticket_reference === null
          ? {}
          : { ticketReference: first.ticket_reference }),
        timing: timingFrom(first),
      },
    );
    for (const row of rows.slice(1)) {
      if (
        row.activity_id !== first.activity_id ||
        row.revision !== activity.revision + 1 ||
        row.supersedes_decision_id !== activity.decisionId.value
      ) {
        throw new StorageCorruptionError('manual activity');
      }
      activity = activity.revise({
        decisionId: Identifier.fromString<'UserDecision'>(row.decision_id),
        recordedAt: UtcInstant.parse(row.recorded_at),
        title: row.title,
        ...(row.category === null ? {} : { category: row.category }),
        ...(row.ticket_reference === null
          ? {}
          : { ticketReference: row.ticket_reference }),
        timing: timingFrom(row),
      });
    }
    return activity;
  } catch (cause: unknown) {
    if (cause instanceof StorageCorruptionError) {
      throw cause;
    }
    throw new StorageCorruptionError('manual activity', { cause });
  }
};

const timingFrom = (row: ManualRevisionRow): ManualActivityTiming => {
  const startedAt = UtcInstant.parse(row.started_at);
  if (row.timing_status === 'ongoing' && row.ended_at === null) {
    return { status: 'ongoing' as const, startedAt };
  }
  if (row.timing_status === 'completed' && row.ended_at !== null) {
    return {
      status: 'completed' as const,
      range: TimeRange.between(startedAt, UtcInstant.parse(row.ended_at)),
    };
  }
  throw new StorageCorruptionError('manual activity timing');
};

const overlaps = async (
  database: SqliteDatabase,
  activity: ManualActivity,
): Promise<ManualActivityId[]> => {
  if (activity.timing.status !== 'completed') {
    return [];
  }
  const rows = await database.select<{ activity_id: string }>(
    `SELECT heads.activity_id
     FROM manual_activity_heads heads
     JOIN manual_activity_revisions revisions
       ON revisions.decision_id = heads.current_decision_id
     WHERE heads.activity_id <> $1
       AND revisions.timing_status = 'completed'
       AND revisions.started_at < $2
       AND revisions.ended_at > $3
     ORDER BY heads.activity_id;`,
    [
      activity.id.value,
      activity.timing.range.end.toISOString(),
      activity.timing.range.start.toISOString(),
    ],
  );
  return rows.map(({ activity_id }) =>
    Identifier.fromString<'ManualActivity'>(activity_id),
  );
};

export class SqliteManualActivityRepository
  implements ManualActivityRepositoryPort
{
  public constructor(private readonly database: SqliteDatabase) {}

  public async getById(id: ManualActivityId): Promise<ManualActivity | null> {
    const rows = await this.database.select<ManualRevisionRow>(
      `SELECT * FROM manual_activity_revisions
       WHERE activity_id = $1 ORDER BY revision;`,
      [id.value],
    );
    return rows.length === 0 ? null : mapRevisions(rows);
  }

  public async saveInitial(
    activity: ManualActivity,
  ): Promise<SaveManualActivityResult> {
    await this.database.transaction(async (database) => {
      await insertRevision(database, activity);
      await database.execute(
        `INSERT INTO manual_activity_heads
         (activity_id, current_decision_id, timing_status) VALUES ($1, $2, $3);`,
        [activity.id.value, activity.decisionId.value, activity.timing.status],
      );
    });
    return {
      status: 'saved',
      overlappingActivityIds: await overlaps(this.database, activity),
    };
  }

  public async startIfNone(
    activity: ManualActivity,
  ): Promise<StartManualActivityResult> {
    try {
      return await this.saveInitial(activity);
    } catch (cause: unknown) {
      const ongoing = await this.database.select<{ activity_id: string }>(
        `SELECT activity_id FROM manual_activity_heads
         WHERE timing_status = 'ongoing' LIMIT 1;`,
      );
      const existingId = ongoing[0]?.activity_id;
      if (existingId === undefined) {
        throw cause;
      }
      const existing = await this.getById(
        Identifier.fromString<'ManualActivity'>(existingId),
      );
      if (existing === null) {
        throw new StorageCorruptionError('manual activity head');
      }
      return { status: 'ongoing_exists', existing };
    }
  }

  public async appendRevision(
    activity: ManualActivity,
    expectedDecisionId: UserDecisionId,
  ): Promise<ReviseManualActivityResult> {
    const saved = await this.database.transaction(async (database) => {
      const head = await database.select<{ current_decision_id: string }>(
        `SELECT current_decision_id FROM manual_activity_heads
         WHERE activity_id = $1 LIMIT 1;`,
        [activity.id.value],
      );
      if (head[0]?.current_decision_id !== expectedDecisionId.value) {
        return false;
      }
      await insertRevision(database, activity);
      const result = await database.execute(
        `UPDATE manual_activity_heads
         SET current_decision_id = $1, timing_status = $2
         WHERE activity_id = $3 AND current_decision_id = $4;`,
        [
          activity.decisionId.value,
          activity.timing.status,
          activity.id.value,
          expectedDecisionId.value,
        ],
      );
      if (result.rowsAffected !== 1) {
        throw new Error('Manual activity head changed during revision.');
      }
      return true;
    });
    return saved
      ? {
          status: 'saved',
          overlappingActivityIds: await overlaps(this.database, activity),
        }
      : { status: 'conflict' };
  }
}

export class SqliteReviewStateRepository implements ReviewStateRepositoryPort {
  public constructor(private readonly database: SqliteDatabase) {}

  public async append(confirmation: ReviewConfirmation): Promise<void> {
    await this.database.execute(
      `INSERT INTO review_confirmations
       (decision_id, target_id, confirmed, decided_at) VALUES ($1, $2, $3, $4);`,
      [
        confirmation.decisionId.value,
        confirmation.targetId.value,
        confirmation.confirmed ? 1 : 0,
        confirmation.decidedAt.toISOString(),
      ],
    );
  }

  public async getLatest(
    targetId: ReviewTargetId,
  ): Promise<ReviewConfirmation | null> {
    const rows = await this.database.select<ReviewRow>(
      `SELECT decision_id, target_id, confirmed, decided_at
       FROM review_confirmations WHERE target_id = $1
       ORDER BY decided_at DESC, decision_id DESC LIMIT 1;`,
      [targetId.value],
    );
    const row = rows[0];
    if (row === undefined) {
      return null;
    }
    try {
      if (row.confirmed !== 0 && row.confirmed !== 1) {
        throw new TypeError('Invalid confirmation flag.');
      }
      return {
        decisionId: Identifier.fromString<'UserDecision'>(row.decision_id),
        targetId: Identifier.fromString<'ReviewTarget'>(row.target_id),
        confirmed: row.confirmed === 1,
        decidedAt: UtcInstant.parse(row.decided_at),
      };
    } catch (cause: unknown) {
      throw new StorageCorruptionError('review confirmation', { cause });
    }
  }
}

export class SqliteLocalSettingsRepository
  implements LocalSettingsRepositoryPort
{
  public constructor(private readonly database: SqliteDatabase) {}

  public async save(settings: LocalSettings): Promise<void> {
    await this.database.execute(
      `INSERT INTO local_settings (
        singleton_id, capture_enabled, time_zone,
        day_boundary_minutes, retention_days
      ) VALUES (1, $1, $2, $3, $4)
      ON CONFLICT(singleton_id) DO UPDATE SET
        capture_enabled = excluded.capture_enabled,
        time_zone = excluded.time_zone,
        day_boundary_minutes = excluded.day_boundary_minutes,
        retention_days = excluded.retention_days;`,
      [
        settings.captureEnabled ? 1 : 0,
        settings.timeZone,
        settings.dayBoundaryMinutes,
        settings.retentionDays,
      ],
    );
  }

  public async load(): Promise<LocalSettings | null> {
    const rows = await this.database.select<SettingsRow>(
      `SELECT capture_enabled, time_zone, day_boundary_minutes, retention_days
       FROM local_settings WHERE singleton_id = 1 LIMIT 1;`,
    );
    const row = rows[0];
    if (row === undefined) {
      return null;
    }
    try {
      if (row.capture_enabled !== 0 && row.capture_enabled !== 1) {
        throw new TypeError('Invalid capture flag.');
      }
      return LocalSettings.create({
        captureEnabled: row.capture_enabled === 1,
        timeZone: row.time_zone,
        dayBoundaryMinutes: row.day_boundary_minutes,
        retentionDays: row.retention_days,
      });
    } catch (cause: unknown) {
      throw new StorageCorruptionError('local settings', { cause });
    }
  }
}
