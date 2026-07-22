# Project status

- Last reviewed: 2026-07-22
- Current release: Release 0 — executable foundation
- Current epic: [Epic 03 — Automatic collection](backlog/epics/03-collection.md)
- Current story: COL-002 — Observe Git repository context
- Overall state: local persistence and active-application collection complete

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
WAL and foreign keys, applies transactional migrations, and persists observed
events behind the application-owned repository port. Manual activity revisions,
confirmation state, and validated local settings are also durable and
transactional. The collector package now observes the foreground macOS
application behind an application-owned port, emits only on context change or
heartbeat, and exposes permission or availability failures as health state.

## Verified on 2026-07-21

From the current working tree:

```text
pnpm architecture:check  PASS (6 policy tests; 8 projects checked)
pnpm check               PASS (all required package tasks executed)
pnpm build               PASS (8 package tasks)
pnpm security:audit      PASS (no known vulnerabilities)
```

The current tests cover the development harness, architecture policy, package
entry points, domain invariants, application orchestration with fakes, the
SQLite foundation, events, review decisions, and settings against temporary real
databases, plus deterministic collector behavior and a live macOS adapter
boundary.

## Current step

Epic 00 and Epic 01 are complete. Package boundaries remain enforced against
manifests and parsed TypeScript imports, and pnpm reports zero known dependency
vulnerabilities. Epic 02 and COL-001 are complete; COL-002 is active.

The active story adds an application-owned Git-context source and a
privacy-bounded collector adapter. Storage remains independent of process and
filesystem APIs.

## Next steps

1. Define the minimal Git-context observation and health contract.
2. Resolve repository, worktree, branch or detached HEAD, and commit identity.
3. Strip credentials from remote-derived identity before it can be persisted.
4. Verify safe degradation for non-repositories, worktrees, submodules, deleted
   folders, and command timeouts.

## Risks and open decisions

- The default branch is currently named `master`; CI supports both `master` and
  `main`, but the intended long-term default has not been selected.
- `packages/timeline` remains a provisional boundary and may be merged inward
  only if implementation evidence justifies it, as allowed by the architecture
  contract.
- AI remains outside the MVP backlog even though its reserved package exists.
