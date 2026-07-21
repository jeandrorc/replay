# ADR-0002: Immutable events and deterministic timeline

- Status: Accepted
- Date: 2026-07-17

## Context

Users need to trust why Replay attributed time. Editing captured facts in place
would erase evidence, and opaque AI inference would make results irreproducible.

## Decision

Persist captured events as immutable versioned facts. Store user corrections as
separate review decisions. Build sessions with a versioned deterministic
algorithm before any optional AI enrichment.

## Consequences

Storage retains both evidence and decisions, and algorithm changes may require
rebuilding proposals. The resulting reports are explainable, testable,
reproducible, and usable offline.
