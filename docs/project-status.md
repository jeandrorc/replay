# Project status

- Last reviewed: 2026-07-21
- Current release: Release 0 — executable foundation
- Current epic: [Epic 00 — Foundation](backlog/epics/00-foundation.md)
- Current story: FND-005 — Automate dependency vulnerability mitigation
- Overall state: foundation in progress; no product implementation exists

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

The package folders currently contain only manifests and boundary documentation.
There are no TypeScript entry points, domain models, use cases, adapters, Tauri
application code, migrations, or product tests yet.

## Verified on 2026-07-21

From the current working tree:

```text
pnpm install --frozen-lockfile  PASS
pnpm check                      PASS
format:check                    PASS
lint                            PASS
markdown lint                   PASS
typecheck                       PASS (0 package tasks)
test                            PASS (0 package tasks)
```

The zero-task result is expected before FND-002, but it means the current green
typecheck and test results validate configuration only, not application code.
Frozen installation, the root check, and build pass from a clean clone using
project pnpm 10.33.0. GitHub Actions run `29837154774` also passed on macOS
after the initial publication to `jeandrorc/replay`.

## Current step

FND-001 and FND-004 are complete. FND-002 is paused while FND-005 removes eight
known Dependabot alerts and adds continuous dependency-security automation.

This work changes only repository tooling and documentation. It involves no
application port, external-I/O adapter, or product invariant.

## Next steps

1. Complete FND-005 dependency remediation and verify GitHub automation.
2. Resume FND-002 with typed public entry points and executable package tasks.
3. Enable required Turbo task enforcement for build, typecheck, and test.
4. Complete FND-003 before introducing domain behavior.
5. Begin DOM-001 only after all Foundation exit conditions are verified.

## Risks and open decisions

- The default branch is currently named `master`; CI supports both `master` and
  `main`, but the intended long-term default has not been selected.
- Runtime choices for package testing and architecture-boundary enforcement are
  intentionally deferred to FND-002 and FND-003.
- `packages/timeline` remains a provisional boundary and may be merged inward
  only if implementation evidence justifies it, as allowed by the architecture
  contract.
- AI remains outside the MVP backlog even though its reserved package exists.
