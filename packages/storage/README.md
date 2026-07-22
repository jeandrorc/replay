# `@replay/storage`

SQLite repository, transaction, serialization, and migration adapters. Storage
schemas are private; domain and application objects cross the port boundary.

The foundation uses the official Tauri SQL plugin in production and exposes a
small database boundary for real SQLite integration tests. Startup explicitly
enables WAL and foreign keys before applying ordered, append-only migrations.

The observed-event repository performs atomic idempotent appends and bounded,
indexed UTC-range queries. Known payloads map through domain factories; unknown
raw payloads stay private in SQLite and surface only as quarantine metadata.

Review adapters persist append-only manual revisions, confirmation decisions,
and validated local settings. Related writes use serialized transactions;
corrupt rows fail with typed, non-destructive recovery guidance.
