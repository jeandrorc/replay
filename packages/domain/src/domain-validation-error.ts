export type DomainValidationErrorCode =
  | 'identifier.empty'
  | 'identifier.too_long'
  | 'identifier.whitespace'
  | 'identifier.control_character'
  | 'manual_activity.invalid_revision'
  | 'manual_activity.invalid_title'
  | 'manual_activity.not_ongoing'
  | 'event.digest.invalid'
  | 'event.kind.invalid'
  | 'event.observed_before_occurrence'
  | 'event.text.invalid'
  | 'event.version.invalid'
  | 'time.instant.invalid'
  | 'time.range.empty'
  | 'time.range.negative';

export class DomainValidationError extends Error {
  public constructor(
    public readonly code: DomainValidationErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'DomainValidationError';
  }
}
