# Product vision

## Problem

Developer work is fragmented across editors, terminals, repositories, research,
reviews, and meetings. Reconstructing that work at the end of a day is tedious
and unreliable. Conventional trackers demand constant manual timers or behave
like surveillance systems.

## Vision

Replay reconstructs a private, explainable timeline from minimal local evidence.
It helps a developer remember, correct, and export their day; it does not judge
productivity or fabricate hours.

## MVP outcome

At the end of a workday, a user can:

1. inspect automatically detected and manually entered activity;
2. understand why Replay proposed each time block;
3. correct titles, times, categories, and ticket references;
4. export a versioned JSON file and a readable Markdown report;
5. complete the whole flow without an account, network connection, or external
   integration.

## MVP scope

### Included

- macOS menu-bar desktop application;
- capture of active application metadata and Git repository context;
- explicit idle detection and unclassified gaps;
- quick manual activity and start/stop activity flows;
- local SQLite persistence;
- deterministic timeline reconstruction with confidence and evidence;
- timeline review and editing;
- JSON and Markdown file export;
- privacy controls, retention, pause, and local deletion.

### Excluded

- Jira, GitHub, Linear, calendar, or cloud synchronization;
- automatic submission of worklogs;
- accounts, teams, dashboards, productivity scoring, or employee monitoring;
- Windows and Linux support;
- source-code content, keylogging, clipboard capture, screenshots, or
  browser-history capture;
- mandatory LLM use. Optional summarization is post-MVP.

## Users

The first user is an individual developer required to explain or report time
across tasks. The user values low friction, trustworthy data, privacy, and the
ability to override every inference.

## Success criteria

The MVP is validated when one developer uses it for five working days and can
prepare a daily worklog in under five minutes, while correcting fewer than 20%
of proposed activity duration.

## Ethical boundary

Replay reports evidence-backed activity. It must not manufacture an eight-hour
total, silently fill gaps, or present estimates as facts. Unknown time stays
unknown until the user classifies it.
