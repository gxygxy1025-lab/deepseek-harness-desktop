# Desktop Packaged Composition and Startup Metrics Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the packaged Desktop load the mode switcher through the same aggregate composition proven in the workspace, and expose repeatable startup timings so future performance work is based on release-artifact evidence.

**Architecture:** Keep `@linxin666/dsh-web-ui-all@0.1.18` as the single aggregate bundle and patch its published `cordis.patch.yml` to include the Desktop-owned mode-switcher package that is already shipped as a direct dependency. Extend source and packaged verification so the profile composition and the live renderer both prove the plugin is mounted. Parse the existing cumulative startup log markers in the Electron E2E and emit one structured timing summary without changing runtime behavior.

**Tech Stack:** pnpm patched dependencies, DSH profile composition, Electron, Playwright, Node.js ESM, Node test runner.

---

### Task 1: Prove the published aggregate is missing the mode switcher

**Files:**
- Modify: `apps/dsh-desktop/test/profile.test.mjs`
- Modify: `apps/dsh-desktop/scripts/verify-package.mjs`

**Steps:**
1. Add a profile test that reads the resolved published aggregate patch and requires the `ui-mode-switcher` row.
2. Add a package verification assertion that reads the same row from the packaged aggregate artifact.
3. Run the focused tests and retain the expected failure before changing the dependency patch.

### Task 2: Patch the published aggregate composition

**Files:**
- Modify: `pnpm-workspace.yaml`
- Add: `patches/@linxin666__dsh-web-ui-all@0.1.18.patch`
- Modify: `pnpm-lock.yaml`

**Steps:**
1. Add the missing mode-switcher insert row to the aggregate patch without modifying official DSH source.
2. Register the pnpm patched dependency and refresh the frozen lockfile under Node 24.
3. Verify that `resolveRuntimePackages()` now selects the patched aggregate and that the source profile contains exactly one `ui-mode-switcher` row.

### Task 3: Prove the live source and packaged renderer load the plugin

**Files:**
- Modify: `apps/dsh-desktop/scripts/verify-window-chrome.mjs`

**Steps:**
1. Wait for the mode-switcher's plugin-owned style marker in the real Electron renderer.
2. Keep the assertion applicable to both source and packaged executions.
3. Run source Electron E2E before rebuilding the release artifact.

### Task 4: Make startup performance observable

**Files:**
- Modify: `apps/dsh-desktop/scripts/verify-window-chrome.mjs`

**Steps:**
1. Parse every required `[startup] <phase>=<milliseconds>ms` marker from the runtime log.
2. Assert cumulative phases are ordered and emit a single JSON timing summary for CI and local comparisons.
3. Use measured source and packaged results to decide whether a defensible regression budget can be added in this batch.

### Task 5: Release-artifact verification

**Files:**
- Preserve without modification: `bug-report-2026-08-17.md`
- Preserve without modification: `docs/launch/desktop-2.0-poster.png`

**Steps:**
1. Run focused profile tests, Desktop tests, root verification, and source Electron E2E under Node 24.
2. Build the Windows NSIS artifact and run package verification.
3. Run the packaged executable E2E and compare its structured startup timings with the source run.
4. Run `git diff --check` and confirm unrelated user files remain untouched.
