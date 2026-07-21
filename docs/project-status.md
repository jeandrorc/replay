# Project status

- Last reviewed: 2026-07-21
- Current release: Release 0 — executable foundation
- Current epic:
  [Epic 01 — Domain and capture](backlog/epics/01-domain-capture.md)
- Current story: APP-001 — Record a captured event
- Overall state: domain event model complete; first use case ready

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
instants, half-open time ranges, typed identifiers, and stable validation
errors. There are no use cases, adapters, Tauri application code, migrations, or
persisted event models yet.

## Verified on 2026-07-21

From the current working tree:

```text
pnpm architecture:check  PASS (6 policy tests; 8 projects checked)
pnpm check               PASS (all required package tasks executed)
pnpm build               PASS (8 package tasks)
pnpm security:audit      PASS (no known vulnerabilities)
```

The current tests cover the development harness, architecture policy, each
package's importable public entry point, and ten DOM-001 domain behaviors.

## Current step

Epic 00, DOM-001, and DOM-002 are complete. Package boundaries remain enforced
against manifests and parsed TypeScript imports, and pnpm reports zero known
dependency vulnerabilities. APP-001 is active.

The active story changes the application layer and defines clock, identifier,
and repository ports. Only controllable test fakes act as adapters.

## Next steps

1. Define the required application ports and collector input boundary.
2. Record accepted events with application-supplied identity and time.
3. Prove duplicate observations are idempotent.
4. Map repository failures without leaking payload data.

## Risks and open decisions

- The default branch is currently named `master`; CI supports both `master` and
  `main`, but the intended long-term default has not been selected.
- `packages/timeline` remains a provisional boundary and may be merged inward
  only if implementation evidence justifies it, as allowed by the architecture
  contract.
- AI remains outside the MVP backlog even though its reserved package exists.
