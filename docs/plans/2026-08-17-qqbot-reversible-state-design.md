# Reversible QQ Bot state changes

## Problem

QQ Bot binding currently persists four coupled pieces of state in sequence:
the encrypted credential file, the profile patch, the runtime environment, and
the restarted DSH process. Unbind performs the inverse sequence. A failure in
the middle leaves earlier steps committed even though the UI reports failure.

For example, if restart fails after binding, the service remains logically
unbound while credentials are stored and the profile bundle is enabled. A
later desktop launch can unexpectedly activate that partial binding. If
unbind restart fails, the credential file may already be deleted while the
in-memory service still reports the old account.

## Options considered

1. Retry only the failed restart. This helps transient process failures but
   cannot repair credential-store or profile-write failures.
2. Snapshot and rewrite the raw credential and patch files in the Electron
   bootstrap. This provides exact bytes but leaks persistence details into the
   binding service and bypasses its existing atomic storage abstractions.
3. Record successful semantic mutations and compensate them in reverse order.
   Restore credentials through the credential store, restore profile state
   through the profile setter, restore runtime credentials, then perform one
   bounded recovery restart when runtime-visible state changed.

Option 3 is selected.

## Transaction behavior

Binding does not publish `bound` or assign in-memory credentials until every
step and the restart succeed. If a later step fails, it clears newly stored
credentials, restores the previous profile enabled state when the setter
reported a change, clears runtime credentials, and restarts only when
runtime-visible state may have changed.

Unbind keeps the previous in-memory credentials until commit. On failure it
rewrites the encrypted credentials, re-enables the profile only when unbind
changed it, restores runtime credentials, and performs a recovery restart.

All rollback steps are attempted even if one compensation fails. The surfaced
error contains both the original failure and bounded rollback failures so the
user is never told that recovery succeeded when it did not.

## Verification

- Binding restart failure restores disk, profile, runtime credentials, and an
  unbound service state.
- Unbind restart failure restores the previous bound state and credentials.
- Rollback failure reports both the forward and recovery errors.
- Existing synchronous/asynchronous connector and cancellation tests remain
  green.
