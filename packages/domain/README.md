# `@replay/domain`

Pure domain types, invariants, value objects, and errors. It has no workspace or
runtime dependency and performs no I/O.

The public primitives are `UtcInstant`, `TimeRange`, `Identifier<Kind>`, and
`DomainValidationError`. Their observable semantics are documented in the
[domain primitives contract](../../docs/architecture/domain-primitives.md).
