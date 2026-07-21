# Project status

- Last reviewed: 2026-07-21
- Current release: Release 0 — executable foundation
- Current epic: [Epic 02 — Local storage](backlog/epics/02-storage.md)
- Current story: STO-002 — Implement the event repository
- Overall state: capture domain and SQLite foundation complete

## What exists

- A pnpm workspace containing the future desktop app and seven bounded packages.
- The product vision, architecture contract, package dependency matrix, and two
  accepted ADRs.
- Root TypeScript, ESLint, Prettier, Markdownlint, and Turborepo configuration.
- A committed-shape lockfile and a macOS GitHub Actions workflow that use frozen
  dependency installation and the root validation command.
- An ordered MVP backlog from foundation through a five-day dogfood trial.
- A repository-native development harness with active/completed execution plans,
  backlog-state validation, local-link checks, and configurable Turbo task
  enforcement.

All eight workspace projects have typed public entry points and executable
build, lint, typecheck, and tests. The domain now provides validated UTC
instants, half-open ranges, observed events, and manual activity revisions.
Application use cases record captured events and manage manual activity through
ports. The storage package now opens Tauri-managed SQLite databases, enforces
WAL and foreign keys, and applies transactional migrations. Event persistence
models do not exist yet.

## Verified on 2026-07-21

From the current working tree:

```text
pnpm architecture:check  PASS (6 policy tests; 8 projects checked)
pnpm check               PASS (all required package tasks executed)
pnpm build               PASS (8 package tasks)
pnpm security:audit      PASS (no known vulnerabilities)
```

The current tests cover the development harness, architecture policy, package
entry points, domain invariants, application orchestration with fakes, and the
SQLite foundation against temporary real databases.

## Current step

Epic 00 and Epic 01 are complete. Package boundaries remain enforced against
manifests and parsed TypeScript imports, and pnpm reports zero known dependency
vulnerabilities. STO-001 is complete and STO-002 is active.

The active story changes only the storage adapter and implements the existing
observed-event repository port. Domain and application packages remain
independent of SQLite.

## Next steps

1. Add the observed-event tables and daily-query indexes through a migration.
2. Implement append/idempotency and UTC-range queries behind the existing port.
3. Preserve versioned and unknown event payloads without leaking database rows.
4. Run shared repository contracts against real SQLite.

## Risks and open decisions

- The default branch is currently named `master`; CI supports both `master` and
  `main`, but the intended long-term default has not been selected.
- `packages/timeline` remains a provisional boundary and may be merged inward
  only if implementation evidence justifies it, as allowed by the architecture
  contract.
- AI remains outside the MVP backlog even though its reserved package exists.
