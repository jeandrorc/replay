# Event persistence

The SQLite adapter implements the application-owned observed-event repository.
Its private table stores observation ID, accepted event ID, canonical UTC
timestamps, original kind, payload version, and payload JSON. No row type is
exported.

`observation_id` is the idempotency key. An atomic insert preserves the first
accepted fact, and a duplicate returns that original event. Event IDs are also
unique. Queries use a half-open UTC range, require an explicit limit between 1
and 10,000, and order by occurrence then event ID for deterministic ties. The
`(occurred_at, event_id)` index supports daily timeline reads.

Known payloads are validated through domain factories when loaded. Original
payload versions round-trip unchanged. Unknown kinds retain their raw JSON in
SQLite, but the domain receives only original kind and a lowercase SHA-256
digest as quarantine metadata. Reading does not rewrite or reinterpret rows.

The first schema is an append-only migration in `replayMigrations`. Repository
contract tests run against both a memory implementation and temporary real
SQLite databases; SQLite-specific tests additionally verify compatibility and
the query plan.
