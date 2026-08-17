# Desktop runtime termination state design

## Problem

Desktop startup failures currently kill only the direct Node child. On Windows the
runtime can already have descendants, so a timeout or invalid ready URL can leave
processes behind. Separately, the Electron shutdown lifecycle catches a runtime
stop error and still marks the runtime as stopped. Both paths can let an updater
continue while old application files remain open.

Packaged smoke testing also exposed an upgrade-path failure: the profile records
Desktop-owned package junctions, but bootstrap only accepts a junction when it
already points at the current application directory. Launching from a new install
location therefore rejects the verified old junction as unmanaged instead of
retargeting it.

## Approaches considered

1. Replace each direct `child.kill()` call with a process-tree call. This is small,
   but duplicates fallback and logging behavior across every startup failure path.
2. Centralize failed-startup termination and make shutdown state transitions
   success-only. This covers all current and future pre-ready failures and keeps
   retry behavior explicit. This is the selected approach.
3. Move runtime ownership to a separate Windows service. That would provide a
   stronger process boundary, but is disproportionate to the current desktop app
   and would add installation and permission complexity.

## Design

`DshRuntimeController.#failBeforeReady()` owns cleanup whenever a child exists. It
starts the same injected process-tree terminator used by normal shutdown, records
termination failures without allowing logging failures to interrupt cleanup, and
keeps a bounded `SIGKILL` fallback until the child emits `exit`. Call sites only
report the startup failure; they no longer choose how to terminate the process.

`createDesktopShutdownLifecycle.stop()` treats state persistence as best effort,
but treats `stopRuntime()` as authoritative. A failed stop is logged, propagated,
and leaves `runtimeStopped` false so a later attempt can retry. A failed shutdown
also clears its cached promise. Recovery never starts a second runtime when the
old one could not be stopped.

Profile bootstrap verifies an existing target against its previous ownership
record. A recorded junction must still resolve or point to the recorded source; a
recorded copy must retain the expected package identity. Only then may bootstrap
remove it and attach the new packaged source. Targets without a valid ownership
record remain protected from replacement.

## Verification

- A controller regression test proves a startup timeout invokes the process-tree
  terminator and retains a bounded force-kill fallback.
- Lifecycle tests prove failed stops do not advance state, can be retried, and do
  not launch recovery on top of a possibly live runtime.
- Profile tests prove a Desktop-owned package can move between install roots while
  an unrecorded package at the same target is never overwritten.
- Desktop tests, the complete repository verifier, and packaged runtime checks
  remain green.
