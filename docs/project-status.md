# Project status

- Last reviewed: 2026-07-21
- Current release: Release 0 — executable foundation
- Current epic: [Epic 00 — Foundation](backlog/epics/00-foundation.md)
- Current story: FND-003 — Enforce architecture boundaries
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

FND-001, FND-002, FND-004, and FND-005 are complete. All eight workspace
projects now execute build, lint, typecheck, and public-entry tests. GitHub and
pnpm report zero known dependency alerts. FND-003 is active.

This work changes only repository tooling and documentation. It involves no
application port, external-I/O adapter, or product invariant.

## Next steps

1. Enforce package dependency direction and public-only imports in FND-003.
2. Prove forbidden dependencies fail while desktop composition remains allowed.
3. Begin DOM-001 only after all Foundation exit conditions are verified.

## Risks and open decisions

- The default branch is currently named `master`; CI supports both `master` and
  `main`, but the intended long-term default has not been selected.
- Runtime choices for package testing and architecture-boundary enforcement are
  intentionally deferred to FND-002 and FND-003.
- `packages/timeline` remains a provisional boundary and may be merged inward
  only if implementation evidence justifies it, as allowed by the architecture
  contract.
- AI remains outside the MVP backlog even though its reserved package exists.
