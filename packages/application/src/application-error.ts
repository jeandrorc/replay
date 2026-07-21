export type ApplicationErrorCode =
  | 'manual_activity_conflict'
  | 'manual_activity_not_found'
  | 'ongoing_manual_activity_exists'
  | 'invalid_collector_input'
  | 'invalid_manual_activity'
  | 'repository_unavailable';

export class ApplicationError extends Error {
  public constructor(public readonly code: ApplicationErrorCode) {
    const messages: Record<ApplicationErrorCode, string> = {
      invalid_collector_input: 'The collector input is invalid.',
      invalid_manual_activity: 'The manual activity input is invalid.',
      manual_activity_conflict: 'The manual activity changed concurrently.',
      manual_activity_not_found: 'The manual activity was not found.',
      ongoing_manual_activity_exists:
        'An ongoing manual activity already exists.',
      repository_unavailable: 'The repository is unavailable.',
    };
    super(messages[code]);
    this.name = 'ApplicationError';
  }
}
