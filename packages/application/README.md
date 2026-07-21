# `@replay/application`

Application use cases plus inbound and outbound ports. It may depend only on
`@replay/domain`. Concrete adapters and UI concerns are forbidden.

`RecordCapturedEvent` supplies identity and observation time through ports and
persists atomically by observation ID. See the
[event-ingestion contract](../../docs/architecture/event-ingestion.md).
