# MVP backlog

This backlog is the source of planned work. It is ordered to keep every
increment testable and to delay optional complexity. Work on one story at a
time; mark a checkbox only after all acceptance criteria and the repository
definition of done are satisfied.

Current execution state and verification evidence are recorded in
[the project status](../project-status.md).

## Status legend

- `[ ]` not started
- `[~]` in progress (only one story should be in progress)
- `[x]` done
- `[!]` blocked, with the reason recorded under the story

## Delivery waves

| Order | Epic                                             | Outcome                                      | Depends on |
| ----: | ------------------------------------------------ | -------------------------------------------- | ---------- |
|     0 | [Foundation](epics/00-foundation.md)             | Enforced build and package boundaries        | —          |
|     1 | [Domain and capture](epics/01-domain-capture.md) | Validated local events and manual activities | 0          |
|     2 | [Storage](epics/02-storage.md)                   | Durable, migratable local event storage      | 1          |
|     3 | [Automatic collection](epics/03-collection.md)   | Minimal macOS and Git evidence               | 1, 2       |
|     4 | [Timeline](epics/04-timeline.md)                 | Explainable daily sessions and gaps          | 1, 2       |
|     5 | [Desktop review](epics/05-desktop.md)            | Menu-bar capture and timeline correction     | 2, 3, 4    |
|     6 | [Export and privacy](epics/06-export-privacy.md) | Safe daily files and data controls           | 2, 5       |
|     7 | [MVP validation](epics/07-validation.md)         | Shippable build and five-day trial           | 0–6        |

AI summarization and external integrations are deliberately outside the MVP
backlog.

## Current position

- Epic 00 is in progress.
- FND-001 and FND-004 are complete and the repository-native development harness
  is active.
- FND-002 and FND-005 are complete. FND-003 is the only active story and will
  convert the documented package-boundary matrix into an executable CI rule.
- Product implementation must not begin before Epic 00 is complete.

## Backlog rules

- A story must be independently reviewable and leave the main branch healthy.
- Product behavior not present in the vision or a story must be proposed before
  implementation.
- If a story reveals a durable architectural choice, write an ADR in the same
  change.
- Split a story when it cannot reasonably be implemented and verified in one
  focused change.
- Do not pull work from a later wave to make an earlier story “future-proof.”
