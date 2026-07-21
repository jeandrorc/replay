# Epic 05 — Desktop capture and review

## Goal

Deliver the macOS menu-bar workflow for capture, manual input, daily review, and
correction.

## Stories

### [ ] UI-001 — Scaffold the Tauri desktop app

Acceptance criteria:

- Tauri, React, and TypeScript build in development and release modes on
  supported macOS.
- Tauri commands are thin application-use-case adapters with validated payloads.
- A composition root wires concrete adapters; business logic is absent from
  React and Rust commands.
- Content security policy and permissions allow only required capabilities.

### [ ] UI-002 — Provide menu-bar capture controls

Acceptance criteria:

- Tray status clearly shows running, paused, permission-needed, and degraded
  states.
- Start/pause/resume and open-review actions are reachable in two interactions
  or fewer.
- Quit drains pending events before process exit or clearly reports failure.

### [ ] UI-003 — Add quick manual activity

Acceptance criteria:

- Global shortcut opens a compact form for title, time/duration, category, and
  optional ticket.
- Start-now, stop-current, and add-completed flows are keyboard accessible.
- Invalid/overlapping times are explained before save; overlap remains
  user-controllable.

### [ ] UI-004 — Review and edit a daily timeline

Acceptance criteria:

- Timeline distinguishes inferred, manual, idle, unknown, conflicted, and
  confirmed blocks.
- Selecting a block exposes its evidence and confidence reasons.
- User can split, merge, relabel, edit time, exclude, and confirm with undo
  during the session.
- UI covers empty, loading, permission, partial-source, storage-error, and
  normal states.
