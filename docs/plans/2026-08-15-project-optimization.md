# Project Optimization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reduce regression risk, Windows-specific test failures, runtime memory spikes, background work, and packaged size without removing user-visible capabilities.

**Architecture:** Keep all public APIs and UI flows stable. Add limits at the I/O boundary, deduplicate internal work behind existing interfaces, and make release verification prove that generated files and packaged runtime assets remain complete. Preserve the in-progress startup-screen changes throughout.

**Tech Stack:** Node.js 24, pnpm 11, TypeScript, Vitest, Electron, electron-builder, GitHub Actions.

---

### Task 1: Make the full validation surface Windows-safe

**Files:**
- Modify: `packages/dsh-aionui-panel/tests/*.spec.ts`
- Modify: `packages/dsh-ssh/tests/store.test.ts`
- Modify: `scripts/dsh-skin.test.mjs`
- Modify: `.github/workflows/desktop-ci.yml`
- Modify: `package.json`

1. Replace POSIX-only fixture roots and path assertions with temporary real paths and `node:path` comparisons.
2. Make symlink-only assertions skip with an explicit reason when Windows denies symlink creation; keep junction/copy fallback coverage.
3. Treat POSIX mode assertions as POSIX-only while preserving the production `0o600` write request.
4. Run the affected package tests and confirm the previous Windows failures disappear.
5. Add one root verification script and make CI run typecheck, all tests, script tests, generated-file checks, and `git diff --check`.

### Task 2: Bound preview I/O and renderer memory

**Files:**
- Modify: `packages/dsh-aionui-panel/src/host/fs-service.ts`
- Modify: `packages/dsh-aionui-panel/src/host/routes.ts`
- Modify: `packages/dsh-aionui-panel/src/client/store.ts`
- Test: `packages/dsh-aionui-panel/tests/host-fixes.spec.ts`
- Test: `packages/dsh-aionui-panel/tests/raw-route.spec.ts`
- Test: `packages/dsh-aionui-panel/tests/store.spec.ts`

1. Add failing tests proving oversized text/image files are not fully buffered and raw responses remain functional.
2. Stat before reading; read only the required preview bytes and stream raw files through the HTTP response.
3. Keep all tabs visible but unload least-recently-used inactive tab content above a bounded content budget so reopening transparently reloads it.
4. Run package typecheck and tests.

### Task 3: Correct SSH byte accounting and remove synchronous directory walks

**Files:**
- Modify: `packages/dsh-ssh/src/engine.ts`
- Test: `packages/dsh-ssh/tests/engine.test.ts`

1. Add multibyte/chunk-boundary tests for the output byte cap.
2. Track Buffer bytes and decode with a streaming decoder so UTF-8 characters are not split.
3. Replace recursive synchronous directory traversal and repeated `statSync` calls with asynchronous iteration while preserving upload ordering and progress events.
4. Run package typecheck and tests.

### Task 4: Deduplicate Git polling work

**Files:**
- Modify: `packages/dsh-aionui-panel/src/host/routes.ts`
- Modify: `packages/dsh-git-graph/src/host/routes.ts`
- Test: corresponding route test files

1. Add tests with multiple subscribers on the same root.
2. Execute one status request per unique canonical root per tick and fan out the result.
3. Add an overlap guard to Git Graph so slow status commands cannot stack.
4. Preserve the existing two-second freshness contract and SSE payloads.

### Task 5: Reduce packaged runtime waste safely

**Files:**
- Modify: `apps/dsh-desktop/scripts/after-pack.cjs`
- Modify: `apps/dsh-desktop/test/after-pack.test.mjs`
- Modify: `apps/dsh-desktop/scripts/verify-package.mjs`

1. Add classifier tests for workspace-only source, artwork, test, and documentation trees that published manifests already exclude.
2. Prune only proven non-runtime paths; retain skin previews, `skin.json`, pet assets, bundles, patches, and manifests.
3. Extend package verification to assert required skin previews and pet assets still exist.
4. Build an unpacked application and compare its size with the baseline.

### Task 6: Consolidate tooling and generated-file gates

**Files:**
- Modify: `pnpm-workspace.yaml`
- Modify: workspace `package.json` files
- Modify: Vitest configs
- Modify: `AGENTS.md`
- Regenerate: `pnpm-lock.yaml`, `gallery/bundles.js`

1. Add a root Node engine declaration matching CI and documentation.
2. Use pnpm catalogs for shared TypeScript, Vitest, jsdom, React test runtime, tsdown, and lightningcss versions where peer compatibility permits.
3. Replace repeated `vite-tsconfig-paths` configuration with Vite's native TypeScript-path support and a shared test preset.
4. Correct package-scope documentation to match the actually published `@linxin666/*` packages unless a separately authorized scope migration is performed.
5. Regenerate stale gallery output and run all generated-file checks.

### Task 7: Completion verification

1. Run the root verification command under the supported Node runtime.
2. Run all desktop tests and package verification.
3. Confirm `git diff --check` and review the final diff for changes outside this plan or the pre-existing startup work.
4. Record remaining size numbers and any platform-specific skipped test with its reason.
