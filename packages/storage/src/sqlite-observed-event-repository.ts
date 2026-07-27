import type {
  ObservedEventRepositoryPort,
  RecordedObservation,
  SaveObservationResult,
} from '@replay/application';
import {
  Identifier,
  ObservedEvent,
  TimeRange,
  UtcInstant,
  type ObservedEventEnvelope,
} from '@replay/domain';

import type { SqliteDatabase } from './sqlite-foundation.js';

interface ObservedEventRow {
  readonly event_id: string;
  readonly occurred_at: string;
  readonly observed_at: string;
  readonly kind: string;
  readonly payload_version: number;
  readonly payload_json: string;
}

const MAXIMUM_QUERY_LIMIT = 10_000;
const KNOWN_KINDS = new Set<string>([
  'active_application',
  'git_context',
  'idle',
  'resumed',
  'capture_paused',
  'capture_resumed',
  'manual_activity',
  'opaque',
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const requireRecord = (value: unknown): Record<string, unknown> => {
  if (!isRecord(value)) {
    throw new TypeError('Stored event payload must be a JSON object.');
  }
  return value;
};

const requireString = (
  record: Record<string, unknown>,
  field: string,
): string => {
  const value = record[field];
  if (typeof value !== 'string') {
    throw new TypeError(`Stored event field ${field} must be a string.`);
  }
  return value;
};

const optionalString = (
  record: Record<string, unknown>,
  field: string,
): string | undefined => {
  const value = record[field];
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== 'string') {
    throw new TypeError(`Stored event field ${field} must be a string.`);
  }
  return value;
};

const serializePayload = (event: ObservedEvent): string => {
  switch (event.payload.kind) {
    case 'active_application':
      return JSON.stringify({
        bundleId: event.payload.bundleId,
        ...(event.payload.applicationName === undefined
          ? {}
          : { applicationName: event.payload.applicationName }),
      });
    case 'git_context':
      return JSON.stringify({
        repositoryId: event.payload.repositoryId.value,
        ...(event.payload.branchName === undefined
          ? {}
          : { branchName: event.payload.branchName }),
        ...(event.payload.headId === undefined
          ? {}
          : { headId: event.payload.headId }),
      });
    case 'idle':
    case 'resumed':
    case 'capture_paused':
    case 'capture_resumed':
      return '{}';
    case 'manual_activity':
      return JSON.stringify({
        title: event.payload.title,
        rangeStart: event.payload.range.start.toISOString(),
        rangeEnd: event.payload.range.end.toISOString(),
        ...(event.payload.category === undefined
          ? {}
          : { category: event.payload.category }),
        ...(event.payload.ticketReference === undefined
          ? {}
          : { ticketReference: event.payload.ticketReference }),
      });
    case 'opaque':
      return JSON.stringify({ payloadDigest: event.payload.payloadDigest });
  }
};

const storedKind = (event: ObservedEvent): string =>
  event.payload.kind === 'opaque'
    ? event.payload.originalKind
    : event.payload.kind;

const digest = async (value: string): Promise<string> => {
  const bytes = await globalThis.crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(bytes), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
};

const envelopeFrom = (row: ObservedEventRow): ObservedEventEnvelope => ({
  id: Identifier.fromString<'ObservedEvent'>(row.event_id),
  occurredAt: UtcInstant.parse(row.occurred_at),
  observedAt: UtcInstant.parse(row.observed_at),
  payloadVersion: row.payload_version,
});

const mapKnownRow = (
  row: ObservedEventRow,
  payload: Record<string, unknown>,
): ObservedEvent => {
  const envelope = envelopeFrom(row);
  switch (row.kind) {
    case 'active_application':
      return ObservedEvent.activeApplication(
        envelope,
        requireString(payload, 'bundleId'),
        optionalString(payload, 'applicationName'),
      );
    case 'git_context': {
      const branchName = optionalString(payload, 'branchName');
      const headId = optionalString(payload, 'headId');
      return ObservedEvent.gitContext(
        envelope,
        Identifier.fromString<'Repository'>(
          requireString(payload, 'repositoryId'),
        ),
        {
          ...(branchName === undefined ? {} : { branchName }),
          ...(headId === undefined ? {} : { headId }),
        },
      );
    }
    case 'idle':
    case 'resumed':
      return ObservedEvent.systemState(envelope, row.kind);
    case 'capture_paused':
    case 'capture_resumed':
      return ObservedEvent.captureState(envelope, row.kind);
    case 'manual_activity': {
      const category = optionalString(payload, 'category');
      const ticketReference = optionalString(payload, 'ticketReference');
      return ObservedEvent.manualActivity(envelope, {
        title: requireString(payload, 'title'),
        range: TimeRange.between(
          UtcInstant.parse(requireString(payload, 'rangeStart')),
          UtcInstant.parse(requireString(payload, 'rangeEnd')),
        ),
        ...(category === undefined ? {} : { category }),
        ...(ticketReference === undefined ? {} : { ticketReference }),
      });
    }
    default:
      throw new TypeError('Stored event kind is not a known event kind.');
  }
};

const mapRow = async (row: ObservedEventRow): Promise<ObservedEvent> => {
  const parsed: unknown = JSON.parse(row.payload_json);
  const payload = requireRecord(parsed);
  if (KNOWN_KINDS.has(row.kind) && row.kind !== 'opaque') {
    return mapKnownRow(row, payload);
  }
  return ObservedEvent.opaque(
    envelopeFrom(row),
    row.kind,
    await digest(row.payload_json),
  );
};

export class SqliteObservedEventRepository
  implements ObservedEventRepositoryPort
{
  public constructor(private readonly database: SqliteDatabase) {}

  public async saveIfAbsent(
    observation: RecordedObservation,
  ): Promise<SaveObservationResult> {
    const event = observation.event;
    const result = await this.database.execute(
      `INSERT INTO observed_events (
        observation_id, event_id, occurred_at, observed_at, kind,
        payload_version, payload_json
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT(observation_id) DO NOTHING;`,
      [
        observation.observationId.value,
        event.id.value,
        event.occurredAt.toISOString(),
        event.observedAt.toISOString(),
        storedKind(event),
        event.payloadVersion,
        serializePayload(event),
      ],
    );

    if (result.rowsAffected === 1) {
      return { status: 'saved' };
    }

    const rows = await this.database.select<ObservedEventRow>(
      `SELECT event_id, occurred_at, observed_at, kind, payload_version, payload_json
       FROM observed_events WHERE observation_id = $1 LIMIT 1;`,
      [observation.observationId.value],
    );
    const existing = rows[0];
    if (existing === undefined) {
      throw new Error('Duplicate observation could not be loaded.');
    }
    return { status: 'duplicate', existing: await mapRow(existing) };
  }

  public async findOccurredIn(
    range: TimeRange,
    limit: number,
  ): Promise<ObservedEvent[]> {
    if (
      !Number.isSafeInteger(limit) ||
      limit <= 0 ||
      limit > MAXIMUM_QUERY_LIMIT
    ) {
      throw new TypeError(
        'Observed-event query limit must be between 1 and 10000.',
      );
    }
    const rows = await this.database.select<ObservedEventRow>(
      `SELECT event_id, occurred_at, observed_at, kind, payload_version, payload_json
       FROM observed_events
       WHERE occurred_at >= $1 AND occurred_at < $2
       ORDER BY occurred_at, event_id
       LIMIT $3;`,
      [range.start.toISOString(), range.end.toISOString(), limit],
    );
    return Promise.all(rows.map(mapRow));
  }
}
