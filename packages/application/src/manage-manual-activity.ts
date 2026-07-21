import {
  DomainValidationError,
  ManualActivity,
  TimeRange,
  type ManualActivityFields,
  type ManualActivityId,
  type ManualActivityTiming,
  type UtcInstant,
} from '@replay/domain';

import { ApplicationError } from './application-error.js';
import type {
  ClockPort,
  ManualActivityIdGeneratorPort,
  ManualActivityRepositoryPort,
} from './ports.js';

export interface ManageManualActivityDependencies {
  readonly clock: ClockPort;
  readonly idGenerator: ManualActivityIdGeneratorPort;
  readonly repository: ManualActivityRepositoryPort;
}

export interface CompletedManualActivityInput extends ManualActivityFields {
  readonly start: UtcInstant;
  readonly end: UtcInstant;
}

export interface OngoingManualActivityInput extends ManualActivityFields {
  readonly startedAt?: UtcInstant;
}

export interface EditManualActivityInput extends ManualActivityFields {
  readonly timing: ManualActivityTiming;
}

export type ManualActivityResult = Readonly<{
  activity: ManualActivity;
  overlappingActivityIds: readonly ManualActivityId[];
}>;

export class ManageManualActivity {
  public constructor(
    private readonly dependencies: ManageManualActivityDependencies,
  ) {}

  public async createCompleted(
    input: CompletedManualActivityInput,
  ): Promise<ManualActivityResult> {
    try {
      return await this.createAndSave(
        input,
        {
          status: 'completed',
          range: TimeRange.between(input.start, input.end),
        },
        false,
      );
    } catch (error: unknown) {
      throw this.mapError(error);
    }
  }

  public async start(
    input: OngoingManualActivityInput,
  ): Promise<ManualActivityResult> {
    return this.createAndSave(
      input,
      {
        status: 'ongoing',
        startedAt: input.startedAt ?? this.dependencies.clock.now(),
      },
      true,
    );
  }

  public async stop(
    id: ManualActivityId,
    stoppedAt: UtcInstant = this.dependencies.clock.now(),
  ): Promise<ManualActivityResult> {
    return this.reviseExisting(id, (current) =>
      current.stop(
        this.dependencies.idGenerator.nextDecisionId(),
        stoppedAt,
        this.dependencies.clock.now(),
      ),
    );
  }

  public async edit(
    id: ManualActivityId,
    input: EditManualActivityInput,
  ): Promise<ManualActivityResult> {
    return this.reviseExisting(id, (current) =>
      current.revise({
        ...input,
        decisionId: this.dependencies.idGenerator.nextDecisionId(),
        recordedAt: this.dependencies.clock.now(),
      }),
    );
  }

  private async createAndSave(
    fields: ManualActivityFields,
    timing: ManualActivityTiming,
    ongoing: boolean,
  ): Promise<ManualActivityResult> {
    try {
      const activity = ManualActivity.create(
        this.dependencies.idGenerator.nextActivityId(),
        {
          ...fields,
          decisionId: this.dependencies.idGenerator.nextDecisionId(),
          recordedAt: this.dependencies.clock.now(),
          timing,
        },
      );
      const result = ongoing
        ? await this.dependencies.repository.startIfNone(activity)
        : await this.dependencies.repository.saveInitial(activity);
      if (result.status === 'ongoing_exists') {
        throw new ApplicationError('ongoing_manual_activity_exists');
      }
      return {
        activity,
        overlappingActivityIds: result.overlappingActivityIds,
      };
    } catch (error: unknown) {
      throw this.mapError(error);
    }
  }

  private async reviseExisting(
    id: ManualActivityId,
    revise: (current: ManualActivity) => ManualActivity,
  ): Promise<ManualActivityResult> {
    try {
      const current = await this.dependencies.repository.getById(id);
      if (current === null) {
        throw new ApplicationError('manual_activity_not_found');
      }
      const activity = revise(current);
      const result = await this.dependencies.repository.appendRevision(
        activity,
        current.decisionId,
      );
      if (result.status === 'conflict') {
        throw new ApplicationError('manual_activity_conflict');
      }
      return {
        activity,
        overlappingActivityIds: result.overlappingActivityIds,
      };
    } catch (error: unknown) {
      throw this.mapError(error);
    }
  }

  private mapError(error: unknown): ApplicationError {
    if (error instanceof ApplicationError) {
      return error;
    }
    if (error instanceof DomainValidationError) {
      return new ApplicationError('invalid_manual_activity');
    }
    return new ApplicationError('repository_unavailable');
  }
}
