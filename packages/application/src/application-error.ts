export type ApplicationErrorCode =
  | 'invalid_collector_input'
  | 'repository_unavailable';

export class ApplicationError extends Error {
  public constructor(public readonly code: ApplicationErrorCode) {
    super(
      code === 'invalid_collector_input'
        ? 'The collector input is invalid.'
        : 'The event repository is unavailable.',
    );
    this.name = 'ApplicationError';
  }
}
