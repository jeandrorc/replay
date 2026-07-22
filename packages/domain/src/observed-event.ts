import { DomainValidationError } from './domain-validation-error.js';
import type { Identifier } from './identifier.js';
import type { TimeRange } from './time-range.js';
import type { UtcInstant } from './utc-instant.js';

export type ObservedEventId = Identifier<'ObservedEvent'>;
export type RepositoryId = Identifier<'Repository'>;

export type EventSource =
  | 'active_application_collector'
  | 'git_collector'
  | 'system_idle'
  | 'capture_control'
  | 'manual_entry'
  | 'quarantined_storage';

export type PrivacyClass =
  | 'application_metadata'
  | 'repository_metadata'
  | 'system_state'
  | 'user_authored'
  | 'quarantined_metadata';

export type ObservedPayload =
  | Readonly<{
      kind: 'active_application';
      bundleId: string;
      applicationName?: string;
    }>
  | Readonly<{
      kind: 'git_context';
      repositoryId: RepositoryId;
      branchName?: string;
      headId?: string;
    }>
  | Readonly<{ kind: 'idle' | 'resumed' }>
  | Readonly<{ kind: 'capture_paused' | 'capture_resumed' }>
  | Readonly<{
      kind: 'manual_activity';
      title: string;
      range: TimeRange;
      category?: string;
      ticketReference?: string;
    }>
  | Readonly<{
      kind: 'opaque';
      originalKind: string;
      payloadDigest: string;
    }>;

export interface ObservedEventEnvelope {
  readonly id: ObservedEventId;
  readonly occurredAt: UtcInstant;
  readonly observedAt: UtcInstant;
  readonly payloadVersion: number;
}

const TOKEN_PATTERN = /^[a-z][a-z0-9_.-]{0,127}$/u;
const SHA_256_PATTERN = /^[a-f0-9]{64}$/u;

function requireVersion(value: number): number {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new DomainValidationError(
      'event.version.invalid',
      'An event payload version must be a positive safe integer.',
    );
  }
  return value;
}

function requireText(value: string, field: string, maximum: number): string {
  if (
    value.length === 0 ||
    value.trim() !== value ||
    value.length > maximum ||
    Array.from(value).some((character) => {
      const codePoint = character.codePointAt(0);
      return codePoint !== undefined && (codePoint <= 31 || codePoint === 127);
    })
  ) {
    throw new DomainValidationError(
      'event.text.invalid',
      `${field} is not valid event metadata.`,
    );
  }
  return value;
}

export class ObservedEvent {
  public readonly kind: ObservedPayload['kind'];

  private constructor(
    envelope: ObservedEventEnvelope,
    public readonly source: EventSource,
    public readonly privacyClass: PrivacyClass,
    public readonly payload: ObservedPayload,
  ) {
    if (envelope.observedAt.compare(envelope.occurredAt) < 0) {
      throw new DomainValidationError(
        'event.observed_before_occurrence',
        'An event cannot be observed before it occurs.',
      );
    }
    this.id = envelope.id;
    this.occurredAt = envelope.occurredAt;
    this.observedAt = envelope.observedAt;
    this.payloadVersion = requireVersion(envelope.payloadVersion);
    this.kind = payload.kind;
    Object.freeze(payload);
    Object.freeze(this);
  }

  public readonly id: ObservedEventId;
  public readonly occurredAt: UtcInstant;
  public readonly observedAt: UtcInstant;
  public readonly payloadVersion: number;

  public static activeApplication(
    envelope: ObservedEventEnvelope,
    bundleId: string,
    applicationName?: string,
  ): ObservedEvent {
    return new ObservedEvent(
      envelope,
      'active_application_collector',
      'application_metadata',
      {
        kind: 'active_application',
        bundleId: requireText(bundleId, 'bundleId', 256),
        ...(applicationName === undefined
          ? {}
          : {
              applicationName: requireText(
                applicationName,
                'applicationName',
                256,
              ),
            }),
      },
    );
  }

  public static gitContext(
    envelope: ObservedEventEnvelope,
    repositoryId: RepositoryId,
    context: Readonly<{ branchName?: string; headId?: string }> = {},
  ): ObservedEvent {
    const payload: Extract<ObservedPayload, { kind: 'git_context' }> = {
      kind: 'git_context',
      repositoryId,
      ...(context.branchName === undefined
        ? {}
        : { branchName: requireText(context.branchName, 'branchName', 256) }),
      ...(context.headId === undefined
        ? {}
        : { headId: requireText(context.headId, 'headId', 128) }),
    };
    return new ObservedEvent(
      envelope,
      'git_collector',
      'repository_metadata',
      payload,
    );
  }

  public static systemState(
    envelope: ObservedEventEnvelope,
    kind: 'idle' | 'resumed',
  ): ObservedEvent {
    return new ObservedEvent(envelope, 'system_idle', 'system_state', { kind });
  }

  public static captureState(
    envelope: ObservedEventEnvelope,
    kind: 'capture_paused' | 'capture_resumed',
  ): ObservedEvent {
    return new ObservedEvent(envelope, 'capture_control', 'system_state', {
      kind,
    });
  }

  public static manualActivity(
    envelope: ObservedEventEnvelope,
    activity: Readonly<{
      title: string;
      range: TimeRange;
      category?: string;
      ticketReference?: string;
    }>,
  ): ObservedEvent {
    const payload: Extract<ObservedPayload, { kind: 'manual_activity' }> = {
      kind: 'manual_activity',
      title: requireText(activity.title, 'title', 256),
      range: activity.range,
      ...(activity.category === undefined
        ? {}
        : { category: requireText(activity.category, 'category', 128) }),
      ...(activity.ticketReference === undefined
        ? {}
        : {
            ticketReference: requireText(
              activity.ticketReference,
              'ticketReference',
              128,
            ),
          }),
    };
    return new ObservedEvent(
      envelope,
      'manual_entry',
      'user_authored',
      payload,
    );
  }

  public static opaque(
    envelope: ObservedEventEnvelope,
    originalKind: string,
    payloadDigest: string,
  ): ObservedEvent {
    if (!TOKEN_PATTERN.test(originalKind)) {
      throw new DomainValidationError(
        'event.kind.invalid',
        'An opaque event kind must be a bounded lowercase token.',
      );
    }
    if (!SHA_256_PATTERN.test(payloadDigest)) {
      throw new DomainValidationError(
        'event.digest.invalid',
        'An opaque payload digest must be lowercase SHA-256 hexadecimal.',
      );
    }
    return new ObservedEvent(
      envelope,
      'quarantined_storage',
      'quarantined_metadata',
      { kind: 'opaque', originalKind, payloadDigest },
    );
  }
}
