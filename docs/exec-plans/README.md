# Execution plans

Execution plans preserve state across agent sessions. Small, single-session
changes may keep their plan in the story; multi-step or harness-changing work
uses a versioned plan here.

- `active/` contains exactly one plan whose story is marked `[~]` in the
  backlog.
- `completed/` contains immutable handoff records for completed plans.
- A plan moves to `completed/` only after its story criteria are verified.

Plans record facts, decisions, commands, and remaining uncertainty. They do not
replace backlog acceptance criteria or architecture documents.
