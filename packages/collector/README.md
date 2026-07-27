# `@replay/collector`

Adapters for macOS active-application, Git context, and system idle/lifecycle
evidence. Collection is minimal, permission-aware, and implements
application-owned ports.

The first implemented source observes the foreground macOS application through
an application-owned port. It exposes only application name and bundle
identifier, reports permission or availability failures as actionable health,
and emits evidence only on context change or the configured heartbeat.
