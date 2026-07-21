import assert from 'node:assert/strict';
import test from 'node:test';

import { DomainValidationError, UtcInstant } from '../index.js';

await test('parses and serializes a canonical UTC instant without loss', () => {
  const instant = UtcInstant.parse('2026-07-21T12:34:56.789Z');

  assert.equal(instant.toISOString(), '2026-07-21T12:34:56.789Z');
  assert.equal(
    UtcInstant.fromEpochMilliseconds(instant.epochMilliseconds).toISOString(),
    '2026-07-21T12:34:56.789Z',
  );
  assert.equal(Object.isFrozen(instant), true);
});

await test('rejects non-canonical, impossible, and non-integer instants', () => {
  for (const value of [
    '2026-07-21T12:34:56Z',
    '2026-07-21T09:34:56.000-03:00',
    '2026-02-30T12:00:00.000Z',
    'not-an-instant',
  ]) {
    assert.throws(
      () => UtcInstant.parse(value),
      (error: unknown) =>
        error instanceof DomainValidationError &&
        error.code === 'time.instant.invalid',
    );
  }

  assert.throws(() => UtcInstant.fromEpochMilliseconds(1.5));
  assert.throws(() => UtcInstant.fromEpochMilliseconds(Number.NaN));
});

await test('orders and compares structurally equal instants', () => {
  const earlier = UtcInstant.parse('2026-07-21T00:00:00.000Z');
  const equal = UtcInstant.fromEpochMilliseconds(earlier.epochMilliseconds);
  const later = UtcInstant.parse('2026-07-21T00:00:00.001Z');

  assert.equal(earlier.equals(equal), true);
  assert.equal(earlier.compare(equal), 0);
  assert.equal(earlier.compare(later), -1);
  assert.equal(later.compare(earlier), 1);
});
