import assert from 'node:assert/strict';
import test from 'node:test';

import { DomainValidationError, TimeRange, UtcInstant } from '../index.js';

const instant = (value: string): UtcInstant => UtcInstant.parse(value);

await test('rejects zero and negative durations with typed errors', () => {
  const start = instant('2026-07-21T12:00:00.000Z');

  assert.throws(
    () => TimeRange.between(start, start),
    (error: unknown) =>
      error instanceof DomainValidationError &&
      error.code === 'time.range.empty',
  );
  assert.throws(
    () => TimeRange.between(start, instant('2026-07-21T11:59:59.999Z')),
    (error: unknown) =>
      error instanceof DomainValidationError &&
      error.code === 'time.range.negative',
  );
});

await test('uses half-open containment and overlap boundaries', () => {
  const range = TimeRange.between(
    instant('2026-07-21T12:00:00.000Z'),
    instant('2026-07-21T13:00:00.000Z'),
  );
  const adjacent = TimeRange.between(
    instant('2026-07-21T13:00:00.000Z'),
    instant('2026-07-21T14:00:00.000Z'),
  );

  assert.equal(range.contains(range.start), true);
  assert.equal(range.contains(range.end), false);
  assert.equal(range.overlaps(adjacent), false);
  assert.equal(range.durationMilliseconds, 3_600_000);
  assert.equal(Object.isFrozen(range), true);
});

await test('preserves equality and duration across UTC midnight', () => {
  const range = TimeRange.between(
    instant('2026-07-21T23:30:00.000Z'),
    instant('2026-07-22T00:30:00.000Z'),
  );
  const equal = TimeRange.between(
    UtcInstant.fromEpochMilliseconds(range.start.epochMilliseconds),
    UtcInstant.fromEpochMilliseconds(range.end.epochMilliseconds),
  );

  assert.equal(range.durationMilliseconds, 3_600_000);
  assert.equal(range.equals(equal), true);
});

await test('keeps elapsed time deterministic across a DST display boundary', () => {
  const springForward = TimeRange.between(
    instant('2026-03-08T06:30:00.000Z'),
    instant('2026-03-08T07:30:00.000Z'),
  );

  assert.equal(springForward.durationMilliseconds, 3_600_000);
  assert.equal(springForward.start.toISOString(), '2026-03-08T06:30:00.000Z');
  assert.equal(springForward.end.toISOString(), '2026-03-08T07:30:00.000Z');
});
