import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DomainValidationError,
  Identifier,
  ManualActivity,
  TimeRange,
  UtcInstant,
} from '../index.js';

const instant = (value: string): UtcInstant => UtcInstant.parse(value);
const activityId = Identifier.fromString<'ManualActivity'>('activity-1');
const decision = (value: string) =>
  Identifier.fromString<'UserDecision'>(value);

await test('creates immutable completed and ongoing activities', () => {
  const completed = ManualActivity.create(activityId, {
    decisionId: decision('decision-1'),
    recordedAt: instant('2026-07-21T11:00:00.000Z'),
    title: 'Pairing',
    category: 'meeting',
    timing: {
      status: 'completed',
      range: TimeRange.between(
        instant('2026-07-21T10:00:00.000Z'),
        instant('2026-07-21T10:30:00.000Z'),
      ),
    },
  });
  const ongoing = ManualActivity.create(activityId, {
    decisionId: decision('decision-2'),
    recordedAt: instant('2026-07-21T12:00:00.000Z'),
    title: 'Investigation',
    timing: {
      status: 'ongoing',
      startedAt: instant('2026-07-21T12:00:00.000Z'),
    },
  });

  assert.equal(completed.timing.status, 'completed');
  assert.equal(ongoing.timing.status, 'ongoing');
  assert.equal(Object.isFrozen(completed), true);
  assert.equal(Object.isFrozen(completed.timing), true);
});

await test('stopping creates a traceable revision without mutating the start', () => {
  const original = ManualActivity.create(activityId, {
    decisionId: decision('decision-1'),
    recordedAt: instant('2026-07-21T12:00:00.000Z'),
    title: 'Investigation',
    timing: {
      status: 'ongoing',
      startedAt: instant('2026-07-21T12:00:00.000Z'),
    },
  });
  const stopped = original.stop(
    decision('decision-2'),
    instant('2026-07-21T12:30:00.000Z'),
    instant('2026-07-21T12:31:00.000Z'),
  );

  assert.equal(original.timing.status, 'ongoing');
  assert.equal(stopped.timing.status, 'completed');
  assert.equal(stopped.revision, 2);
  assert.equal(stopped.supersedesDecisionId?.equals(original.decisionId), true);
});

await test('requires a valid title and rejects stopping completed activity', () => {
  assert.throws(
    () =>
      ManualActivity.create(activityId, {
        decisionId: decision('decision-1'),
        recordedAt: instant('2026-07-21T12:00:00.000Z'),
        title: ' ',
        timing: {
          status: 'ongoing',
          startedAt: instant('2026-07-21T12:00:00.000Z'),
        },
      }),
    (error: unknown) =>
      error instanceof DomainValidationError &&
      error.code === 'manual_activity.invalid_title',
  );

  const completed = ManualActivity.create(activityId, {
    decisionId: decision('decision-2'),
    recordedAt: instant('2026-07-21T12:00:00.000Z'),
    title: 'Pairing',
    timing: {
      status: 'completed',
      range: TimeRange.between(
        instant('2026-07-21T11:00:00.000Z'),
        instant('2026-07-21T11:30:00.000Z'),
      ),
    },
  });

  assert.throws(
    () =>
      completed.stop(
        decision('decision-3'),
        instant('2026-07-21T12:30:00.000Z'),
        instant('2026-07-21T12:31:00.000Z'),
      ),
    (error: unknown) =>
      error instanceof DomainValidationError &&
      error.code === 'manual_activity.not_ongoing',
  );
});
