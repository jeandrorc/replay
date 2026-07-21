# Epic 02 — Local storage

## Goal

Persist events and review decisions locally with safe migrations and bounded
queries.

## Stories

### [ ] STO-001 — Initialize SQLite and migrations

Acceptance criteria:

- Database location follows macOS application-data conventions and is
  configurable in tests.
- Startup applies transactional, ordered, idempotent migrations.
- Migration failure leaves the previous schema usable and reports recovery
  guidance.
- WAL and foreign-key behavior are explicitly configured and tested.

### [ ] STO-002 — Implement the event repository

Acceptance criteria:

- Append/idempotency and UTC-range queries satisfy shared repository contract
  tests.
- Payload and schema version round-trip without loss, including unknown event
  kinds.
- Queries are bounded and indexed for a daily timeline.
- Database rows do not escape the adapter.

### [ ] STO-003 — Persist review decisions and settings

Acceptance criteria:

- User edits, confirmation state, capture settings, timezone, and retention
  settings persist.
- Raw events remain unchanged by review operations.
- Transactions prevent partially saved multi-step decisions.
- Corrupt values fail safely with actionable diagnostics.
