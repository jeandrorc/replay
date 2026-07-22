import type {
  ActiveApplicationSnapshot,
  ActiveApplicationSourcePort,
  ActiveApplicationSourceResult,
  ClockPort,
} from '@replay/application';
import type { UtcInstant } from '@replay/domain';

export interface ActiveApplicationObservation
  extends ActiveApplicationSnapshot {
  readonly occurredAt: UtcInstant;
  readonly reason: 'context_changed' | 'heartbeat';
}

export type ActiveApplicationCollectionResult =
  | Readonly<{ status: 'emitted'; observation: ActiveApplicationObservation }>
  | Readonly<{ status: 'unchanged' }>
  | Exclude<ActiveApplicationSourceResult, { status: 'available' }>;

export interface ActiveApplicationCollectorOptions {
  readonly source: ActiveApplicationSourcePort;
  readonly clock: ClockPort;
  readonly heartbeatMilliseconds: number;
}

const sameApplication = (
  left: ActiveApplicationSnapshot,
  right: ActiveApplicationSnapshot,
): boolean =>
  left.applicationName === right.applicationName &&
  left.bundleId === right.bundleId;

export class ActiveApplicationCollector {
  readonly #source: ActiveApplicationSourcePort;
  readonly #clock: ClockPort;
  readonly #heartbeatMilliseconds: number;
  #lastSnapshot: ActiveApplicationSnapshot | null = null;
  #lastEmission: UtcInstant | null = null;

  public constructor(options: ActiveApplicationCollectorOptions) {
    if (
      !Number.isSafeInteger(options.heartbeatMilliseconds) ||
      options.heartbeatMilliseconds <= 0
    ) {
      throw new TypeError('Heartbeat must be a positive integer duration.');
    }
    this.#source = options.source;
    this.#clock = options.clock;
    this.#heartbeatMilliseconds = options.heartbeatMilliseconds;
  }

  public async poll(): Promise<ActiveApplicationCollectionResult> {
    const result = await this.#source.observe();
    if (result.status !== 'available') {
      return result;
    }
    const now = this.#clock.now();
    const changed =
      this.#lastSnapshot === null ||
      !sameApplication(this.#lastSnapshot, result.snapshot);
    const heartbeatDue =
      this.#lastEmission !== null &&
      now.epochMilliseconds - this.#lastEmission.epochMilliseconds >=
        this.#heartbeatMilliseconds;
    if (!changed && !heartbeatDue) {
      return { status: 'unchanged' };
    }
    const reason = changed ? 'context_changed' : 'heartbeat';
    this.#lastSnapshot = result.snapshot;
    this.#lastEmission = now;
    return {
      status: 'emitted',
      observation: { ...result.snapshot, occurredAt: now, reason },
    };
  }
}
