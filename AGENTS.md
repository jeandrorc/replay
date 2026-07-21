# Instructions for coding agents

These rules apply to every file in this repository. Architecture documents are
normative. When a request conflicts with them, stop and identify the conflict
instead of silently creating an exception.

## Required workflow

Before changing code:

1. Read the selected backlog story completely.
2. State which architectural layer will change.
3. Identify the inward-facing port and the adapter, if external I/O is involved.
4. List the behavior and invariants that require tests.
5. Prefer the smallest implementation satisfying the acceptance criteria.

After changing code:

1. Run the narrowest relevant tests, then repository checks.
2. Update the story checklist only for verified criteria.
3. Add an ADR only when making a durable architectural decision.
4. Report assumptions and remaining uncertainty explicitly.

## Non-negotiable rules

- Domain and application code must not import Tauri, React, SQLite, filesystem,
  process, network, AI SDK, or operating-system APIs.
- Dependencies point inward: adapters depend on ports; ports never depend on
  adapters.
- Business rules must not live in UI components, command handlers, repositories,
  collectors, or export formatters.
- A collector records observable facts. It must not classify productivity or
  infer ticket ownership.
- Timeline reconstruction is deterministic. The same ordered events and policy
  must produce the same result.
- AI is optional and downstream. Core capture, timeline, review, and JSON export
  must work with AI disabled.
- Never fabricate time, events, tickets, descriptions, or confidence. Preserve
  unknown states and ask for user review.
- Manual activities use the same domain concepts as inferred sessions and retain
  provenance.
- Store timestamps as UTC instants; convert to local time only at presentation
  boundaries. Explicitly model timezone and day-boundary policies.
- Do not log window titles, file contents, prompts, secrets, or source code
  unless a later, approved story defines redaction and informed opt-in.
- No cross-package deep imports. Use each package's public entry point.
- No `any`, unchecked type assertions, ignored promises, or disabled lint rules
  without a localized explanation and test.
- Do not introduce a dependency when a small standard-library solution is clear.
- Do not create abstractions for hypothetical providers. A second concrete use
  is the normal threshold for generalization.

## Definition of done for implementation stories

- Acceptance criteria are covered by tests at the appropriate boundary.
- Error and empty states are handled.
- Public types and domain terminology match the glossary.
- Checks pass without weakening configuration.
- User data remains local unless an explicit action clearly authorizes egress.
