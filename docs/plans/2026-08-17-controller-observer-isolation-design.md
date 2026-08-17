# Desktop controller observer isolation

## Problem

The runtime and update controllers publish state through synchronous Node.js
`EventEmitter` listeners. Renderer adapters subscribe to those events and call
Electron `webContents.send()`. During navigation or window teardown that send can
throw synchronously. The exception currently propagates back into the controller:
a runtime start can be left in `starting` before its readiness promise exists, a
ready transition can fail to resolve that promise, and an update check can be
reported as failed even though only its UI observer failed.

## Decision

Treat `status` and runtime `line` events as best-effort observation boundaries.
Each controller will snapshot its raw listeners and invoke them in registration
order. A synchronous listener exception or asynchronous listener rejection is
caught independently, later listeners still run, and a bounded diagnostic is
written through the controller's existing logging channel. Asynchronous listeners
are observed but never awaited, so status publication remains non-blocking. Raw
listeners are used so Node's `once()` wrapper keeps its normal single-delivery
behavior.

Core state is committed before notification, as it is today. Event timing remains
synchronous; only exception ownership changes. Update logging is also made
best-effort so a diagnostic sink cannot become a second observer failure path.

## Verification

- A throwing runtime status listener cannot prevent process spawn, readiness, or
  delivery to a later listener.
- A throwing runtime line listener cannot prevent parsing the official ready line.
- A throwing update status listener cannot turn a successful check into an error
  or prevent delivery to a later listener.
- Observer failures appear in bounded diagnostics.
- Desktop unit tests, the repository verification suite, packaged smoke, and the
  real Electron window test remain green.
