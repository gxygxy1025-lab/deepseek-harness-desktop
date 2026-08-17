# Runtime retry cleanup gate design

## Problem

`DshRuntimeController` rejected its readiness promise immediately after a startup failure, then terminated the failed child process tree in the background. A user retry could therefore replace `controller.child` before the failed child emitted `exit`. The old exit handler would subsequently clear the new child reference and move the controller back to `crashed`; with automatic restart enabled it could also schedule another runtime. This creates overlapping processes, stale state transitions, and file-lock pressure during updates or uninstall.

## Approaches

Rejecting retries while cleanup is active avoids overlap but requires another user action. Adding only child identity checks prevents stale events from corrupting the current state, but still permits two runtime trees to overlap. The selected design queues retry requests behind one shared cleanup promise and also binds exit handlers to their child identity. Multiple retries coalesce naturally because the first post-cleanup start installs the shared readiness promise.

## State flow

Failure still rejects the current readiness promise immediately so the UI can show diagnostics. If a child exists, cleanup installs an exit waiter, starts tree termination, and arms the existing force-kill fallback. `start()` called during that interval returns a promise chained to cleanup rather than spawning. Once exit is observed, a manual retry cancels any automatic restart timer and creates exactly one replacement child. Exit events from a child that is no longer current are diagnostic-only and cannot clear or crash the active runtime.

`stop()` can continue to own normal shutdown; failed-startup cleanup remains bounded by the existing process-tree termination and force-kill path. Preflight and synchronous spawn failures have no child and therefore need no gate.

If shutdown begins while failed-startup cleanup is active, `stop()` joins that
same cleanup rather than issuing a second tree-termination command. Any retry
already queued behind the cleanup is cancelled before it can spawn. Diagnostic
log persistence is best-effort throughout this path: a slow or failed log write
cannot delay readiness, tree termination, or the force-kill fallback.

## Verification

- A retry issued immediately after a parse/startup failure does not spawn until the failed child exits.
- Repeated retry calls share the replacement readiness promise.
- Stop joins the existing cleanup, cancels a queued retry, and terminates once.
- A blocked diagnostic log cannot block the force-cleanup fallback.
- The replacement reaches ready and stops normally.
- Existing timeout, automatic restart, update recovery, real-host integration, and packaged smoke tests remain green.
