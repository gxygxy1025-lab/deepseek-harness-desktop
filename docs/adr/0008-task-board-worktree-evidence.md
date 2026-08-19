# ADR-0008: Task Board Worktree execution and derived Evidence

## Status

Accepted for Desktop 2.6.0.

## Decision

Task Board v3 stores Projects, compact Task Runs, and derived Evidence in a Host-owned ledger. Git Graph owns Worktree creation, status, diff, commit, merge, and removal. The renderer communicates through ID-only loopback routes. A typed Runtime Provider boundary negotiates workspace registration and Session lifecycle. Missing optional capabilities or pre-creation failure produces an explicit shared-workspace fallback; after a Worktree exists, registration, Session creation, or exact-CWD failure blocks execution and retains failed Evidence for review.

Evidence stores bounded changed-file statistics, revisions, clean/dirty state, a capped preview, deep links, provider capability evidence, and an audit trail. It never stores full Session history, tool result payloads, secrets, raw patches, or arbitrary Git argv. Review is explicit: Commit, Merge, Keep, and two-step Discard. Cancellation only cancels the Session and leaves cleanup to review.

## Rationale

The v2 execution ledger is useful for compatibility but cannot explain isolation, provider fallback, or the result a user is approving. A compact v3 model adds those references without copying sensitive or unbounded Session data. Keeping Git operations in the Host half lets the existing realpath, loopback, shell-free runner, and atomic persistence fences remain the enforcement point.

## Consequences

- Existing v2 data remains recoverable through a copy-first migration and backup marker.
- Stable Runtime does not claim Worktree support until its optional typed capabilities are available.
- Worktree creation and diff collection add filesystem and Git work only when a user selects isolation; shared tasks keep the previous path.
- Review is intentionally user-driven, so cancelled or failed Worktrees may remain until the user chooses Keep or Discard.
- Candidate verification must include CWD and lifecycle event compatibility, not only package exports.
