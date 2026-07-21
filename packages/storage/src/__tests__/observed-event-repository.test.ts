import assert from 'node:assert/strict';
import test from 'node:test';

import {
  Identifier,
  ObservedEvent,
  TimeRange,
  UtcInstant,
} from '@replay/domain';
import type {
  ObservedEventRepositoryPort,
  RecordedObservation,
  SaveObservationResult,
} from '@replay/application';

import {
  initializeSqlite,
  replayMigrations,
  SqliteObservedEventRepository,
} from '../index.js';
import {
  createTemporaryDatabase,
  withDatabase,
} from './node-sqlite-database.js';

interface RepositoryHarness {
  readonly repository: ObservedEventRepositoryPort;
  close(): Promise<void>;
}

class MemoryObservedEventRepository implements ObservedEventRepositoryPort {
  readonly #observations = new Map<string, RecordedObservation>();

  public saveIfAbsent(
    observation: RecordedObservation,
  ): Promise<SaveObservationResult> {
    const existing = this.#observations.get(observation.observationId.value);
    if (existing !== undefined) {
      return Promise.resolve({ status: 'duplicate', existing: existing.event });
    }
    this.#observations.set(observation.observationId.value, observation);
    return Promise.resolve({ status: 'saved' });
  }

  public findOccurredIn(
    range: TimeRange,
    limit: number,
  ): Promise<ObservedEvent[]> {
    return Promise.resolve(
      [...this.#observations.values()]
        .map(({ event }) => event)
        .filter(({ occurredAt }) => range.contains(occurredAt))
        .sort(
          (left, right) =>
            left.occurredAt.compare(right.occurredAt) ||
            left.id.value.localeCompare(right.id.value),
        )
        .slice(0, limit),
    );
  }
}

const instant = (hour: number): UtcInstant =>
  UtcInstant.parse(`2026-07-21T${String(hour).padStart(2, '0')}:00:00.000Z`);

const observation = (
  suffix: string,
  event: ObservedEvent,
): RecordedObservation => ({
  observationId: Identifier.fromString<'Observation'>(`observation-${suffix}`),
  event,
});

const event = (
  suffix: string,
  occurredAt: UtcInstant,
  payloadVersion = 1,
): ObservedEvent =>
  ObservedEvent.gitContext(
    {
      id: Identifier.fromString<'ObservedEvent'>(`event-${suffix}`),
      occurredAt,
      observedAt: occurredAt,
      payloadVersion,
    },
    Identifier.fromString<'Repository'>('replay'),
    { branchName: 'codex/sto-002', headId: 'abc123' },
  );

const runRepositoryContract = (
  implementation: string,
  createHarness: () => Promise<RepositoryHarness>,
): void => {
  void test(`${implementation}: first observation wins idempotently`, async () => {
    const harness = await createHarness();
    try {
      const first = event('first', instant(10), 7);
      const replacement = event('replacement', instant(11));
      assert.deepEqual(
        await harness.repository.saveIfAbsent(observation('same', first)),
        { status: 'saved' },
      );
      const duplicate = await harness.repository.saveIfAbsent(
        observation('same', replacement),
      );
      assert.equal(duplicate.status, 'duplicate');
      assert.equal(duplicate.existing.id.equals(first.id), true);
      assert.equal(duplicate.existing.payloadVersion, 7);
      assert.deepEqual(duplicate.existing.payload, first.payload);
    } finally {
      await harness.close();
    }
  });

  void test(`${implementation}: UTC range is half-open, ordered, and limited`, async () => {
    const harness = await createHarness();
    try {
      for (const [suffix, hour] of [
        ['before', 9],
        ['start-b', 10],
        ['start-a', 10],
        ['middle', 11],
        ['end', 12],
      ] as const) {
        await harness.repository.saveIfAbsent(
          observation(suffix, event(suffix, instant(hour))),
        );
      }
      const found = await harness.repository.findOccurredIn(
        TimeRange.between(instant(10), instant(12)),
        2,
      );
      assert.deepEqual(
        found.map(({ id }) => id.value),
        ['event-start-a', 'event-start-b'],
      );
    } finally {
      await harness.close();
    }
  });
};

runRepositoryContract('memory repository', () =>
  Promise.resolve({
    repository: new MemoryObservedEventRepository(),
    close: () => Promise.resolve(),
  }),
);

runRepositoryContract('SQLite repository', async () => {
  const temporary = await createTemporaryDatabase();
  await initializeSqlite(temporary.database, replayMigrations);
  return {
    repository: new SqliteObservedEventRepository(temporary.database),
    close: () => temporary.close(),
  };
});

await test('SQLite preserves unknown raw payload while returning quarantine metadata', async () => {
  await withDatabase(async (database) => {
    await initializeSqlite(database, replayMigrations);
    const rawPayload = '{"futureField":"preserve exactly"}';
    await database.execute(
      `INSERT INTO observed_events (
        observation_id, event_id, occurred_at, observed_at, kind,
        payload_version, payload_json
      ) VALUES ($1, $2, $3, $4, $5, $6, $7);`,
      [
        'observation-unknown',
        'event-unknown',
        instant(10).toISOString(),
        instant(10).toISOString(),
        'future_event',
        9,
        rawPayload,
      ],
    );
    const repository = new SqliteObservedEventRepository(database);
    const [unknown] = await repository.findOccurredIn(
      TimeRange.between(instant(9), instant(11)),
      10,
    );
    assert.ok(unknown);
    assert.equal(unknown.kind, 'opaque');
    assert.equal(unknown.payloadVersion, 9);
    assert.equal(unknown.payload.kind, 'opaque');

    const rows = await database.select<{ payload_json: string }>(
      'SELECT payload_json FROM observed_events WHERE event_id = $1;',
      ['event-unknown'],
    );
    assert.equal(rows[0]?.payload_json, rawPayload);
  });
});

await test('SQLite round-trips every known payload kind and version', async () => {
  await withDatabase(async (database) => {
    await initializeSqlite(database, replayMigrations);
    const repository = new SqliteObservedEventRepository(database);
    const envelope = (
      suffix: string,
    ): Parameters<typeof ObservedEvent.activeApplication>[0] => ({
      id: Identifier.fromString<'ObservedEvent'>(`event-${suffix}`),
      occurredAt: instant(10),
      observedAt: instant(10),
      payloadVersion: 4,
    });
    const events = [
      ObservedEvent.activeApplication(envelope('1-app'), 'com.example.editor'),
      ObservedEvent.gitContext(
        envelope('2-git'),
        Identifier.fromString<'Repository'>('replay'),
        { branchName: 'main', headId: 'deadbeef' },
      ),
      ObservedEvent.systemState(envelope('3-idle'), 'idle'),
      ObservedEvent.systemState(envelope('4-resumed'), 'resumed'),
      ObservedEvent.captureState(envelope('5-paused'), 'capture_paused'),
      ObservedEvent.captureState(envelope('6-resumed'), 'capture_resumed'),
      ObservedEvent.manualActivity(envelope('7-manual'), {
        title: 'Pairing',
        range: TimeRange.between(instant(10), instant(11)),
        category: 'meeting',
        ticketReference: 'STO-002',
      }),
    ];

    for (const knownEvent of events) {
      await repository.saveIfAbsent(
        observation(knownEvent.id.value, knownEvent),
      );
    }
    const restored = await repository.findOccurredIn(
      TimeRange.between(instant(9), instant(11)),
      100,
    );

    assert.deepEqual(
      restored.map(({ payload }) => payload),
      events.map(({ payload }) => payload),
    );
    assert.deepEqual(
      restored.map(({ payloadVersion }) => payloadVersion),
      events.map(({ payloadVersion }) => payloadVersion),
    );
  });
});

await test('SQLite daily query uses the occurrence index', async () => {
  await withDatabase(async (database) => {
    await initializeSqlite(database, replayMigrations);
    const plan = await database.select<{ detail: string }>(
      `EXPLAIN QUERY PLAN
       SELECT event_id FROM observed_events
       WHERE occurred_at >= $1 AND occurred_at < $2
       ORDER BY occurred_at, event_id LIMIT $3;`,
      [instant(10).toISOString(), instant(12).toISOString(), 100],
    );
    assert.equal(
      plan.some(({ detail }) =>
        detail.includes('observed_events_occurred_at_event_id'),
      ),
      true,
    );
  });
});
