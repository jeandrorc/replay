# Epic 07 — MVP validation

## Goal

Package a reliable build and validate that Replay reduces daily reporting
effort.

## Stories

### [ ] REL-001 — Package and smoke-test a macOS build

Acceptance criteria:

- Signed/notarized strategy is documented; the chosen MVP distribution path is
  reproducible.
- Clean install, upgrade, launch-at-login opt-in, permission denial/recovery,
  sleep/wake, and uninstall are smoke-tested.
- Crash recovery does not corrupt events or decisions.
- Known limitations and supported macOS versions are documented.

### [ ] VAL-001 — Run the five-day dogfood trial

Acceptance criteria:

- Record daily time-to-report, corrected-duration percentage, missing
  activities, crashes, and privacy concerns without uploading captured activity.
- Success is evaluated against `docs/product/vision.md`.
- Findings produce prioritized backlog changes rather than silent scope
  expansion.
- A written go/no-go decision determines whether to add optional AI or
  integrations.
