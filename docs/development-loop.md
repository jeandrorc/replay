# Agent development loop

Replay development advances through small, evidence-backed stories. Humans set
intent and resolve product judgment; agents execute scoped work and improve the
repository harness when feedback exposes a missing guardrail.

## Loop

1. **Orient:** read `AGENTS.md`, `docs/project-status.md`, the sole active
   story, its execution plan when present, and linked architecture decisions.
2. **Frame:** state the owning layer, ports and adapters, invariants, required
   tests, allowed files, and explicit out-of-scope work.
3. **Plan:** break the story into independently verifiable increments. Use an
   execution plan for multi-step or multi-session work.
4. **Implement:** make the smallest change satisfying the next unchecked
   criterion. Do not pull speculative work from later stories.
5. **Sense:** run the narrowest relevant deterministic checks immediately, then
   the story checks, then `pnpm check` and any required build or manual checks.
6. **Review:** compare the diff with the story, architecture, privacy rules, and
   existing patterns. Inferential review supplements but never replaces
   deterministic checks.
7. **Handoff:** record commands, results, decisions, limitations, and the exact
   next step. Mark criteria only when their evidence exists.
8. **Improve:** when an error escapes, add the cheapest durable guardrail that
   would detect or prevent its recurrence.

## Harness improvement order

Prefer improvements in this order:

1. type or API design that makes invalid states unrepresentable;
2. deterministic test or repository sensor;
3. reusable script or fixture;
4. focused documentation close to the affected area;
5. a global `AGENTS.md` rule only when it applies repository-wide.

## Stop conditions

Stop and request human direction when acceptance criteria conflict with the
architecture, a durable decision lacks validated intent, external state or
authorization is required, privacy scope would expand, or verification cannot
distinguish success from a false positive.

An agent must not close a story merely because checks are green. A check that
executes no meaningful work is evidence of a harness gap, not product quality.
