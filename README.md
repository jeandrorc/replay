# Replay

Replay is a local-first activity timeline for developers. It captures small
pieces of work context, reconstructs understandable sessions, and exports a
reviewable worklog without turning the developer's computer into a surveillance
system.

This repository is currently at **Release 0**: architecture, engineering rules,
workspace configuration, and an executable backlog. It intentionally contains no
application implementation.

## Product principles

- Local-first and offline-capable by default.
- The user owns the data and confirms every exported worklog.
- Evidence is captured first; interpretation happens afterward.
- Manual activities are first-class timeline entries.
- IDE, AI provider, issue tracker, and export destination are replaceable
  adapters.
- AI may propose classifications and descriptions, but never invent evidence.

## Repository map

```text
apps/
  desktop/             Future Tauri desktop application
packages/
  domain/              Domain model and invariants
  application/         Use cases and ports
  collector/           Context-source adapters
  storage/             Persistence adapters
  timeline/            Deterministic session reconstruction
  exporter/            JSON and Markdown output adapters
  ai/                  Optional AI provider adapters
docs/
  architecture/        System contract and decisions
  backlog/             Epics, stories, and execution order
  product/             Product scope and vocabulary
```

## Start here

1. Read [the product vision](docs/product/vision.md).
2. Check [the current project status](docs/project-status.md).
3. Treat [the architecture](docs/architecture/architecture.md) as a contract.
4. Follow [the rules for coding agents](AGENTS.md).
5. Implement backlog items in the order listed in
   [the backlog index](docs/backlog/README.md).

## Release 0 checks

```sh
corepack enable
pnpm install
pnpm check
```

Continue the story identified in the project status. Do not add product
implementation before Epic 00 acceptance criteria are satisfied.
