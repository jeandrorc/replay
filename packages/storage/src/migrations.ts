import type { Migration } from './sqlite-foundation.js';

export const replayMigrations: readonly Migration[] = [
  {
    version: 1,
    description: 'create observed events',
    sql: `
CREATE TABLE observed_events (
  observation_id TEXT PRIMARY KEY NOT NULL,
  event_id TEXT UNIQUE NOT NULL,
  occurred_at TEXT NOT NULL,
  observed_at TEXT NOT NULL,
  kind TEXT NOT NULL,
  payload_version INTEGER NOT NULL CHECK (payload_version > 0),
  payload_json TEXT NOT NULL
);
CREATE INDEX observed_events_occurred_at_event_id
  ON observed_events (occurred_at, event_id);
`,
  },
];
