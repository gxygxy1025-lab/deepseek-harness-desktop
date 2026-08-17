# Desktop Startup Lifecycle Hardening Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Prevent startup failures from leaving invisible Electron processes that block updates, and make Windows installer cleanup bounded and verifiable.

**Architecture:** The Electron entry point owns a single tested bootstrap-failure path that reports a bounded diagnostic and exits through Electron, with a process-level fallback. The NSIS preflight keeps its install-directory ownership boundary, retries exact-path process termination for a bounded window, and returns a non-zero result when files are still owned. Startup logs split package resolution, profile preparation, compatibility reconciliation, and runtime readiness so field performance regressions can be located.

**Tech Stack:** Electron, Node.js ESM, PowerShell, NSIS, Node test runner.

---

### Task 1: Make bootstrap failure terminal and visible

**Files:**
- Modify: `apps/dsh-desktop/src/main.mjs`
- Test: `apps/dsh-desktop/test/smoke.test.mjs`

**Steps:**
1. Add failing tests proving the failure handler logs a bounded message, shows one error dialog, and requests Electron exit code 1.
2. Add a second test proving a failed Electron exit path invokes the injected process-level fallback.
3. Implement the dependency-injected handler and wire the top-level bootstrap rejection to it.
4. Run the focused test and confirm no Electron import is required in the Node test process.

### Task 2: Verify installer process cleanup

**Files:**
- Modify: `apps/dsh-desktop/build/cleanup-stale-processes.ps1`
- Modify: `apps/dsh-desktop/build/installer.nsh`
- Test: `apps/dsh-desktop/test/installer-cleanup.test.mjs`

**Steps:**
1. Extend the static contract test for bounded retry, exact path ownership, child-first termination, and non-zero stuck-process exit.
2. Implement a short polling loop that re-enumerates only processes whose executable path is the installed executable or its resource tree.
3. Make `customInit` stop before file replacement and display a clear bilingual retry message only when owned processes remain.
4. Run the focused installer test.

### Task 3: Add startup phase evidence

**Files:**
- Modify: `apps/dsh-desktop/src/electron-app.mjs`
- Test: `apps/dsh-desktop/test/runtime-integration.test.mjs`

**Steps:**
1. Record bounded phase timings for package resolution, profile preparation, compatibility reconciliation, runtime readiness, and renderer load.
2. Keep credential loading and independent profile migrations concurrent where they touch different files.
3. Add a source-level contract assertion for the timing labels and concurrency boundary.
4. Run Desktop tests and the profile benchmark.

### Task 4: Verify source and packaged behavior

**Files:**
- Preserve: `bug-report-2026-08-17.md`
- Preserve: `docs/launch/desktop-2.0-poster.png`

**Steps:**
1. Run Desktop tests, typecheck, repository checks, and `git diff --check` under Node 24.
2. Run source Electron E2E.
3. Build the Windows directory package and verify all packaged runtime dependencies.
4. Launch the packaged executable through the Electron E2E harness and confirm clean shutdown.
