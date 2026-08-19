# Git Worktree execution and review

Desktop 2.6 uses Git Worktrees to give an eligible Task Run an isolated checkout without changing the branch, index, or files in the user's main workspace. Worktree support is optional: shared workspace remains the default, and an unavailable Runtime Provider capability is reported before an isolated run is attempted.

## Ownership boundary

Git Graph owns the Worktree lifecycle in the Host process. Task Board calls the typed Worktree service and Runtime Provider boundary; it does not run Git or call an upstream Workspace or Session object directly. Renderer code sends opaque identifiers and bounded review inputs only.

The Host-only service accepts these operations:

| Operation | Required input | Result |
| --- | --- | --- |
| `listWorktrees` | `workspaceId` | Renderer-safe Worktree summaries |
| `createWorktree` | `workspaceId`, `taskId`, `runId` | A controlled Worktree reference |
| `getWorktreeStatus` | `worktreeId` | Branch, revision, dirty/conflict state, relative file summaries |
| `diffWorktree` | `worktreeId`, bounded preview options | Git Graph file statistics and capped preview |
| `commitWorktree` | `worktreeId`, bounded message | Explicit commit result |
| `mergeWorktree` | `worktreeId`, validated target branch | Explicit merge result after preflight |
| `removeWorktree` | `worktreeId`, review flags | Removal result; branch preserved by default |

Absolute repository roots and Worktree paths never appear in renderer route responses. The provider CWD is composed inside the trusted Host boundary.

## Controlled paths and branches

The Host resolves the workspace from its registration, canonicalizes the root with `realpath`, asks Git for the repository top level, and verifies that the repository remains inside the registered workspace. It rejects a non-Git directory and a bare repository.

Worktrees are placed below:

```text
DSH_HOME/worktrees/<sha256-repository-prefix>/<run-id>
```

The branch is generated from trusted task/run identifiers:

```text
dsh/task/<task-slug>-<run-slug>
```

Identifiers and slugs are length bounded. All Git commands use the existing managed subprocess runner with a separate argv array. No shell command string, absolute renderer path, or arbitrary Git argv crosses the route boundary.

## Creation preflight

Before creating a Worktree, the service verifies:

- the workspace is registered and its canonical repository stays in scope;
- the repository is non-bare;
- there is no unresolved merge conflict;
- merge, rebase, cherry-pick, revert, or bisect is not in progress;
- the base revision exists;
- the generated task branch does not already exist or belong to another Worktree;
- the controlled destination does not already exist;
- at least 64 MiB remains available in the controlled Worktree storage;
- the Worktree parent can be created and Git can populate the checkout.

A failed checkout is removed through Git before an error is returned. Failures are typed and never cause Task Board to claim that shared execution was isolated.

## Commit, merge, keep, and discard

Commit is user initiated. It validates the message, rejects conflicts or an operation in progress, stages with `git add --all`, and commits inside the task Worktree. The Worktree and generated branch remain available after Commit.

Merge is also user initiated. It requires:

- a clean task Worktree;
- no unresolved Worktree conflict or operation;
- the requested target branch to exist;
- the main workspace to already have that target branch checked out;
- a clean main workspace;
- no main-workspace Git operation;
- a successful `git merge-tree` conflict preflight.

The service never switches the main workspace branch. A conflict preflight failure stops before modifying it and returns manual recovery guidance through the typed error.

Keep retains the branch and Worktree for later inspection. Ordinary removal defaults to `preserveBranch: true` and rejects a dirty Worktree. Discard is the only force-removal path: it requires the user's second confirmation and the literal Host confirmation token, then removes the controlled Worktree and safely deletes only its generated task branch.

Cancellation never removes a Worktree or branch.

## Registry and restart recovery

The Host persists a bounded registry at `DSH_HOME/worktrees/registry.json` using a private temporary file and atomic rename. On startup it compares registered rows with `git worktree list --porcelain`; missing checkouts become `orphaned` rather than being silently deleted.

Task Run reconciliation uses the persisted `runId`, `sessionId`, `workspaceId`, and `worktreeId`. It looks up the existing provider Session and Worktree and does not call create or prompt again. If the provider Session is gone, the run becomes explicitly blocked/cancelled and the Worktree is left for review.

## HTTP fence

The loopback surface is:

```text
POST /git-worktree/list
POST /git-worktree/create
POST /git-worktree/status
POST /git-worktree/diff
POST /git-worktree/commit
POST /git-worktree/merge
POST /git-worktree/remove
```

Requests must be loopback, same-origin, JSON, and at most 256 KiB. Create accepts only `workspaceId`, `taskId`, and `runId`; its base revision is resolved by the Host. Responses remove `path` and `repoRoot`. Diff paths are repository-relative summaries.

## Verification

From the repository root:

```powershell
pnpm --filter @linxin666/dsh-client-ui-git-graph typecheck
pnpm --filter @linxin666/dsh-client-ui-git-graph test
node --test scripts/dsh-candidate-execution.test.mjs
```

The focused tests use real temporary Git repositories and Worktrees. They verify isolation of the main checkout, path/slug controls, dirty-removal refusal, explicit discard, status/diff evidence, merge preflight, registry reconciliation, and Candidate CWD semantics.
