# Epic 06 — Export and privacy controls

## Goal

Produce useful files and give the user complete visibility and control over
local data.

## Stories

### [ ] EXP-001 — Export versioned JSON

Acceptance criteria:

- Export schema includes version, date/timezone, reviewed sessions, gaps,
  evidence references, and generation metadata.
- Output is deterministic for the same reviewed snapshot and excludes internal
  database details.
- Destination is user-selected and writes atomically without overwriting
  unexpectedly.
- Schema fixture and compatibility tests are committed.

### [ ] EXP-002 — Export readable Markdown

Acceptance criteria:

- Report groups confirmed activity by ticket/category and includes durations
  plus concise evidence- backed descriptions.
- Unknown/unconfirmed time is visibly separate and no total is fabricated.
- Markdown output contains no prohibited captured data.

### [ ] PRV-001 — Manage permissions, retention, and deletion

Acceptance criteria:

- Settings explain exactly what each collector stores and why.
- User can disable individual collectors and set a retention period.
- User can preview scope, confirm, and permanently delete a date range or all
  local data.
- Deletion includes raw events, decisions, settings where applicable, and local
  logs; result is reported accurately.

### [ ] PRV-002 — Verify privacy posture

Acceptance criteria:

- Automated tests ensure prohibited fields are absent from event/export schemas
  and logs.
- A manual threat review covers credentials in Git remotes, filesystem paths,
  notes, logs, backups, and exported files.
- Privacy documentation matches observed behavior.
