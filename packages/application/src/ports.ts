import type {
  Identifier,
  ManualActivity,
  ManualActivityId,
  ObservedEvent,
  ObservedEventId,
  UtcInstant,
  UserDecisionId,
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

export interface ManualActivityIdGeneratorPort {
  nextActivityId(): ManualActivityId;
  nextDecisionId(): UserDecisionId;
}

export type SaveManualActivityResult = Readonly<{
  status: 'saved';
  overlappingActivityIds: readonly ManualActivityId[];
}>;

export type StartManualActivityResult =
  | SaveManualActivityResult
  | Readonly<{ status: 'ongoing_exists'; existing: ManualActivity }>;

export type ReviseManualActivityResult =
  | SaveManualActivityResult
  | Readonly<{ status: 'conflict' }>;

export interface ManualActivityRepositoryPort {
  getById(id: ManualActivityId): Promise<ManualActivity | null>;
  saveInitial(activity: ManualActivity): Promise<SaveManualActivityResult>;
  startIfNone(activity: ManualActivity): Promise<StartManualActivityResult>;
  appendRevision(
    activity: ManualActivity,
    expectedDecisionId: UserDecisionId,
  ): Promise<ReviseManualActivityResult>;
}
