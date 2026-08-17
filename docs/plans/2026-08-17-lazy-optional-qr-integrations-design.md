# Lazy optional QR integrations

## Problem

The desktop main process imports both `qrcode` and
`@tencent-connect/qqbot-connector` during every launch. These packages are
only needed when the user opens the community QR window or starts QQ Bot
binding, but their module initialization is paid on the critical startup
path. A local Node 24 measurement attributes roughly 56 ms of cold module
loading to these two optional features.

Changing the connector to a dynamic import also exposes a lifecycle race:
the user may cancel binding, close the Extension Dock, or quit the desktop
before the import resolves. A connector returned after cancellation must not
be left running.

## Options considered

1. Preload the modules after the first renderer load. This removes them from
   the initial import graph but still competes with the runtime and renderer
   for CPU and disk access.
2. Lazily load only `qrcode`. This is simple, but leaves the connector on the
   startup path and solves only part of the measured cost.
3. Lazily load both modules at the point of use and make the binding service
   accept synchronous or asynchronous connector factories. This removes all
   optional QR work from startup and preserves the existing public UI.

Option 3 is selected.

## Design

A small optional-integration module owns retryable, memoized dynamic imports.
Successful imports are shared across later calls. Failed imports clear their
cache so a repaired installation or transient read error can be retried.

`createQrDataUrl` and the community QR renderer call the lazy QR helper.
`electron-app.mjs` injects a lazy QQ Bot connector wrapper instead of
statically importing the connector package.

`QqBotBindingService.start()` continues to return state synchronously. It
normalizes the connector result with `Promise.resolve`, publishes the waiting
state immediately, and records the stop callback only if the binding
generation is still current. If cancellation wins the race, a stop callback
that arrives later is invoked immediately. Connector load failures continue
through the existing error event without producing an unhandled rejection.

## Verification

- Unit-test memoization and retry after a failed optional-module load.
- Unit-test successful asynchronous connector startup.
- Unit-test cancellation before asynchronous connector resolution.
- Keep existing synchronous connector and QR image tests passing.
- Measure packaged startup before and after the change and run the desktop
  suite, package verifier, smoke test, and window E2E.
