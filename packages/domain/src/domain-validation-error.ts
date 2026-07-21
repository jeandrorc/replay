export type DomainValidationErrorCode =
  | 'identifier.empty'
  | 'identifier.too_long'
  | 'identifier.whitespace'
  | 'identifier.control_character'
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
