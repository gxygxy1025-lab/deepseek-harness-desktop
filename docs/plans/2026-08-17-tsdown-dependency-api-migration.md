# Tsdown Dependency API Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove every deprecated tsdown dependency-boundary option from the shared plugin build preset without changing generated runtime artifacts.

**Architecture:** Replace the deprecated top-level `external` and `noExternal` fields with their documented `deps.neverBundle` and `deps.alwaysBundle` equivalents. Keep dependency decisions centralized in `shared/tsdown.client.ts`; package-specific library overrides use the same nested API. Verify equivalence with pre/post-build hashes and an automated source gate that prevents the deprecated keys from returning.

**Tech Stack:** TypeScript, tsdown 0.22.2, Rolldown, Node.js test runner, pnpm.

---

### Task 1: Capture the current artifact contract

**Files:**
- Inspect: `shared/tsdown.client.ts`
- Inspect: `packages/dsh-live-stats/tsdown.config.ts`
- Inspect: `packages/skins/skin-center/tsdown.config.ts`
- Inspect: generated `packages/**/lib/*.js`

**Steps:**
1. Hash every generated plugin `lib/index.js`, `lib/client.js`, and `lib/mobile.js` artifact before the migration.
2. Record the current build warnings and confirm they originate from the deprecated keys.
3. Confirm the installed tsdown types accept arrays, regular expressions, and callback functions for the replacement fields.

### Task 2: Add a regression gate for deprecated config keys

**Files:**
- Add: `scripts/tsdown-config.test.mjs`

**Steps:**
1. Add a Node test that scans TypeScript tsdown configuration sources.
2. Make the test reject executable `external:` and `noExternal:` property declarations while ignoring prose comments.
3. Run the focused test and retain the expected failure before implementation.

### Task 3: Migrate the shared preset and package overrides

**Files:**
- Modify: `shared/tsdown.client.ts`
- Modify: `packages/dsh-live-stats/tsdown.config.ts`
- Modify: `packages/skins/skin-center/tsdown.config.ts`

**Steps:**
1. Move mobile dependency rules to `deps.neverBundle` and `deps.alwaysBundle`.
2. Move Node library externals to `deps.neverBundle`.
3. Move client module-table boundaries to `deps.neverBundle` and `deps.alwaysBundle`.
4. Move both package-specific library override lists to `deps.neverBundle`.
5. Run the focused source gate and shared TypeScript typecheck.

### Task 4: Prove output equivalence and warning removal

**Files:**
- Verify: generated `packages/**/lib/*.js`

**Steps:**
1. Build all workspace packages under Node 24.
2. Require zero `external` or `noExternal` deprecation warnings in build output.
3. Compare every post-build runtime artifact hash with the Task 1 baseline.
4. Investigate any changed artifact instead of accepting a semantic drift.

### Task 5: Full verification

**Files:**
- Preserve without modification: `bug-report-2026-08-17.md`
- Preserve without modification: `docs/launch/desktop-2.0-poster.png`

**Steps:**
1. Run root typecheck, script tests, runtime dependency checks, and full verification.
2. Run the Desktop source Electron E2E to prove all client bundles still load.
3. Run `git diff --check` and review the exact migration diff.
