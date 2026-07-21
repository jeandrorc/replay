# Epic 00 — Foundation

## Goal

Turn Release 0 into an executable, enforced workspace before product logic is
added.

## Stories

### [x] FND-001 — Lock and validate the workspace

As a contributor, I want reproducible dependency installation and root
validation so every change is checked consistently.

Acceptance criteria:

- `pnpm install --frozen-lockfile` succeeds from a clean checkout after
  committing `pnpm-lock.yaml`.
- `pnpm check` succeeds and runs formatting, linting, type checking, and tests.
- CI runs the same commands on macOS for pull requests and the default branch.
- Dependency caching never changes correctness.

Tests: validate a clean install and the CI workflow locally where practical.

Progress evidence (2026-07-21):

- The initial repository commit is `7c1622d`; reproducibility correction
  `c38b413` ensures nested commands use project pnpm 10.33.0 through Corepack.
- Frozen installation, `pnpm check`, and `pnpm build` pass from a clean clone of
  `c38b413`; typecheck, test, and build intentionally execute zero package tasks
  until FND-002 adds package scripts and entry points.
- `.github/workflows/ci.yml` runs the frozen install and root check on macOS for
  pushes to `main`/`master` and pull requests.
- Remaining before completion: configure a remote/default branch and observe a
  successful GitHub Actions run when publication is authorized.

Completion evidence (2026-07-21):

- `master` was published to `git@github.com:jeandrorc/replay.git` and became the
  default branch.
- GitHub Actions run
  [29837154774](https://github.com/jeandrorc/replay/actions/runs/29837154774)
  completed successfully on macOS in 24 seconds, including frozen installation
  and `pnpm check`.
- Dependency caching is performance-only: correctness remains guarded by the
  committed lockfile and `--frozen-lockfile`.
- CI feedback identified deprecated action runtimes; checkout and Node setup
  were upgraded to their current v7 major before handoff.

### [ ] FND-002 — Scaffold typed package entry points

As a contributor, I want every planned package to compile independently with a
public entry point.

Acceptance criteria:

- Each package has `src/index.ts`, `tsconfig.json`, build/typecheck/lint/test
  scripts, and an explicit `exports` map.
- Workspace dependencies follow `docs/architecture/package-boundaries.md`.
- No placeholder business interfaces or speculative domain types are introduced.
- Root `pnpm check` and `pnpm build` pass.

### [ ] FND-003 — Enforce architecture boundaries

As a maintainer, I want automated dependency rules so forbidden imports fail CI.

Acceptance criteria:

- A documented tool checks workspace dependency direction and deep imports.
- A fixture or test proves that a forbidden adapter-to-adapter dependency fails.
- The rule permits the desktop composition root to wire all adapters.
- The check is part of `pnpm check`.

### [x] FND-004 — Operationalize the agent development loop

As a maintainer, I want repository-native workflow sensors so coding agents can
identify the current work, validate progress, and leave reliable evidence for
the next session.

Acceptance criteria:

- The repository documents a repeatable orient, plan, implement, validate,
  review, and handoff loop.
- Exactly one backlog story may be in progress, and its ID must match exactly
  one active execution plan.
- Local Markdown links and required documentation entry points are checked
  mechanically.
- Turbo validation fails when an expected package task silently executes zero
  tasks after FND-002 enables that expectation.
- One root command runs all harness sensors and is included in `pnpm check`.
- Automated tests prove that malformed backlog state, missing links, and
  unexpected zero-task output fail without changing repository files.

Architectural constraints:

- Owning layer/package: repository tooling and documentation.
- Ports/adapters: none; scripts inspect repository-controlled files only.
- Forbidden dependencies/data: no product package imports, network access,
  external services, activity data, or new runtime dependency.
- ADR required: no; this operationalizes existing repository rules without
  changing product architecture.

Test obligations:

- Unit: pure parsing and validation behavior for every sensor.
- Integration: run sensors against the real repository state.
- Negative fixtures: multiple active stories, missing plan/link, and zero-task
  output when tasks are required.

Out of scope:

- Architecture dependency enforcement owned by FND-003.
- Package entry points and executable package tasks owned by FND-002.
- GitHub orchestration, autonomous merging, scheduled agents, and product code.

Completion evidence (2026-07-21):

- `pnpm install --frozen-lockfile`, `pnpm check`, and `pnpm build` pass.
- Seven Node tests cover valid state, multiple active stories, mismatched or
  missing active plans, local-link parsing, missing links without mutation, and
  required Turbo tasks executing zero work.
- The integration sensor validates 33 Markdown files and the matching active
  story/execution plan.
- Turbo zero-task enforcement is installed but intentionally disabled in
  `scripts/harness/config.json` until FND-002 creates executable package tasks.

### [~] FND-005 — Automate dependency vulnerability mitigation

As a maintainer, I want vulnerable dependencies detected and updated
continuously so known security defects do not accumulate unnoticed.

Acceptance criteria:

- All Dependabot alerts open on 2026-07-21 are resolved through patched direct
  or transitive dependency versions without weakening checks.
- A root security audit command fails on moderate-or-higher known
  vulnerabilities and runs in a dedicated GitHub Actions workflow.
- Dependabot checks the pnpm workspace and GitHub Actions weekly, groups related
  development-tool updates, and limits update noise.
- The security workflow runs on relevant dependency changes, weekly schedule,
  and manual dispatch using frozen installation and the project package manager.
- Documentation records alert scope, policy, automated response, and remaining
  limitations.

Architectural constraints:

- Owning layer/package: repository dependency tooling and GitHub automation.
- Ports/adapters: none; no product runtime behavior or user activity data.
- Dependency updates remain exact and lockfile-backed.
- ADR required: no; this adds an operational guardrail without changing product
  architecture.

Test obligations:

- `pnpm audit --audit-level moderate` reports no known vulnerabilities.
- Frozen installation, `pnpm check`, and `pnpm build` pass.
- GitHub Actions validates the security workflow after publication.

Out of scope:

- Automatic merging, major-version migration without review, runtime telemetry,
  and package scaffolding assigned to FND-002.
