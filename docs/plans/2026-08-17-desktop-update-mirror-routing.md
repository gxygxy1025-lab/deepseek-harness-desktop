# Desktop Update Mirror Routing Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Accelerate Windows desktop release downloads in mainland China with measured mirror selection and automatic fallback while keeping GitHub release metadata and its SHA-512 checksum as the trust source.

**Architecture:** Keep `electron-updater`'s GitHub provider for release discovery and metadata. Wrap only the resolved public GitHub Release asset URLs during `downloadUpdate`, rank HTTPS mirror prefixes with a bounded range probe, retry failed sources, and restore the provider after the operation. Publish the selected source to the existing update surface and retain GitHub as the final fallback.

**Tech Stack:** Electron 43 `net.fetch`, `electron-updater` 6, Node.js ESM, Node test runner.

---

### Task 1: Define safe mirror routing primitives

**Files:**
- Create: `apps/dsh-desktop/src/update-mirrors.mjs`
- Create: `apps/dsh-desktop/test/update-mirrors.test.mjs`

**Steps:**
1. Add failing tests for HTTPS-only mirror parsing, GitHub Release URL rewriting, bounded range probing, and source ordering.
2. Run `node --test apps/dsh-desktop/test/update-mirrors.test.mjs` and confirm the missing module failure.
3. Implement default mirror definitions, environment override parsing, strict URL rewriting, and concurrent bounded probes.
4. Re-run the focused test and confirm it passes.

### Task 2: Add download fallback without changing metadata trust

**Files:**
- Modify: `apps/dsh-desktop/src/update-mirrors.mjs`
- Modify: `apps/dsh-desktop/test/update-mirrors.test.mjs`

**Steps:**
1. Add a failing router test where the first resolved asset URL fails and the second succeeds.
2. Implement `UpdateDownloadRouter` so it wraps the provider's `resolveFiles`, preserves checksum metadata, retries sources, and restores the provider method.
3. Verify intermediate updater error events can be identified as retryable.
4. Re-run the focused tests.

### Task 3: Wire routing into the desktop updater and UI

**Files:**
- Modify: `apps/dsh-desktop/src/electron-app.mjs`
- Modify: `apps/dsh-desktop/src/updater.mjs`
- Modify: `apps/dsh-desktop/src/ipc.mjs`
- Modify: `apps/dsh-desktop/src/update-surface.mjs`
- Modify: `apps/dsh-desktop/test/updater.test.mjs`
- Modify: `apps/dsh-desktop/test/ipc.test.mjs`
- Modify: `apps/dsh-desktop/test/update-surface.test.mjs`

**Steps:**
1. Add failing controller tests for source publication and suppressed intermediate failover errors.
2. Inject a router into `DesktopUpdateController` and use it for downloads.
3. Construct the router with Electron `net.fetch` after the app is ready.
4. Expose only the bounded source label through IPC and show it during download.
5. Run all Desktop tests.

### Task 4: Verify packaging and updater integrity

**Files:**
- Modify: `apps/dsh-desktop/scripts/verify-package.mjs` only if the existing packaged source inventory requires an explicit assertion.

**Steps:**
1. Run `pnpm --filter @deepseek-ai/dsh-desktop test`.
2. Run repository verification with the bundled supported Node runtime.
3. Build the Windows installer.
4. Run package verification and packaged smoke tests.
5. Confirm the mirror module is inside `app.asar` and report the final installer checksum.
