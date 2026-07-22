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
  {
    version: 2,
    description: 'create review decisions and settings',
    sql: `
CREATE TABLE manual_activity_revisions (
  decision_id TEXT PRIMARY KEY NOT NULL,
  activity_id TEXT NOT NULL,
  supersedes_decision_id TEXT REFERENCES manual_activity_revisions(decision_id),
  revision INTEGER NOT NULL CHECK (revision > 0),
  recorded_at TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT,
  ticket_reference TEXT,
  timing_status TEXT NOT NULL CHECK (timing_status IN ('ongoing', 'completed')),
  started_at TEXT NOT NULL,
  ended_at TEXT,
  UNIQUE (activity_id, revision)
);
CREATE TABLE manual_activity_heads (
  activity_id TEXT PRIMARY KEY NOT NULL,
  current_decision_id TEXT UNIQUE NOT NULL
    REFERENCES manual_activity_revisions(decision_id),
  timing_status TEXT NOT NULL CHECK (timing_status IN ('ongoing', 'completed'))
);
CREATE UNIQUE INDEX one_ongoing_manual_activity
  ON manual_activity_heads (timing_status) WHERE timing_status = 'ongoing';
CREATE INDEX manual_activity_completed_range
  ON manual_activity_revisions (started_at, ended_at)
  WHERE timing_status = 'completed';
CREATE TABLE review_confirmations (
  decision_id TEXT PRIMARY KEY NOT NULL,
  target_id TEXT NOT NULL,
  confirmed INTEGER NOT NULL CHECK (confirmed IN (0, 1)),
  decided_at TEXT NOT NULL
);
CREATE INDEX review_confirmations_target_latest
  ON review_confirmations (target_id, decided_at DESC, decision_id DESC);
CREATE TABLE local_settings (
  singleton_id INTEGER PRIMARY KEY CHECK (singleton_id = 1),
  capture_enabled INTEGER NOT NULL CHECK (capture_enabled IN (0, 1)),
  time_zone TEXT NOT NULL,
  day_boundary_minutes INTEGER NOT NULL,
  retention_days INTEGER NOT NULL
);
`,
  },
];
