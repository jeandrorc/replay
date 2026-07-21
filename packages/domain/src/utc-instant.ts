import { DomainValidationError } from './domain-validation-error.js';

const CANONICAL_UTC_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;
const MINIMUM_EPOCH_MILLISECONDS = -62_167_219_200_000;
const MAXIMUM_EPOCH_MILLISECONDS = 253_402_300_799_999;

export class UtcInstant {
  private constructor(public readonly epochMilliseconds: number) {
    Object.freeze(this);
  }

  public static fromEpochMilliseconds(value: number): UtcInstant {
    if (
      !Number.isSafeInteger(value) ||
      value < MINIMUM_EPOCH_MILLISECONDS ||
      value > MAXIMUM_EPOCH_MILLISECONDS
    ) {
      throw new DomainValidationError(
        'time.instant.invalid',
        'A UTC instant must be a safe integer within the four-digit ISO year range.',
      );
    }

    return new UtcInstant(value);
  }

  public static parse(value: string): UtcInstant {
    if (!CANONICAL_UTC_PATTERN.test(value)) {
      throw new DomainValidationError(
        'time.instant.invalid',
        'A UTC instant must use canonical YYYY-MM-DDTHH:mm:ss.sssZ format.',
      );
    }

    const epochMilliseconds = Date.parse(value);
    if (
      !Number.isSafeInteger(epochMilliseconds) ||
      new Date(epochMilliseconds).toISOString() !== value
    ) {
      throw new DomainValidationError(
        'time.instant.invalid',
        'A UTC instant must represent a valid calendar instant.',
      );
    }

    return new UtcInstant(epochMilliseconds);
  }

  public compare(other: UtcInstant): -1 | 0 | 1 {
    if (this.epochMilliseconds < other.epochMilliseconds) {
      return -1;
    }
    if (this.epochMilliseconds > other.epochMilliseconds) {
      return 1;
    }
    return 0;
  }

  public equals(other: UtcInstant): boolean {
    return this.epochMilliseconds === other.epochMilliseconds;
  }

  public toISOString(): string {
    return new Date(this.epochMilliseconds).toISOString();
  }
}
