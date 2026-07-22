import type {
  Identifier,
  ManualActivity,
  ManualActivityId,
  ObservedEvent,
  ObservedEventId,
  TimeRange,
  UtcInstant,
  UserDecisionId,
} from '@replay/domain';

import type { LocalSettings } from './local-settings.js';

export type ObservationId = Identifier<'Observation'>;
export type ReviewTargetId = Identifier<'ReviewTarget'>;

export interface ReviewConfirmation {
  readonly decisionId: UserDecisionId;
  readonly targetId: ReviewTargetId;
  readonly confirmed: boolean;
  readonly decidedAt: UtcInstant;
}

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
  findOccurredIn(range: TimeRange, limit: number): Promise<ObservedEvent[]>;
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

export interface ReviewStateRepositoryPort {
  append(confirmation: ReviewConfirmation): Promise<void>;
  getLatest(targetId: ReviewTargetId): Promise<ReviewConfirmation | null>;
}

export interface LocalSettingsRepositoryPort {
  save(settings: LocalSettings): Promise<void>;
  load(): Promise<LocalSettings | null>;
}
