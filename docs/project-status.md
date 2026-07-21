# Project status

- Last reviewed: 2026-07-21
- Current release: Release 0 — executable foundation
- Current epic:
  [Epic 01 — Domain and capture](backlog/epics/01-domain-capture.md)
- Current story: DOM-002 — Model versioned activity events
- Overall state: domain primitives complete; event modeling ready

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

Epic 00 and DOM-001 are complete. Package boundaries remain enforced against
manifests and parsed TypeScript imports, and pnpm reports zero known dependency
vulnerabilities. DOM-002 is active.

The active story changes only the pure domain layer. It has no application port
or external-I/O adapter and must preserve unsupported event kinds as opaque
evidence.

## Next steps

1. Define the event envelope, privacy classes, sources, and version rules.
2. Model the initial event kinds without prohibited capture fields.
3. Preserve unsupported kinds and versions as opaque evidence.
4. Prove event immutability and JSON-safe payload boundaries.

## Risks and open decisions

- The default branch is currently named `master`; CI supports both `master` and
  `main`, but the intended long-term default has not been selected.
- `packages/timeline` remains a provisional boundary and may be merged inward
  only if implementation evidence justifies it, as allowed by the architecture
  contract.
- AI remains outside the MVP backlog even though its reserved package exists.
