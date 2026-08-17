# Vitest SDK source map warning filter

## Problem

Several published `@deepseek-ai` SDK JavaScript files end with a
`sourceMappingURL` whose `.map` file is not included in the package. Vite 8
tries to read the missing file for every transformed module and emits a long
`ENOENT` warning. The tests still pass, but the repeated output hides useful
diagnostics.

The existing `server.sourcemapIgnoreList` settings do not prevent that read.
They only control the `x_google_ignoreList` metadata written into a source map.

## Design

Add one shared Vite plugin for Vitest configs. During `configResolved`, it
wraps the resolved logger and discards a warning only when all of these facts
are present:

- the message is Vite's `Failed to load source map for` warning;
- the referenced package is under `node_modules/@deepseek-ai`;
- the missing target is a `.map` file;
- the underlying failure is `ENOENT`.

Every other warning is forwarded unchanged. This avoids extra file reads and
does not hide source map failures from workspace code or unrelated packages.
All nine configs that inline the SDK use the shared plugin; the seven that had
the ineffective `sourcemapIgnoreList` setting remove it.

## Verification

Unit tests cover Windows and POSIX package paths, plus near-miss warnings that
must remain visible. Focused Vitest runs prove the known SDK warning is absent.
The root verification command ensures the shared config does not affect test
discovery, type checking, runtime dependency checks, or generated artifacts.
