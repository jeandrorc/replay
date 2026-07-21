# SQLite foundation

`packages/storage` owns SQLite connection, configuration, migrations, mapping,
and repository adapters. It uses `@tauri-apps/plugin-sql`, whose relative SQLite
connection URL resolves within Tauri-managed application data. Tests may supply
an isolated database name or a real temporary SQLite connection.

Startup enables and verifies WAL journal mode and foreign-key enforcement before
schema work. Migrations have positive, strictly increasing versions and execute
one at a time in an immediate transaction. A private ledger makes repeated
startup idempotent.

A failed migration is rolled back and does not advance the ledger. Replay
reports the failed version and instructs the user to close the app, back up the
database, and retry after resolving the error. Startup never deletes, replaces,
or silently repairs the database.

The connection boundary is infrastructure-only. Domain and application packages
do not import SQLite or Tauri, and database rows never cross the storage
adapter.
