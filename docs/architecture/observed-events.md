# Observed events

`ObservedEvent` is an immutable fact whose envelope contains `id`, `occurredAt`,
`observedAt`, `source`, `kind`, `payloadVersion`, `payload`, and `privacyClass`.
Factories derive source and privacy from the payload kind instead of trusting
caller-supplied classifications.

Initial kinds are active application name and bundle identity, Git repository
context, idle/resume, capture pause/resume, and user-authored manual activity.
Application name remains optional only when reading records created before
COL-001; every newly captured active-application event supplies it. Event fields
exclude window titles, file contents, diffs, URLs, prompts, secrets, and other
prohibited capture.

Unknown persisted kinds are quarantined as their bounded original kind, positive
payload version, and a supplied lowercase SHA-256 digest. Replay does not load
an unknown raw payload into the domain, so retention cannot bypass the privacy
allowlist. Storage may preserve the original record separately under its
compatibility and quarantine policy.
