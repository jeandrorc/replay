import assert from 'node:assert/strict';
import test from 'node:test';

import { Identifier, UtcInstant, type ObservedEventId } from '@replay/domain';

import {
  ApplicationError,
  RecordCapturedEvent,
  type ObservationId,
  type ObservedEventRepositoryPort,
  type RecordedObservation,
  type SaveObservationResult,
} from '../index.js';

const occurredAt = UtcInstant.parse('2026-07-21T12:00:00.000Z');
const observedAt = UtcInstant.parse('2026-07-21T12:00:01.000Z');

class InMemoryRepository implements ObservedEventRepositoryPort {
  public readonly observations: RecordedObservation[] = [];

  public saveIfAbsent(
    observation: RecordedObservation,
  ): Promise<SaveObservationResult> {
    const existing = this.observations.find((candidate) =>
      candidate.observationId.equals(observation.observationId),
    );
    if (existing !== undefined) {
      return Promise.resolve({ status: 'duplicate', existing: existing.event });
    }
    this.observations.push(observation);
    return Promise.resolve({ status: 'saved' });
  }
}

function observationId(value = 'observation-1'): ObservationId {
  return Identifier.fromString<'Observation'>(value);
}

function createUseCase(
  repository: ObservedEventRepositoryPort,
): RecordCapturedEvent {
  let nextId = 0;
  return new RecordCapturedEvent({
    clock: { now: () => observedAt },
    idGenerator: {
      next: (): ObservedEventId => {
        nextId += 1;
        return Identifier.fromString<'ObservedEvent'>(
          `event-${String(nextId)}`,
        );
      },
    },
    repository,
  });
}

await test('supplies accepted identity and observation time before saving', async () => {
  const repository = new InMemoryRepository();
  const result = await createUseCase(repository).execute({
    observationId: observationId(),
    occurredAt,
    payloadVersion: 1,
    kind: 'active_application',
    bundleId: 'com.example.editor',
  });

  assert.equal(result.status, 'recorded');
  assert.equal(result.event.id.value, 'event-1');
  assert.equal(result.event.observedAt.equals(observedAt), true);
  assert.equal(repository.observations.length, 1);
});

await test('returns the first fact for a duplicate observation ID', async () => {
  const repository = new InMemoryRepository();
  const useCase = createUseCase(repository);
  const input = {
    observationId: observationId(),
    occurredAt,
    payloadVersion: 1,
    kind: 'idle' as const,
  };

  const first = await useCase.execute(input);
  const duplicate = await useCase.execute(input);

  assert.equal(first.status, 'recorded');
  assert.equal(duplicate.status, 'duplicate');
  assert.equal(duplicate.event, first.event);
  assert.equal(repository.observations.length, 1);
});

await test('maps invalid collector input to a stable application error', async () => {
  const useCase = createUseCase(new InMemoryRepository());

  await assert.rejects(
    useCase.execute({
      observationId: observationId(),
      occurredAt,
      payloadVersion: 0,
      kind: 'active_application',
      bundleId: 'secret-window-title',
    }),
    (error: unknown) =>
      error instanceof ApplicationError &&
      error.code === 'invalid_collector_input' &&
      !error.message.includes('secret-window-title'),
  );
});

await test('redacts repository failures from the application error', async () => {
  const repository: ObservedEventRepositoryPort = {
    saveIfAbsent: (): Promise<SaveObservationResult> =>
      Promise.reject(new Error('sqlite failed for secret-window-title')),
  };

  await assert.rejects(
    createUseCase(repository).execute({
      observationId: observationId(),
      occurredAt,
      payloadVersion: 1,
      kind: 'active_application',
      bundleId: 'secret-window-title',
    }),
    (error: unknown) =>
      error instanceof ApplicationError &&
      error.code === 'repository_unavailable' &&
      !error.message.includes('secret-window-title') &&
      !error.message.includes('sqlite'),
  );
});
