# Project status

- Last reviewed: 2026-07-21
- Current release: Release 0 — executable foundation
- Current epic:
  [Epic 01 — Domain and capture](backlog/epics/01-domain-capture.md)
- Current story: DOM-001 — Model time ranges and identifiers
- Overall state: foundation complete; first pure-domain story ready

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
build, lint, typecheck, and entry-point tests. There are no domain models, use
cases, adapters, Tauri application code, migrations, or product tests yet.

## Verified on 2026-07-21

From the current working tree:

```text
pnpm architecture:check  PASS (6 policy tests; 8 projects checked)
pnpm check               PASS (all required package tasks executed)
pnpm build               PASS (8 package tasks)
pnpm security:audit      PASS (no known vulnerabilities)
```

The current tests cover the development harness, architecture policy, and each
package's importable public entry point. Product behavior coverage begins with
DOM-001.

## Current step

Epic 00 is complete. All eight workspace projects execute build, lint,
typecheck, and public-entry tests; package boundaries are enforced against
manifests and parsed TypeScript imports. GitHub and pnpm report zero known
dependency alerts. DOM-001 is active.

The active story changes only the pure domain layer. It has no application port
or external-I/O adapter; identifier generation remains outside the domain.

## Next steps

1. Define the DOM-001 glossary and exact UTC/range invariants.
2. Implement pure value objects and identifier types without I/O.
3. Add boundary, equality, midnight, and DST presentation tests.
4. Continue to DOM-002 only after DOM-001 evidence is complete.

## Risks and open decisions

- The default branch is currently named `master`; CI supports both `master` and
  `main`, but the intended long-term default has not been selected.
- `packages/timeline` remains a provisional boundary and may be merged inward
  only if implementation evidence justifies it, as allowed by the architecture
  contract.
- AI remains outside the MVP backlog even though its reserved package exists.
