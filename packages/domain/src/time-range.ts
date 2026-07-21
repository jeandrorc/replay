import { DomainValidationError } from './domain-validation-error.js';
import type { UtcInstant } from './utc-instant.js';

export class TimeRange {
  public readonly durationMilliseconds: number;

  private constructor(
    public readonly start: UtcInstant,
    public readonly end: UtcInstant,
  ) {
    this.durationMilliseconds = end.epochMilliseconds - start.epochMilliseconds;
    Object.freeze(this);
  }

  public static between(start: UtcInstant, end: UtcInstant): TimeRange {
    const order = end.compare(start);
    if (order === 0) {
      throw new DomainValidationError(
        'time.range.empty',
        'A time range must have a positive duration.',
      );
    }
    if (order < 0) {
      throw new DomainValidationError(
        'time.range.negative',
        'A time range cannot end before it starts.',
      );
    }

    return new TimeRange(start, end);
  }

  public contains(instant: UtcInstant): boolean {
    return this.start.compare(instant) <= 0 && instant.compare(this.end) < 0;
  }

  public overlaps(other: TimeRange): boolean {
    return (
      this.start.compare(other.end) < 0 && other.start.compare(this.end) < 0
    );
  }

  public equals(other: TimeRange): boolean {
    return this.start.equals(other.start) && this.end.equals(other.end);
  }
}
