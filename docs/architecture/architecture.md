# Architecture contract

## 1. System qualities

Replay prioritizes privacy, explainability, deterministic behavior,
maintainability, and replaceability of external technology. Convenience must not
bypass these qualities.

## 2. Architectural style

The system uses ports and adapters around an isolated domain. Domain objects
model facts, intervals, provenance, and invariants. Application use cases
coordinate domain behavior through ports. Adapters provide operating-system,
database, UI, export, and optional AI capabilities.

```text
UI / OS / SQLite / Git / AI / Files
              |
           adapters
              |
     application ports + use cases
              |
            domain
```

Dependency direction is always inward. Runtime control flow may point outward
through injected ports, but source imports must respect the direction above.

## 3. Bounded responsibilities

### `packages/domain`

Owns domain types, value objects, entities, policies, domain services, errors,
and invariants. It is pure TypeScript and deterministic. It knows no framework,
persistence schema, operating system, UI, or vendor.

Expected concepts include `ObservedEvent`, `EvidenceRef`, `TimeInterval`,
`Activity`, `Session`, `Provenance`, `Workday`, and capture/timeline policies.

### `packages/application`

Owns use cases and ports such as event ingestion, timeline generation, activity
editing, report generation, capture control, and retention. It defines
transaction, clock, ID, repository, exporter, and collector boundaries needed by
use cases.

It may depend only on `domain` and small, technology-neutral types.

### `packages/collector`

Owns adapters that observe active application and Git context. A collector emits
validated observed-event input and health state. It never writes directly to a
database, groups sessions, or judges whether time is productive.

### `packages/storage`

Owns SQLite schema, migrations, mapping, transactions, and repository adapters.
Database rows are persistence details and must be mapped at the boundary.
Migrations are append-only after release and execute transactionally where
supported.

### `packages/timeline`

Owns deterministic reconstruction algorithms and their policy configuration. It
may be merged into `core` during implementation if no independent package
boundary is justified. It must not access storage, clock, OS, or AI directly.

### `packages/exporter`

Owns versioned JSON and Markdown representations. Exporters receive an approved
application-level report model. They do not query repositories or infer missing
information.

### `packages/ai`

Owns optional adapters for post-processing approved, redacted context. Provider
SDK types stay inside the adapter. AI responses are untrusted input, schema
validated, labeled as suggestions, and never persisted as observed facts.

### `apps/desktop`

Owns composition root, Tauri commands, permissions, tray/menu behavior, React
UI, and platform lifecycle. Command handlers validate transport input, call one
use case, and map its result. They contain no business logic or SQL.

## 4. Event model

Observed events are append-only facts with stable IDs:

```text
id, occurredAt, observedAt, source, kind, payloadVersion, payload, privacyClass
```

Events distinguish when a fact occurred from when Replay observed it. Payloads
are discriminated and versioned. Unknown or unsupported payload versions are
preserved or quarantined; they are not silently reinterpreted.

Domain events are internal consequences of accepted operations and are distinct
from observed events. An in-process dispatcher is sufficient for the MVP; no
message broker is permitted without an ADR.

## 5. Timeline rules

- Sort by occurrence time with a stable tie-breaker.
- Make idle threshold, sampling interval, day boundary, and merge policy
  explicit.
- Preserve gaps and ambiguous periods instead of filling them automatically.
- Keep evidence references on every derived session.
- A manual correction overrides presentation but does not mutate source
  evidence.
- Rebuilding from the same input and policy produces structurally equal output.
- Confidence must expose reasons such as sparse evidence or competing context.

## 6. Privacy and security

The MVP captures the least sensitive metadata capable of validating the
hypothesis. Default allowlisted fields are application bundle identity,
repository identifier, branch name, Git head identifier, timestamps, and
Replay-authored manual text.

Capture of source contents, diffs, window titles, clipboard, keystrokes,
screenshots, browser URLs, prompt contents, and environment variables is
prohibited by default. New capture requires a privacy review, settings UI,
explicit opt-in, redaction tests, and an ADR.

Secrets are never stored in the event database or logs. Provider credentials, if
later introduced, use the operating-system credential store. Logs use
structured, redacted fields and bounded retention.

## 7. Storage and consistency

- SQLite is private application data, not a public integration API.
- Use foreign keys, constraints, and explicit transaction boundaries.
- Persist raw observed events separately from derived sessions and user edits.
- Store UTC timestamps in a lossless format and record relevant timezone policy.
- Use an application-controlled schema version and migration ledger.
- Repository adapters return domain/application models, never raw database rows.
- Export is a read operation and does not mark time as submitted externally.

## 8. Error model

Expected failures use typed errors at the domain/application boundary. Adapters
map vendor errors into stable categories while retaining a redacted cause for
local diagnostics. UI text is produced at the presentation boundary. Do not use
exceptions for normal absence or unknown classification.

## 9. Testing strategy

- Domain: example-based unit tests plus property tests for interval invariants.
- Timeline: fixtures, boundary cases, ordering tests, and determinism tests.
- Application: use-case tests with in-memory fakes for ports.
- Adapters: contract tests shared by every implementation of a port.
- Storage: migration and repository integration tests against real SQLite.
- Desktop: focused component tests and a small number of critical-path E2E
  tests.

Tests must use controllable clocks and ID generators. Time-sensitive tests may
not depend on wall-clock sleeps.

## 10. Observability

Metrics and logs describe system health, not worker performance. Useful examples
are collector availability, rejected event count, migration result, and export
failure. User activity data is excluded from telemetry unless a later explicit
opt-in design is approved.

## 11. Change control

Create an ADR when changing dependency direction, persistence technology,
capture scope, event schema compatibility, privacy defaults, distribution model,
or the role of AI. Small implementation choices belong in code and tests, not
ADRs.
