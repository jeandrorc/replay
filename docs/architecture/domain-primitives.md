# Domain primitives

This document defines the observable contract for the first Replay value
objects. These rules belong to the pure domain and require no clock, identifier
generator, timezone database, or external I/O.

All value-object instances are frozen at runtime as well as readonly in
TypeScript.

## UTC instant

A `UtcInstant` is an exact millisecond on the UTC timeline.

- Text input uses canonical `YYYY-MM-DDTHH:mm:ss.sssZ` form.
- Offset timestamps, omitted milliseconds, impossible calendar dates,
  non-integer epoch values, and values outside four-digit ISO years are invalid.
- Serialization always returns the same canonical UTC form.
- Ordering and equality compare epoch milliseconds.

For example, `2026-07-21T12:34:56.789Z` is valid, while
`2026-07-21T09:34:56.789-03:00` is not a domain representation. Presentation
adapters may convert the instant to a local timezone without changing it.

## Time range

A `TimeRange` is a non-empty half-open interval `[start, end)`.

- `end` must be later than `start`; zero and negative durations are invalid.
- The start belongs to the range and the end does not.
- Adjacent ranges do not overlap.
- Duration is elapsed UTC milliseconds, independent of midnight or daylight
  saving transitions in a presentation timezone.
- Equality requires equal start and end instants.

## Identifier

An `Identifier<Kind>` is an opaque, kind-specific value supplied to the domain.

- The domain validates and compares identifiers but never generates them.
- Values must be non-empty, at most 128 characters, free of leading or trailing
  whitespace, and free of control characters.
- The application layer will own the identifier-generation port when a use case
  first requires creation.
- Equality compares the complete supplied value; Replay does not normalize it.

## Validation failures

Invalid construction throws `DomainValidationError` with a stable code. Error
messages are diagnostic text, not presentation copy or a persistence contract.
