# Review persistence

Review data is stored separately from immutable observed events. Manual
activities retain every revision with decision ID, superseded decision, recorded
time, fields, and timing. A small head table identifies the current revision and
enforces at most one ongoing activity; it never replaces revision evidence.

Revision writes and head updates execute in one serialized immediate SQLite
transaction. Optimistic comparison against the expected decision ID prevents a
stale edit. Failure rolls back the whole operation. Completed current revisions
are queried for overlaps, which are returned for review rather than rejected.

Confirmation decisions are append-only and ordered by decision time and ID.
Local settings use a validated singleton containing capture state, IANA timezone
identifier, day-boundary minute, and retention days. Storage revalidates rows on
load.

Invalid stored values raise `StorageCorruptionError` with guidance to close the
app, back up the database, and repair or restore local data. No automated repair
or deletion occurs. Review and settings operations never update observed-event
rows.
