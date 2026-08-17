# Log and action failure isolation

## Problem

Desktop diagnostics returned rejecting promises when the log directory was unavailable. Several startup and UI paths either awaited those writes, making diagnostics capable of blocking startup, or discarded the promise, producing an unhandled rejection. High-frequency runtime logs also repeated directory creation and file-size queries for every line.

Electron menu and navigation callbacks had a similar boundary problem: rejected `shell.openExternal`, runtime restart, or update IPC operations could escape an event callback as an unhandled promise rejection.

## Design

- Make `BoundedLogStore.append()` a best-effort operation that resolves to `true` or `false` and records the most recent write failure.
- Cache the successful directory creation and current file size. Clear both caches after any write failure so the next append performs a full retry.
- Keep `tail()` strict because it is an explicit diagnostic read and its caller can report a real access failure.
- Remove the eager startup `mkdir` so an unavailable diagnostics directory cannot prevent the desktop shell from launching.
- Add `runBestEffort()` for Electron event actions. It isolates synchronous throws, asynchronous rejections, and failures in the error reporter itself.
- Route menu and external-navigation failures to the bounded log store.
- Catch update-surface IPC failures in the renderer and always restore the install button state.
- When an upgraded profile still selects a built-in per-skin package, keep the package retired from the manifest but create a recorded resolvability alias into the bundled `@linxin666/dsh-skins` carrier. This preserves the selected skin without restoring duplicate bundle ownership.

## Verification

- A path occupied by a regular file does not reject `append()` and the same store writes successfully after the path is repaired.
- Repeated appends perform one directory creation and one initial size query.
- Menu and navigation promise rejections are reported without being returned to Electron event dispatch.
- Update-surface generated code contains rejection handlers for check and install actions.
- A legacy built-in skin remains resolvable after migration, is absent from dependencies and bundles, and is idempotent on the next profile refresh.
- Run the complete desktop test suite, package verification, packaged smoke test, and Windows UI checks.
