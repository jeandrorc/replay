# Event ingestion

`RecordCapturedEvent` is the application boundary between collector observations
and accepted domain facts. Collector input cannot supply the accepted event ID,
observation time, source, or privacy class.

The use case obtains identity from `ObservedEventIdGeneratorPort` and time from
`ClockPort`. `ObservedEventRepositoryPort.saveIfAbsent` atomically persists by
observation ID. A duplicate returns the originally accepted event and creates no
second persisted fact.

Domain validation becomes `invalid_collector_input`. Repository exceptions
become `repository_unavailable`; public messages contain neither payload fields
nor adapter causes.
