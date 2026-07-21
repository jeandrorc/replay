import assert from 'node:assert/strict';
import test from 'node:test';

import { DomainValidationError, Identifier } from '../index.js';

type ObservedEventId = Identifier<'ObservedEvent'>;

await test('validates supplied identifiers without generating values', () => {
  const supplied = Identifier.fromString<'ObservedEvent'>('event_01J2ABC');
  const equal: ObservedEventId =
    Identifier.fromString<'ObservedEvent'>('event_01J2ABC');

  assert.equal(supplied.value, 'event_01J2ABC');
  assert.equal(supplied.toString(), 'event_01J2ABC');
  assert.equal(supplied.equals(equal), true);
  assert.equal(Object.isFrozen(supplied), true);
});

await test('rejects empty, padded, oversized, and control-character values', () => {
  const cases = [
    ['', 'identifier.empty'],
    [' padded', 'identifier.whitespace'],
    ['x'.repeat(129), 'identifier.too_long'],
    ['event\n1', 'identifier.control_character'],
  ] as const;

  for (const [value, code] of cases) {
    assert.throws(
      () => Identifier.fromString<'ObservedEvent'>(value),
      (error: unknown) =>
        error instanceof DomainValidationError && error.code === code,
    );
  }
});
