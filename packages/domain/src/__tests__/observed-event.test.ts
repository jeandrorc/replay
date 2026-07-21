import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DomainValidationError,
  Identifier,
  ObservedEvent,
  TimeRange,
  UtcInstant,
  type ObservedEventEnvelope,
} from '../index.js';

const occurredAt = UtcInstant.parse('2026-07-21T12:00:00.000Z');
const observedAt = UtcInstant.parse('2026-07-21T12:00:01.000Z');
const envelope: ObservedEventEnvelope = {
  id: Identifier.fromString<'ObservedEvent'>('event-1'),
  occurredAt,
  observedAt,
  payloadVersion: 1,
};

await test('derives source and privacy for every initial observed kind', () => {
  const range = TimeRange.between(
    occurredAt,
    UtcInstant.parse('2026-07-21T12:30:00.000Z'),
  );
  const events = [
    ObservedEvent.activeApplication(envelope, 'com.todesktop.230313mzl4w4u92'),
    ObservedEvent.gitContext(
      envelope,
      Identifier.fromString<'Repository'>('replay'),
      { branchName: 'main', headId: 'abc123' },
    ),
    ObservedEvent.systemState(envelope, 'idle'),
    ObservedEvent.systemState(envelope, 'resumed'),
    ObservedEvent.captureState(envelope, 'capture_paused'),
    ObservedEvent.captureState(envelope, 'capture_resumed'),
    ObservedEvent.manualActivity(envelope, {
      title: 'Pairing session',
      range,
      category: 'meeting',
      ticketReference: 'DOM-002',
    }),
  ];

  assert.deepEqual(
    events.map((event) => event.kind),
    [
      'active_application',
      'git_context',
      'idle',
      'resumed',
      'capture_paused',
      'capture_resumed',
      'manual_activity',
    ],
  );
  assert.equal(
    events.every((event) => Object.isFrozen(event)),
    true,
  );
  assert.equal(
    events.every((event) => Object.isFrozen(event.payload)),
    true,
  );
  assert.equal(events[0]?.source, 'active_application_collector');
  assert.equal(events[6]?.privacyClass, 'user_authored');
});

await test('keeps occurrence and observation distinct and ordered', () => {
  const event = ObservedEvent.systemState(envelope, 'idle');

  assert.equal(event.occurredAt.equals(occurredAt), true);
  assert.equal(event.observedAt.equals(observedAt), true);
  assert.throws(
    () =>
      ObservedEvent.systemState(
        { ...envelope, occurredAt: observedAt, observedAt: occurredAt },
        'idle',
      ),
    (error: unknown) =>
      error instanceof DomainValidationError &&
      error.code === 'event.observed_before_occurrence',
  );
});

await test('rejects invalid payload versions and metadata', () => {
  assert.throws(
    () => ObservedEvent.systemState({ ...envelope, payloadVersion: 0 }, 'idle'),
    (error: unknown) =>
      error instanceof DomainValidationError &&
      error.code === 'event.version.invalid',
  );
  assert.throws(
    () => ObservedEvent.activeApplication(envelope, ' window title\n'),
    (error: unknown) =>
      error instanceof DomainValidationError &&
      error.code === 'event.text.invalid',
  );
});

await test('quarantines unknown evidence without retaining arbitrary payload', () => {
  const digest = 'a'.repeat(64);
  const event = ObservedEvent.opaque(envelope, 'future_event', digest);

  assert.deepEqual(event.payload, {
    kind: 'opaque',
    originalKind: 'future_event',
    payloadDigest: digest,
  });
  assert.equal(event.source, 'quarantined_storage');
  assert.equal('rawPayload' in event.payload, false);
  assert.throws(() => ObservedEvent.opaque(envelope, 'Future Event', digest));
  assert.throws(() =>
    ObservedEvent.opaque(envelope, 'future_event', 'not-a-digest'),
  );
});
