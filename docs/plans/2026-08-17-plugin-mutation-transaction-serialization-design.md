# Plugin mutation transaction serialization design

## Problem

The plugin manager serializes individual package operations, but the desktop owns a wider transaction: prepare a candidate, stop the runtime, mutate the profile, reconcile managed files, restart the runtime, and commit or roll back. Concurrent IPC requests can leave the plugin manager queue between those phases. A second mutation may then edit the profile while the first request is rebuilding it or restarting DSH.

Removal recovery also starts the runtime in the background and immediately returns the original error. The next request can begin before recovery settles, and a failed recovery is silently discarded. In addition, `PluginManager.remove()` has no profile snapshot, so a pnpm failure after partially changing `package.json` or the lockfile can leave an unreported partial uninstall.

## Selected design

Keep registry inspection and package-store warming outside downtime so candidate preparation remains responsive. Add a desktop-level mutation queue around the complete stop, mutation, profile reconciliation, restart, and transaction commit or rollback sequence. Failed mutations await runtime recovery before releasing the queue. If recovery fails, return one bounded aggregate error containing both failures.

Make removal transactional inside `PluginManager` using the same manifest and lockfile snapshot mechanism as prepared updates. Any failure after mutation begins restores both inputs and runs an offline install before reporting the original operation as rolled back. A failed rollback is reported separately with both causes.

A successful removal remains reversible until the rebuilt runtime reaches ready state. Only then does the desktop commit it. If profile reconciliation or runtime startup fails, the desktop restores the previous plugin, rebuilds the old profile, and starts that known state before reporting the original error.

The IPC mutation queue also exposes a quiescence gate. Desktop shutdown closes the gate before stopping DSH, rejects newly queued mutations, and waits for the active transaction to settle. A failed shutdown or updater recovery reopens the gate; final disposal leaves it closed. This prevents a late plugin transaction from spawning a replacement runtime after the installer has begun shutdown.

## Verification

- An IPC test holds the first runtime restart and proves a second removal cannot even stop the runtime until the first request finishes.
- An IPC test proves a failed removal waits for recovery and exposes a recovery failure.
- A filesystem test simulates pnpm partially changing the manifest and lockfile before failing, then verifies exact restoration.
- A removal transaction test proves runtime startup is the commit point and the prior profile remains recoverable until then.
- Shutdown tests prove quiescence drains active work before runtime stop, rejects new work, and resumes only when the desktop recovers.
- Desktop, Electron E2E, full workspace, packaged smoke, and package integrity checks cover integration regressions.
