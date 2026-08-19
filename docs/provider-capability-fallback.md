# Runtime Provider capability fallback

Desktop feature code negotiates optional Runtime Provider operations by capability id. Capability discovery is a compatibility signal, not an authorization mechanism; sender identity, loopback routing, path canonicalization, and input validation remain the security boundary.

## Optional Worktree execution

The Worktree path requires all of the following capabilities:

- `workspace.register`
- `session.create`
- `session.observe`

The coordinator checks the complete snapshot before creating a Worktree. If any capability is unavailable, it returns `shared-workspace-fallback` with the provider id, upstream version, capability statuses, and a bounded reason. The Task Board then uses its existing Session executor and keeps the fallback reason on the compact run. No fake Worktree id, branch, CWD, or isolated status is produced.

Capability negotiation and Worktree-creation failures can safely fall back before an isolated checkout is owned. Once a Worktree exists, workspace-registration failure, Session-creation failure, or a Session CWD mismatch is `blocked` and produces failed Evidence while retaining that Worktree for review. The coordinator never silently jumps into the main checkout after isolation has begun. Cancellation never calls Worktree removal; cleanup is an explicit review action.

## Stable and Candidate behavior

Stable exposes the proven lifecycle/profile provider surface. Optional workspace and Session methods are intentionally unsupported until an upstream typed face is available and tested. Candidate compatibility is proved with the deterministic execution fixture in `scripts/dsh-candidate-execution.mjs`; it checks the provider snapshot, registration arguments, exact Session CWD, start/completed/cancelled event semantics, and restart reconciliation. A Candidate report fails if any of these gates regress, and a failed Candidate cannot change Stable metadata.

## Evidence contract

Provider identity, capability status, and a boolean CWD-equality attestation are copied to compact run and Evidence records. The absolute CWD stays inside the trusted execution boundary. The record contains no provider object, Session event history, prompt, tool result, secret, or arbitrary command. This keeps diagnostics useful while keeping persisted state bounded and product-focused.
