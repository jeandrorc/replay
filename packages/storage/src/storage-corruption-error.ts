export class StorageCorruptionError extends Error {
  public readonly code = 'storage.corrupt_value';
  public readonly recoveryGuidance =
    'Close Replay, back up the database file, and restore or repair the invalid local value.';

  public constructor(recordType: string, options?: ErrorOptions) {
    super(
      `Stored ${recordType} data is invalid. Close Replay, back up the database file, and restore or repair the invalid local value.`,
      options,
    );
    this.name = 'StorageCorruptionError';
  }
}
