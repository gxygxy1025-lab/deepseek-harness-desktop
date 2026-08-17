# Electron side-effect isolation

## Problem

The update controller writes taskbar progress directly through a live
`BrowserWindow`, while the session download listener awaits an Electron save
dialog inside an EventEmitter callback. Window teardown, a rejected dialog, or a
stale `DownloadItem` can throw. A taskbar failure currently stops update download
startup, and an asynchronous download-listener failure becomes an unhandled
rejection.

## Decision

Keep these failures at their Electron boundary. Taskbar progress is presentation
only: window lookup, liveness checks, and `setProgressBar()` run inside a guarded
operation. Failure writes a bounded diagnostic and the update state machine
continues.

Download destination selection is extracted into a small async operation. It
returns a stable result instead of rejecting. Cancellation by the user cancels the
item. If the dialog, save-path assignment, or item access fails, the operation
attempts to cancel the item, reports the original and cancellation errors through
a best-effort diagnostic callback, and returns `failed`. The Electron event
listener starts this operation without becoming async itself, so EventEmitter
never owns its promise.

## Verification

- A throwing taskbar progress API does not prevent `downloadUpdate()` or change
  the downloading state.
- Dialog rejection cancels the download and produces a bounded diagnostic without
  rejecting.
- User cancellation cancels the download without being reported as a failure.
- A selected path is assigned exactly once.
- Desktop tests, repository verification, packaged smoke, and real Electron window
  checks remain green.
