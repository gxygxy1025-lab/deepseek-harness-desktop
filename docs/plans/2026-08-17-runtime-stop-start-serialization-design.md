# Runtime stop/start serialization design

## Problem

The controller coalesced concurrent starts but not concurrent stops. Two callers could replace `stopResolver`, issue duplicate process-tree termination commands, and leave the first stop promise unresolved. Stopping while startup was still pending also left the readiness promise alive. A later `restart()` then reused that unresolved promise instead of spawning a new runtime.

## Selected design

Add one controller-level `stopPromise`. The first stop owns state transition, readiness cancellation, process-tree termination, and exit waiting. Concurrent stops return the same promise. A start requested while that promise is active chains behind it; once stopping settles, the first queued start creates the replacement and later requests reuse its readiness promise.

The stop transition explicitly rejects an in-flight readiness promise with a bounded cancellation error, clears the startup watchdog, and removes its resolvers before terminating the child. This ensures every public start promise settles exactly once. It also prevents a queued replacement from overwriting the child reference while the old process still owns it.

The existing failed-startup cleanup gate remains separate because it starts after readiness has already rejected. If normal stop joins that cleanup, previously queued failed-startup retries are cancelled as before. Automatic restart timers remain cancelled by manual stop and by a direct manual start.

## Verification

- Two concurrent stop calls return one promise and issue one tree termination.
- Stopping during startup rejects the original readiness promise.
- A start requested during stopping does not spawn until the old child exits.
- Repeated queued starts produce only one replacement runtime.
- The replacement reaches ready and stops normally.
- Existing failed-startup, auto-restart, update recovery, real-host, and packaged tests remain green.
