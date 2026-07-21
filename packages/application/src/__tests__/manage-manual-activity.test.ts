import assert from 'node:assert/strict';
import test from 'node:test';

import {
  Identifier,
  UtcInstant,
  type ManualActivity,
  type ManualActivityId,
  type UserDecisionId,
} from '@replay/domain';

import {
  ApplicationError,
  ManageManualActivity,
  type ManualActivityRepositoryPort,
  type ReviseManualActivityResult,
  type SaveManualActivityResult,
  type StartManualActivityResult,
} from '../index.js';

class MemoryManualRepository implements ManualActivityRepositoryPort {
  public readonly revisions: ManualActivity[] = [];
  public overlaps: readonly ManualActivityId[] = [];

  public getById(id: ManualActivityId): Promise<ManualActivity | null> {
    return Promise.resolve(
      [...this.revisions].reverse().find((item) => item.id.equals(id)) ?? null,
    );
  }

  public saveInitial(
    activity: ManualActivity,
  ): Promise<SaveManualActivityResult> {
    this.revisions.push(activity);
    return Promise.resolve({
      status: 'saved',
      overlappingActivityIds: this.overlaps,
    });
  }

  public startIfNone(
    activity: ManualActivity,
  ): Promise<StartManualActivityResult> {
    const existing = [...this.revisions]
      .reverse()
      .find((item) => item.timing.status === 'ongoing');
    if (existing !== undefined) {
      return Promise.resolve({ status: 'ongoing_exists', existing });
    }
    return this.saveInitial(activity);
  }

  public appendRevision(
    activity: ManualActivity,
    expectedDecisionId: UserDecisionId,
  ): Promise<ReviseManualActivityResult> {
    const current = [...this.revisions]
      .reverse()
      .find((item) => item.id.equals(activity.id));
    if (current?.decisionId.equals(expectedDecisionId) !== true) {
      return Promise.resolve({ status: 'conflict' });
    }
    this.revisions.push(activity);
    return Promise.resolve({
      status: 'saved',
      overlappingActivityIds: this.overlaps,
    });
  }
}

const now = UtcInstant.parse('2026-07-21T12:00:00.000Z');

function service(
  repository: ManualActivityRepositoryPort,
): ManageManualActivity {
  let activitySequence = 0;
  let decisionSequence = 0;
  return new ManageManualActivity({
    clock: { now: () => now },
    idGenerator: {
      nextActivityId: () => {
        activitySequence += 1;
        return Identifier.fromString<'ManualActivity'>(
          `activity-${String(activitySequence)}`,
        );
      },
      nextDecisionId: () => {
        decisionSequence += 1;
        return Identifier.fromString<'UserDecision'>(
          `decision-${String(decisionSequence)}`,
        );
      },
    },
    repository,
  });
}

await test('creates completed activity and surfaces overlaps', async () => {
  const repository = new MemoryManualRepository();
  repository.overlaps = [Identifier.fromString<'ManualActivity'>('overlap-1')];
  const result = await service(repository).createCompleted({
    title: 'Pairing',
    category: 'meeting',
    start: UtcInstant.parse('2026-07-21T10:00:00.000Z'),
    end: UtcInstant.parse('2026-07-21T10:30:00.000Z'),
  });

  assert.equal(result.activity.timing.status, 'completed');
  assert.equal(result.overlappingActivityIds[0]?.value, 'overlap-1');
  assert.equal(repository.revisions.length, 1);
});

await test('starts and stops through append-only revisions', async () => {
  const repository = new MemoryManualRepository();
  const manager = service(repository);
  const started = await manager.start({ title: 'Investigation' });
  const stopped = await manager.stop(
    started.activity.id,
    UtcInstant.parse('2026-07-21T12:30:00.000Z'),
  );

  assert.equal(started.activity.timing.status, 'ongoing');
  assert.equal(stopped.activity.timing.status, 'completed');
  assert.equal(repository.revisions.length, 2);
  assert.equal(repository.revisions[0]?.timing.status, 'ongoing');
});

await test('rejects a second ongoing activity and invalid title', async () => {
  const manager = service(new MemoryManualRepository());
  await manager.start({ title: 'First' });
  await assert.rejects(
    manager.start({ title: 'Second' }),
    (error: unknown) =>
      error instanceof ApplicationError &&
      error.code === 'ongoing_manual_activity_exists',
  );
  await assert.rejects(
    service(new MemoryManualRepository()).start({ title: ' ' }),
    (error: unknown) =>
      error instanceof ApplicationError &&
      error.code === 'invalid_manual_activity',
  );
  await assert.rejects(
    service(new MemoryManualRepository()).createCompleted({
      title: 'Invalid range',
      start: now,
      end: now,
    }),
    (error: unknown) =>
      error instanceof ApplicationError &&
      error.code === 'invalid_manual_activity',
  );
});

await test('editing appends a decision and preserves the original revision', async () => {
  const repository = new MemoryManualRepository();
  const manager = service(repository);
  const original = await manager.createCompleted({
    title: 'Original',
    start: UtcInstant.parse('2026-07-21T10:00:00.000Z'),
    end: UtcInstant.parse('2026-07-21T10:30:00.000Z'),
  });
  const edited = await manager.edit(original.activity.id, {
    title: 'Corrected',
    timing: original.activity.timing,
  });

  assert.equal(repository.revisions[0]?.title, 'Original');
  assert.equal(edited.activity.title, 'Corrected');
  assert.equal(
    edited.activity.supersedesDecisionId?.equals(original.activity.decisionId),
    true,
  );
});
