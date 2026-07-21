# Epic 04 — Deterministic timeline

## Goal

Convert evidence into reproducible, explainable proposed activity sessions.

## Stories

### [ ] TML-001 — Define timeline policy and algorithm version

Acceptance criteria:

- Thresholds for heartbeat, idle, context switching, and short gaps are explicit
  configuration.
- Algorithm input/output and semantic version are recorded.
- Same inputs and configuration always produce byte-equivalent normalized
  output.

### [ ] TML-002 — Group events into proposed sessions

Acceptance criteria:

- Sessions have half-open ranges, classification, evidence references, and
  confidence.
- Idle periods and unknown gaps are never assigned to work automatically.
- App/Git changes create or merge sessions only according to the documented
  policy.
- Golden fixtures cover research between code activity, rapid switching,
  meetings, sleep, midnight, overlaps, missing heartbeats, and sparse evidence.

### [ ] TML-003 — Apply manual activity and user decisions

Acceptance criteria:

- Manual activities coexist with inferred sessions and take precedence only
  through explicit rules.
- User splits, merges, relabels, and time edits are replayable without mutating
  raw events.
- Conflicts and overlaps are presented, not silently resolved.

### [ ] TML-004 — Calculate explainable confidence

Acceptance criteria:

- Confidence is deterministic, bounded, and decomposable into documented
  signals.
- UI-facing reasons contain evidence references and plain-language keys.
- Confidence never changes confirmed time automatically.
