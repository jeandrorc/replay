import {
  DomainValidationError,
  ObservedEvent,
  type RepositoryId,
  type UtcInstant,
} from '@replay/domain';

import { ApplicationError } from './application-error.js';
import type {
  ClockPort,
  ObservationId,
  ObservedEventIdGeneratorPort,
  ObservedEventRepositoryPort,
} from './ports.js';

interface CapturedInputBase {
  readonly observationId: ObservationId;
  readonly occurredAt: UtcInstant;
  readonly payloadVersion: number;
}

export type CapturedEventInput =
  | (CapturedInputBase &
      Readonly<{ kind: 'active_application'; bundleId: string }>)
  | (CapturedInputBase &
      Readonly<{
        kind: 'git_context';
        repositoryId: RepositoryId;
        branchName?: string;
        headId?: string;
      }>)
  | (CapturedInputBase & Readonly<{ kind: 'idle' | 'resumed' }>)
  | (CapturedInputBase &
      Readonly<{ kind: 'capture_paused' | 'capture_resumed' }>);

export type RecordCapturedEventResult = Readonly<{
  status: 'recorded' | 'duplicate';
  event: ObservedEvent;
}>;

export interface RecordCapturedEventDependencies {
  readonly clock: ClockPort;
  readonly idGenerator: ObservedEventIdGeneratorPort;
  readonly repository: ObservedEventRepositoryPort;
}

function buildEvent(
  input: CapturedEventInput,
  dependencies: Pick<RecordCapturedEventDependencies, 'clock' | 'idGenerator'>,
): ObservedEvent {
  const envelope = {
    id: dependencies.idGenerator.next(),
    occurredAt: input.occurredAt,
    observedAt: dependencies.clock.now(),
    payloadVersion: input.payloadVersion,
  };

  switch (input.kind) {
    case 'active_application':
      return ObservedEvent.activeApplication(envelope, input.bundleId);
    case 'git_context':
      return ObservedEvent.gitContext(envelope, input.repositoryId, {
        ...(input.branchName === undefined
          ? {}
          : { branchName: input.branchName }),
        ...(input.headId === undefined ? {} : { headId: input.headId }),
      });
    case 'idle':
    case 'resumed':
      return ObservedEvent.systemState(envelope, input.kind);
    case 'capture_paused':
    case 'capture_resumed':
      return ObservedEvent.captureState(envelope, input.kind);
  }
}

export class RecordCapturedEvent {
  public constructor(
    private readonly dependencies: RecordCapturedEventDependencies,
  ) {}

  public async execute(
    input: CapturedEventInput,
  ): Promise<RecordCapturedEventResult> {
    let event: ObservedEvent;
    try {
      event = buildEvent(input, this.dependencies);
    } catch (error: unknown) {
      if (error instanceof DomainValidationError) {
        throw new ApplicationError('invalid_collector_input');
      }
      throw error;
    }

    try {
      const result = await this.dependencies.repository.saveIfAbsent({
        observationId: input.observationId,
        event,
      });
      return result.status === 'duplicate'
        ? { status: 'duplicate', event: result.existing }
        : { status: 'recorded', event };
    } catch {
      throw new ApplicationError('repository_unavailable');
    }
  }
}
