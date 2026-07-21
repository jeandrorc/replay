import { DomainValidationError } from './domain-validation-error.js';
import type { Identifier } from './identifier.js';
import { TimeRange } from './time-range.js';
import type { UtcInstant } from './utc-instant.js';

export type ManualActivityId = Identifier<'ManualActivity'>;
export type UserDecisionId = Identifier<'UserDecision'>;

export type ManualActivityTiming =
  | Readonly<{ status: 'ongoing'; startedAt: UtcInstant }>
  | Readonly<{ status: 'completed'; range: TimeRange }>;

export interface ManualActivityFields {
  readonly title: string;
  readonly category?: string;
  readonly ticketReference?: string;
}

export interface ManualActivityRevisionInput extends ManualActivityFields {
  readonly decisionId: UserDecisionId;
  readonly recordedAt: UtcInstant;
  readonly timing: ManualActivityTiming;
}

function validateText(
  value: string,
  field: 'title' | 'category' | 'ticketReference',
  maximum: number,
): string {
  const containsControl = Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0);
    return codePoint !== undefined && (codePoint <= 31 || codePoint === 127);
  });
  if (
    value.length === 0 ||
    value.trim() !== value ||
    value.length > maximum ||
    containsControl
  ) {
    throw new DomainValidationError(
      field === 'title'
        ? 'manual_activity.invalid_title'
        : 'event.text.invalid',
      `Manual activity ${field} is invalid.`,
    );
  }
  return value;
}

export class ManualActivity {
  private constructor(
    public readonly id: ManualActivityId,
    public readonly decisionId: UserDecisionId,
    public readonly supersedesDecisionId: UserDecisionId | null,
    public readonly revision: number,
    public readonly recordedAt: UtcInstant,
    public readonly title: string,
    public readonly category: string | null,
    public readonly ticketReference: string | null,
    public readonly timing: ManualActivityTiming,
  ) {
    Object.freeze(timing);
    Object.freeze(this);
  }

  public static create(
    id: ManualActivityId,
    input: ManualActivityRevisionInput,
  ): ManualActivity {
    return ManualActivity.build(id, null, 1, input);
  }

  public revise(input: ManualActivityRevisionInput): ManualActivity {
    return ManualActivity.build(
      this.id,
      this.decisionId,
      this.revision + 1,
      input,
    );
  }

  public stop(
    decisionId: UserDecisionId,
    stoppedAt: UtcInstant,
    recordedAt: UtcInstant,
  ): ManualActivity {
    if (this.timing.status !== 'ongoing') {
      throw new DomainValidationError(
        'manual_activity.not_ongoing',
        'Only an ongoing manual activity can be stopped.',
      );
    }
    return this.revise({
      decisionId,
      recordedAt,
      title: this.title,
      ...(this.category === null ? {} : { category: this.category }),
      ...(this.ticketReference === null
        ? {}
        : { ticketReference: this.ticketReference }),
      timing: {
        status: 'completed',
        range: TimeRange.between(this.timing.startedAt, stoppedAt),
      },
    });
  }

  private static build(
    id: ManualActivityId,
    supersedesDecisionId: UserDecisionId | null,
    revision: number,
    input: ManualActivityRevisionInput,
  ): ManualActivity {
    if (!Number.isSafeInteger(revision) || revision <= 0) {
      throw new DomainValidationError(
        'manual_activity.invalid_revision',
        'A manual activity revision must be a positive safe integer.',
      );
    }
    return new ManualActivity(
      id,
      input.decisionId,
      supersedesDecisionId,
      revision,
      input.recordedAt,
      validateText(input.title, 'title', 256),
      input.category === undefined
        ? null
        : validateText(input.category, 'category', 128),
      input.ticketReference === undefined
        ? null
        : validateText(input.ticketReference, 'ticketReference', 128),
      input.timing,
    );
  }
}
