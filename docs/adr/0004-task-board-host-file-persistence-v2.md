# ADR-0004: Task Board Host-file persistence v2

## Status

Accepted for Desktop 2.4.0.

## Context

The Task Board v1 ledger lived only in browser `localStorage`. Its origin includes the DSH port, so profile changes, port changes, or browser state loss could make the board appear empty. Multiple tabs synchronized through storage events, while the browser scheduler still needed to remain the only component that starts scheduled work.

## Decision

The Host owns a schema version 2 document at `DSH_HOME/profiles/<profile>/state/task-board/tasks-v2.json`. Profile identity comes from the plugin configuration, defaulting to the runtime's `DSH_PROFILE`. Mutations are serialized, written to a private temporary file, parsed back for verification, and atomically renamed over the target. Corrupt documents are renamed aside and preserved for diagnosis before an empty in-memory ledger is returned.

The Host exposes only fixed loopback, same-origin GET/PUT/DELETE routes and one SSE event route. Requests cannot supply paths. Clients prefer Host storage and fall back to `dsh.taskBoard.v1` only when the Host endpoint is unavailable. If the Host ledger is empty, the client copies v1 once, reads it back, verifies task count and deterministic content hash, and only then writes a migration marker. The v1 key is retained throughout 2.4.x.

Persisted execution data contains task fields and references such as run, workspace, session, start, and finish identifiers/timestamps. It does not copy model messages, tool transcripts, or full session history. Live cross-tab refresh uses Host mutation events over SSE, not high-frequency polling.

## Consequences

- Task data follows the selected DSH profile and is independent of the runtime port.
- Failed migrations retain the complete v1 source and fall back without destructive cleanup.
- Host writes are recoverable and cannot be redirected outside the profile state directory.
- Scheduled execution still requires an open browser page; this decision does not introduce background scheduling, missed-run replay, Presets, Worktrees, or a public task SDK.

## Alternatives Considered

Deleting v1 immediately was rejected because rollback would become lossy. Persisting complete model history was rejected because the session remains the source of truth and may contain sensitive or large data. Host polling was rejected because SSE provides mutation-driven synchronization with one long-lived connection.
