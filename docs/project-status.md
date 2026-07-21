# Project status

- Last reviewed: 2026-07-21
- Current release: Release 0 — executable foundation
- Current epic: [Epic 00 — Foundation](backlog/epics/00-foundation.md)
- Current story: FND-001 — Lock and validate the workspace
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
The GitHub Actions workflow has been inspected but has not run remotely because
the repository has no commits yet.

## Current step

FND-004 is complete. FND-001 is active again and retains its partial evidence;
it should be marked done only after the initial repository commit allows
verification from a clean checkout and the CI job succeeds on the remote
repository.

This work changes only repository tooling and documentation. It involves no
application port, external-I/O adapter, or product invariant.

## Next steps

1. Create the initial commit and run CI from the resulting clean repository.
2. Record that evidence and complete FND-001 if both checks pass.
3. Start FND-002 by adding only typed public entry points, per-package
   TypeScript configuration, exports, and executable build/check scripts.
4. Enable required Turbo task enforcement for build, typecheck, and test.
5. Complete FND-003 before introducing domain behavior.
6. Begin DOM-001 only after all Foundation exit conditions are verified.

## Risks and open decisions

- The default branch is currently named `master`; CI supports both `master` and
  `main`, but the intended long-term default has not been selected.
- Runtime choices for package testing and architecture-boundary enforcement are
  intentionally deferred to FND-002 and FND-003.
- `packages/timeline` remains a provisional boundary and may be merged inward
  only if implementation evidence justifies it, as allowed by the architecture
  contract.
- AI remains outside the MVP backlog even though its reserved package exists.
