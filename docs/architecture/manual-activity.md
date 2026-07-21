# Manual activity

A manual activity is an immutable sequence of user decisions. Every revision
retains the activity ID, receives a new decision ID, increments the revision,
and points to the decision it supersedes. Editing or stopping never mutates an
earlier revision.

An activity is either ongoing with a start instant or completed with a non-empty
half-open range. Title is required; category and ticket reference are optional.
The application repository atomically prevents a second ongoing activity and
uses optimistic decision IDs when appending revisions.

Completed creates and revisions return overlapping activity IDs. Overlap is
valid evidence for review: it is surfaced and never silently merged or rejected.
