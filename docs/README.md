# Documentation map

- [Product vision](product/vision.md): problem, MVP boundary, users, and success
  criteria.
- [Project status](project-status.md): verified repository state, current story,
  next steps, and open risks.
- [Agent development loop](development-loop.md): execution, validation, handoff,
  and harness-improvement workflow.
- [Architecture contract](architecture/architecture.md): layers, data flow,
  privacy, and testing.
- [Package boundaries](architecture/package-boundaries.md): allowed workspace
  dependencies.
- [Domain primitives](architecture/domain-primitives.md): UTC instants,
  half-open ranges, identifiers, and validation semantics.
- [Observed events](architecture/observed-events.md): immutable event envelope,
  initial kinds, privacy derivation, and unknown-event quarantine.
- [Event ingestion](architecture/event-ingestion.md): application ports, atomic
  idempotency, and redacted failure mapping.
- [Manual activity](architecture/manual-activity.md): ongoing/completed states,
  append-only decisions, concurrency, and overlap review.
- [SQLite foundation](architecture/sqlite-foundation.md): Tauri connection,
  migration atomicity, pragmas, and recovery behavior.
- [ADRs](architecture/decisions/README.md): durable technical decisions.
- [MVP backlog](backlog/README.md): ordered implementation plan.
- [Execution plans](exec-plans/README.md): active and completed cross-session
  work records.
- [Dependency security](security/dependency-management.md): audit policy,
  Dependabot cadence, remediation, and limitations.
- [Templates](templates): strict story, epic, and ADR formats.

When documents conflict, accepted ADRs and the architecture contract outrank
backlog implementation notes. Product behavior still requires validation against
the vision and acceptance criteria.
