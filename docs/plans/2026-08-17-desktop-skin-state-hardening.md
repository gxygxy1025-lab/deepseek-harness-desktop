# Desktop Skin State Hardening Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make Desktop theme switching, migration, and startup behavior converge on one durable state without silent plugin loss or misleading partial failures.

**Architecture:** `DesktopSkinStateStore` remains the Desktop authority for the home patch and recognizes both profile wiring channels. The patched market treats that service as optional, persists before live activation, and retains unresolved legacy disables as an explicit compatibility fallback until they can be migrated. Skin Center verifies atomic writes with bounded read retries that preserve read errors separately from content mismatches.

**Tech Stack:** TypeScript, Node.js filesystem APIs, Cordis services, pnpm patched dependencies, Vitest, Node test runner, GitHub Actions.

---

### Task 1: Align Desktop theme discovery

**Files:**
- Modify: `packages/dsh-desktop-compat/src/skin-state.ts`
- Test: `packages/dsh-desktop-compat/tests/skin-state.spec.ts`

**Steps:**
1. Add a failing fixture whose manifest contains the theme only in `dependencies`.
2. Assert that `activateBundleTheme` accepts it and persists the loader state.
3. Merge dependency keys with `dsh.profile.bundles` in the store's installed-theme set.
4. Clarify the intentional insert-to-disabled normalization and remove the redundant temporary `false` assignment.
5. Run the package tests and build the generated `lib` output.

### Task 2: Distinguish Skin Center verification failures

**Files:**
- Modify: `packages/skins/skin-center/src/skin-switch.ts`
- Test: `packages/skins/skin-center/tests/skin-switch.spec.ts`
- Update patch: `patches/@linxin666__dsh-client-ui-skin-center@0.1.18.patch`

**Steps:**
1. Add pure verification tests for transient read failures, exhausted read failures, and true content mismatch.
2. Implement bounded synchronous read retries after the atomic rename.
3. Re-throw the final filesystem read error unchanged; reserve the verification message for successful reads with different content.
4. Rebuild the workspace package and regenerate the published-package pnpm patch.

### Task 3: Make market persistence transactional and backward compatible

**Files:**
- Update patch: `patches/dshmarket@1.9.0.patch`
- Test: `apps/dsh-desktop/test/skin-market-persistence.test.mjs`

**Steps:**
1. Add a real `DesktopSkinStateStore` integration case for a dependencies-only theme.
2. Assert persistence occurs before any live loader mutation.
3. Change the Desktop injection to require only `desktopPnpm`, probe `desktopSkinState` optionally, and emit a fallback warning when absent.
4. Keep unresolved legacy disabled names in the compatibility set, replay them at boot, and retry migration when matching loader entries appear.
5. Clear `state.json` once every legacy name has migrated.
6. Regenerate the dshmarket patch and run the integration tests against the installed patched package.

### Task 4: Remove configuration drift risks

**Files:**
- Modify: `apps/dsh-desktop/src/runtime-controller.mjs`
- Test: `apps/dsh-desktop/test/runtime-controller.test.mjs`
- Modify: `pnpm-workspace.yaml`
- Modify: `pnpm-lock.yaml`

**Steps:**
1. Derive `DSH_PROFILE`, `DSH_SKIN_PROFILE`, `DSH_SKINS_DIR`, and CLI arguments from one profile constant.
2. Extend the runtime-controller assertion to cover all derived values.
3. Replace the broad `@linxin666/*` release-age exemption with exact `0.1.18` built-in package entries.
4. Run a frozen lockfile install check.

### Task 5: Put window chrome behavior in PR CI

**Files:**
- Modify: `.github/workflows/desktop-ci.yml`
- Modify: `apps/dsh-desktop/scripts/verify-window-chrome.mjs`

**Steps:**
1. Give CI cold starts the existing packaged-runtime timeout budget.
2. Add the window-chrome Electron end-to-end command to the Windows PR job after Chromium installation.
3. Validate workflow syntax and run the command locally.

### Task 6: Full verification

**Files:**
- Preserve without modification: `docs/launch/desktop-2.0-poster.png`
- Preserve without modification: `bug-report-2026-08-17.md`

**Steps:**
1. Run targeted package and Desktop integration tests.
2. Run typecheck, full tests, script checks, repository checks, and window-chrome E2E.
3. Rebuild the Windows directory package and verify packaged runtime contents.
4. Run `git diff --check` and confirm no unrelated untracked file was removed.
