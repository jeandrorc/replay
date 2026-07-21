import type {
  Identifier,
  ObservedEvent,
  ObservedEventId,
  UtcInstant,
} from '@replay/domain';

export type ObservationId = Identifier<'Observation'>;

export interface ClockPort {
  now(): UtcInstant;
}

export interface ObservedEventIdGeneratorPort {
  next(): ObservedEventId;
}

export interface RecordedObservation {
  readonly observationId: ObservationId;
  readonly event: ObservedEvent;
}

export type SaveObservationResult =
  | Readonly<{ status: 'saved' }>
  | Readonly<{ status: 'duplicate'; existing: ObservedEvent }>;

export interface ObservedEventRepositoryPort {
  saveIfAbsent(
    observation: RecordedObservation,
  ): Promise<SaveObservationResult>;
}
