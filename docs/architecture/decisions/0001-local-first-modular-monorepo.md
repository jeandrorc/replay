# ADR-0001: Local-first modular monorepo

- Status: Accepted
- Date: 2026-07-17

## Context

Replay needs native collection, a desktop UI, pure business rules, and
replaceable infrastructure. The MVP must work without accounts or external
services while remaining evolvable.

## Decision

Use a pnpm monorepo with independently bounded TypeScript packages and a Tauri
desktop composition root. Apply hexagonal dependency direction. Persist MVP data
locally through a SQLite adapter.

## Consequences

Package boundaries add some mapping and setup cost. In return, domain and
use-case tests remain fast, native and storage details are replaceable, and
optional integrations cannot become core dependencies.
