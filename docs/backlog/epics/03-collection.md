# Epic 03 — Automatic collection

## Goal

Capture minimal macOS application and Git context while making capture state
obvious and resilient.

## Stories

### [~] COL-001 — Observe the active macOS application

Acceptance criteria:

- Record timestamp, application name, and bundle identifier only when context
  changes or heartbeat is required.
- No window title, document name/content, keystrokes, or screenshot is captured.
- Missing Accessibility permission is detected and explained without crashing.
- The adapter is isolated behind an application port and integration-tested on
  macOS.

### [ ] COL-002 — Observe Git repository context

Acceptance criteria:

- Resolve repository identity, worktree root, branch or detached HEAD, and
  current commit without reading file contents or diffs.
- Non-Git directories, worktrees, submodules, deleted folders, and command
  timeouts degrade safely.
- Secrets embedded in remotes are stripped before persistence.

### [ ] COL-003 — Detect idle, sleep, wake, and clock discontinuity

Acceptance criteria:

- Idle threshold is configurable and creates explicit idle/resume evidence.
- Sleep/wake never becomes active duration.
- Wall-clock discontinuities do not create negative or implausible sessions.
- Automated boundary tests use injected clocks.

### [ ] COL-004 — Control and monitor capture lifecycle

Acceptance criteria:

- Start, pause, resume, and shutdown are idempotent.
- Visible state always matches actual collection state.
- One failing source restarts with bounded backoff and does not stop other
  sources.
- No collection occurs while paused.
