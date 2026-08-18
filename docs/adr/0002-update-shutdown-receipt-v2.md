# ADR-0002: Token-bound update shutdown receipt v2

## Status

Accepted for Desktop 2.4.0.

## Context

The Windows installer must replace files only after the running Desktop instance has quiesced extension mutations and stopped the DSH child process. A command-line shutdown request alone cannot prove that the request reached the owning instance, that shutdown completed, or that an unrelated process did not create a stale acknowledgement. Older releases also require a narrowly attributed cleanup fallback.

## Decision

The installer generates a cryptographically random 32-byte token encoded as exactly 64 lowercase hexadecimal characters. It starts the installed product executable with `--shutdown-for-update --shutdown-token=<token>` and waits for `%TEMP%/dsh-desktop-shutdown-<token>.json`; no caller-controlled receipt path crosses the process boundary.

The primary Electron instance receives the request through the single-instance channel, quiesces extension operations, stops the runtime, disposes resources, and atomically publishes schema version 2 with the exact token, old PID, `runtimeStopped: true`, `extensionsQuiesced: true`, and a timestamp. Publication writes and validates a complete temporary file before creating the final path without overwriting an existing receipt.

The installer accepts only a structurally valid receipt matching the token and expected old PID, then waits for that PID to exit. A missing, invalid, or timed-out receipt falls through to the existing install-root and product-identity cleanup. The fallback remains available for releases that do not ship the v2 marker.

## Consequences

- Successful upgrades have an explicit proof that runtime and extension shutdown completed.
- A guessed path or stale receipt cannot authorize replacement because the token and PID are bound to the request.
- Legacy releases still upgrade through the constrained cleanup path.
- Installer diagnostics can distinguish receipt timeout, invalid receipt, PID timeout, legacy cleanup conflicts, and cleanup script failures.

## Alternatives Considered

A fixed global receipt was rejected because stale instances could collide. Passing an arbitrary receipt path was rejected because it expands installer-controlled filesystem input. Treating process disappearance alone as success was rejected because it does not prove the runtime and extension mutation queue were quiesced.
