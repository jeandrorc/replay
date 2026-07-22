import assert from 'node:assert/strict';
import test from 'node:test';

import { LocalSettings, type ReviewConfirmation } from '@replay/application';
import {
  Identifier,
  ManualActivity,
  TimeRange,
  UtcInstant,
  type ManualActivityId,
  type UserDecisionId,
} from '@replay/domain';

import {
  initializeSqlite,
  replayMigrations,
  SqliteLocalSettingsRepository,
  SqliteManualActivityRepository,
  SqliteReviewStateRepository,
  StorageCorruptionError,
} from '../index.js';
import { withDatabase } from './node-sqlite-database.js';

const instant = (value: string): UtcInstant => UtcInstant.parse(value);
const at = (hour: number, minute = 0): UtcInstant =>
  instant(
    `2026-07-22T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00.000Z`,
  );
const activityId = (value: string): ManualActivityId =>
  Identifier.fromString<'ManualActivity'>(value);
const decisionId = (value: string): UserDecisionId =>
  Identifier.fromString<'UserDecision'>(value);

const completed = (
  id: string,
  decision: string,
  start: UtcInstant,
  end: UtcInstant,
): ManualActivity =>
  ManualActivity.create(activityId(id), {
    decisionId: decisionId(decision),
    recordedAt: end,
    title: `Activity ${id}`,
    category: 'meeting',
    ticketReference: 'STO-003',
    timing: { status: 'completed', range: TimeRange.between(start, end) },
  });

const ongoing = (id: string, decision: string): ManualActivity =>
  ManualActivity.create(activityId(id), {
    decisionId: decisionId(decision),
    recordedAt: at(12),
    title: `Activity ${id}`,
    timing: { status: 'ongoing', startedAt: at(12) },
  });

await test('manual revisions persist append-only with overlaps and optimistic concurrency', async () => {
  await withDatabase(async (database) => {
    await initializeSqlite(database, replayMigrations);
    const repository = new SqliteManualActivityRepository(database);
    const first = completed('first', 'decision-1', at(10), at(11));
    const second = completed('second', 'decision-2', at(10, 30), at(11, 30));

    await repository.saveInitial(first);
    const secondResult = await repository.saveInitial(second);
    assert.deepEqual(
      secondResult.overlappingActivityIds.map(({ value }) => value),
      ['first'],
    );

    const revised = first.revise({
      decisionId: decisionId('decision-3'),
      recordedAt: at(12),
      title: 'Corrected first',
      timing: first.timing,
    });
    assert.equal(
      (await repository.appendRevision(revised, first.decisionId)).status,
      'saved',
    );
    assert.equal(
      (
        await repository.appendRevision(
          revised.revise({
            decisionId: decisionId('decision-4'),
            recordedAt: at(13),
            title: 'Stale edit',
            timing: revised.timing,
          }),
          first.decisionId,
        )
      ).status,
      'conflict',
    );

    const restored = await repository.getById(first.id);
    assert.ok(restored);
    assert.equal(restored.revision, 2);
    assert.equal(restored.title, 'Corrected first');
    const revisions = await database.select<{ title: string }>(
      `SELECT title FROM manual_activity_revisions
       WHERE activity_id = $1 ORDER BY revision;`,
      [first.id.value],
    );
    assert.deepEqual(
      revisions.map(({ title }) => title),
      ['Activity first', 'Corrected first'],
    );
  });
});

await test('only one ongoing activity exists and stopping retains its start revision', async () => {
  await withDatabase(async (database) => {
    await initializeSqlite(database, replayMigrations);
    const repository = new SqliteManualActivityRepository(database);
    const first = ongoing('timer-1', 'decision-timer-1');
    const second = ongoing('timer-2', 'decision-timer-2');
    assert.equal((await repository.startIfNone(first)).status, 'saved');
    const rejected = await repository.startIfNone(second);
    assert.equal(rejected.status, 'ongoing_exists');

    const stopped = first.stop(decisionId('decision-stop'), at(13), at(13));
    assert.equal(
      (await repository.appendRevision(stopped, first.decisionId)).status,
      'saved',
    );
    assert.equal((await repository.startIfNone(second)).status, 'saved');
    const count = await database.select<{ count: number }>(
      `SELECT COUNT(*) AS count FROM manual_activity_revisions
       WHERE activity_id = $1;`,
      [first.id.value],
    );
    assert.equal(count[0]?.count, 2);
  });
});

await test('failed multi-step manual write rolls back and preserves its head', async () => {
  await withDatabase(async (database) => {
    await initializeSqlite(database, replayMigrations);
    const repository = new SqliteManualActivityRepository(database);
    const original = completed('atomic', 'decision-atomic', at(9), at(10));
    await repository.saveInitial(original);
    const invalid = original.revise({
      decisionId: original.decisionId,
      recordedAt: at(11),
      title: 'Must roll back',
      timing: original.timing,
    });

    await assert.rejects(
      repository.appendRevision(invalid, original.decisionId),
    );
    const restored = await repository.getById(original.id);
    assert.ok(restored);
    assert.equal(restored.revision, 1);
    assert.equal(restored.title, 'Activity atomic');
  });
});

await test('confirmation and validated settings persist their latest state', async () => {
  await withDatabase(async (database) => {
    await initializeSqlite(database, replayMigrations);
    const reviews = new SqliteReviewStateRepository(database);
    const settings = new SqliteLocalSettingsRepository(database);
    const targetId = Identifier.fromString<'ReviewTarget'>('session-1');
    const first: ReviewConfirmation = {
      decisionId: decisionId('review-1'),
      targetId,
      confirmed: false,
      decidedAt: at(10),
    };
    const latest: ReviewConfirmation = {
      decisionId: decisionId('review-2'),
      targetId,
      confirmed: true,
      decidedAt: at(11),
    };
    await reviews.append(first);
    await reviews.append(latest);
    assert.deepEqual(await reviews.getLatest(targetId), latest);

    const expected = LocalSettings.create({
      captureEnabled: false,
      timeZone: 'America/Sao_Paulo',
      dayBoundaryMinutes: 240,
      retentionDays: 90,
    });
    await settings.save(expected);
    assert.deepEqual(
      await new SqliteLocalSettingsRepository(database).load(),
      expected,
    );
    assert.throws(() =>
      LocalSettings.create({
        captureEnabled: true,
        timeZone: '../invalid',
        dayBoundaryMinutes: 0,
        retentionDays: 30,
      }),
    );
  });
});

await test('review writes leave raw events unchanged and corruption is actionable', async () => {
  await withDatabase(async (database) => {
    await initializeSqlite(database, replayMigrations);
    const rawPayload = '{"bundleId":"com.example.editor"}';
    await database.execute(
      `INSERT INTO observed_events (
        observation_id, event_id, occurred_at, observed_at, kind,
        payload_version, payload_json
      ) VALUES ($1, $2, $3, $4, $5, $6, $7);`,
      [
        'observation-raw',
        'event-raw',
        at(10).toISOString(),
        at(10).toISOString(),
        'active_application',
        1,
        rawPayload,
      ],
    );
    await new SqliteLocalSettingsRepository(database).save(
      LocalSettings.create({
        captureEnabled: true,
        timeZone: 'UTC',
        dayBoundaryMinutes: 0,
        retentionDays: 30,
      }),
    );
    const rows = await database.select<{ payload_json: string }>(
      'SELECT payload_json FROM observed_events WHERE event_id = $1;',
      ['event-raw'],
    );
    assert.equal(rows[0]?.payload_json, rawPayload);

    await database.execute(
      `UPDATE local_settings SET time_zone = $1 WHERE singleton_id = 1;`,
      ['not a timezone'],
    );
    await assert.rejects(
      new SqliteLocalSettingsRepository(database).load(),
      (error: unknown) =>
        error instanceof StorageCorruptionError &&
        error.recoveryGuidance.includes('back up the database file'),
    );
  });
});
