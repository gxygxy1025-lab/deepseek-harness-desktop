# Desktop Update Recovery and Verification Gates Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Keep the Desktop recoverable when an update installer cannot launch, serialize install requests, and make the repository's normal verification path cover the stability gates relied on by release builds.

**Architecture:** Desktop shutdown is split into an idempotent runtime-stop phase and a final resource-disposal phase. `DesktopUpdateController` owns a single install attempt, publishes an explicit installing state, detects synchronous updater errors or a bounded launch timeout, and invokes a recovery callback that restarts the runtime without tearing down IPC or the update surface. Root and Windows CI verification run the same dependency, documentation, generated-copy, and Electron smoke gates.

**Tech Stack:** Electron, electron-updater, Node.js ESM, Node test runner, pnpm, GitHub Actions.

---

### Task 1: Make update installation serialized and observable

**Files:**
- Modify: `apps/dsh-desktop/src/updater.mjs`
- Modify: `apps/dsh-desktop/src/ipc.mjs`
- Modify: `apps/dsh-desktop/src/update-surface.mjs`
- Test: `apps/dsh-desktop/test/updater.test.mjs`
- Test: `apps/dsh-desktop/test/ipc.test.mjs`

**Steps:**
1. Add failing tests proving concurrent install requests invoke `beforeInstall` and `quitAndInstall` only once.
2. Add an `installing` public phase and render a non-interactive bilingual progress state.
3. Add a bounded installer-launch watchdog and clear it on updater error or disposal.
4. Add a failing test proving an updater error during installation invokes the recovery callback exactly once and returns the controller to an actionable error state.
5. Run the focused updater and IPC tests.

### Task 2: Keep the app recoverable until installation actually starts

**Files:**
- Modify: `apps/dsh-desktop/src/electron-app.mjs`
- Test: `apps/dsh-desktop/test/runtime-integration.test.mjs`

**Steps:**
1. Separate idempotent runtime stopping from final IPC, UI, menu, binding, and listener disposal.
2. Make update preparation stop only the runtime and preserve the desktop control surface.
3. On installer launch failure, clear the quit intent and restart the stopped runtime.
4. Keep ordinary quit and successful updater quit on the full-disposal path.
5. Run Desktop tests and source Electron E2E to verify clean shutdown still completes.

### Task 3: Align local and CI verification gates

**Files:**
- Modify: `package.json`
- Modify: `.github/workflows/desktop-ci.yml`

**Steps:**
1. Add `runtime-deps:check`, `sync-shared:check`, `community:check`, and `docs:check` to the root `verify` command.
2. Add the same missing checks to Windows Desktop CI while retaining the real Electron E2E.
3. Run every newly promoted gate and validate workflow YAML syntax through the repository tests.

### Task 4: Evaluate and, if justified, update the embedded package manager

**Files:**
- Potentially modify: `package.json`
- Potentially modify: `apps/dsh-desktop/package.json`
- Potentially modify: `pnpm-lock.yaml`

**Steps:**
1. Inspect the official pnpm 11.22.0 release notes for Windows, locking, and install behavior relevant to Desktop plugin management.
2. Upgrade from 11.21.0 only if the patch release has no incompatible requirement and offers applicable fixes.
3. Run a frozen install, plugin transaction tests, profile benchmark, and packaged-runtime verification.

### Task 5: Full verification

**Files:**
- Preserve without modification: `bug-report-2026-08-17.md`
- Preserve without modification: `docs/launch/desktop-2.0-poster.png`

**Steps:**
1. Run focused updater, IPC, runtime lifecycle, and plugin manager tests under Node 24.
2. Run root `pnpm verify`, source Electron E2E, and `git diff --check`.
3. Build the Windows NSIS installer, verify packaged runtime dependencies, and run the packaged executable E2E.
4. Confirm unrelated user files remain present and unchanged.
