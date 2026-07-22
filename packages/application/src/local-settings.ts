const TIME_ZONE_PATTERN = /^(?:UTC|[A-Za-z_+-]+(?:\/[A-Za-z0-9_+.-]+)+)$/u;

export interface LocalSettingsInput {
  readonly captureEnabled: boolean;
  readonly timeZone: string;
  readonly dayBoundaryMinutes: number;
  readonly retentionDays: number;
}

export class LocalSettings {
  private constructor(
    public readonly captureEnabled: boolean,
    public readonly timeZone: string,
    public readonly dayBoundaryMinutes: number,
    public readonly retentionDays: number,
  ) {
    Object.freeze(this);
  }

  public static create(input: LocalSettingsInput): LocalSettings {
    if (
      !TIME_ZONE_PATTERN.test(input.timeZone) ||
      input.timeZone.length > 128
    ) {
      throw new TypeError(
        'Time zone must be a bounded IANA identifier or UTC.',
      );
    }
    if (
      !Number.isSafeInteger(input.dayBoundaryMinutes) ||
      input.dayBoundaryMinutes < 0 ||
      input.dayBoundaryMinutes > 1_439
    ) {
      throw new TypeError(
        'Day boundary must be a minute within the local day.',
      );
    }
    if (
      !Number.isSafeInteger(input.retentionDays) ||
      input.retentionDays < 1 ||
      input.retentionDays > 3_650
    ) {
      throw new TypeError('Retention must be between 1 and 3650 days.');
    }
    return new LocalSettings(
      input.captureEnabled,
      input.timeZone,
      input.dayBoundaryMinutes,
      input.retentionDays,
    );
  }
}
