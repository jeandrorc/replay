# Dependency security

Replay treats dependency vulnerability management as a repository-owned feedback
loop. Automation detects and proposes changes; a maintainer or coding agent
still reviews behavior, lockfile scope, checks, and release risk before merge.

## Policy

- Direct dependencies use exact versions and the committed pnpm lockfile.
- Moderate, high, and critical known vulnerabilities fail `pnpm security:audit`.
- Low-severity findings are reviewed and tracked, but do not fail the audit by
  default.
- Security fixes use the smallest compatible direct upgrade that removes the
  vulnerable resolved package.
- Automatic merging is disabled. Dependency changes must pass the normal CI and
  security workflows.

## Automated loop

1. Dependabot checks npm dependencies and GitHub Actions every Monday.
2. Minor and patch development-tool updates are grouped to reduce pull-request
   noise; major updates remain independently reviewable.
3. The Security workflow runs when dependency manifests, the lockfile, or its
   own automation changes. It also runs weekly and by manual dispatch.
4. The workflow installs with `--frozen-lockfile` and executes
   `pnpm security:audit` on macOS with the project pnpm version.
5. A failed audit blocks the change until a patched version or documented
   exception is reviewed. Exceptions must be localized, time-bounded, and may
   not weaken the global severity threshold silently.

## Initial remediation

On 2026-07-21, GitHub reported eight alerts: one high, five moderate, and two
low. They originated from `turbo@2.5.5`, plus `markdown-it@14.1.0` and
`js-yaml@4.1.0` through `markdownlint-cli2`.

The direct upgrades to `turbo@2.10.5` and `markdownlint-cli2@0.23.1` resolve to
patched versions, including `markdown-it@14.3.0` and `js-yaml@5.2.1`.

## Limitations

- Audit results depend on the package-registry advisory service being reachable
  and current.
- Absence of a known advisory does not prove a dependency is secure.
- Dependabot and pnpm may publish advisories at different times; GitHub alert
  closure is verified separately after lockfile publication.
- Product runtime dependencies, when introduced, may require a stricter
  release-blocking policy than current development-only tooling.
