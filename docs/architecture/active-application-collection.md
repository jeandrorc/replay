# Active application collection

The application layer owns the active-application source port. A successful
observation contains exactly an application name and bundle identifier. A failed
observation contains a typed `permission_required` or `unavailable` health state
with user-facing guidance instead of throwing through the polling loop.

The macOS adapter uses the system JavaScript bridge to query `NSWorkspace` for
the foreground application and the Accessibility trust API for permission state.
Native results are decoded into the explicit port shape; window titles, document
names, URLs, contents, keystrokes, screenshots, and any unrecognized fields are
discarded at the adapter boundary.

The collector owns emission state independently of the adapter. It emits the
first successful observation, a changed application identity, or an unchanged
identity once the configured heartbeat is due. An injected UTC clock makes the
policy deterministic. Health observations neither advance the heartbeat nor
replace the last known application identity.

New active-application events require both allowed identity fields. The domain
accepts a missing application name only when restoring data written before this
collector existed. Storage serializes the allowlisted payload without direct
knowledge of macOS APIs.
