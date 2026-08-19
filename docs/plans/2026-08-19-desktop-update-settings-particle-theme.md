# Desktop Update, Settings Window, and Particle Theme Implementation Plan

> **For Codex:** Execute this plan in the existing working tree. Preserve the completed 2.5.0 work and unrelated user changes. Do not commit, push, or create a PR.

**Goal:** Make GitHub the explicit official update source with the user group as the primary human fallback, turn the in-page settings modal into a movable/resizable/persistent desktop surface, and ship the startup-inspired whale particles as an independently configurable Web UI plugin.

**Architecture:** Keep update and settings-window privileges in the Desktop main/preload boundary. The settings controller remains a renderer enhancement over the upstream dialog and stores only validated numeric bounds through a narrow main-only IPC. The particle theme is a normal host/client DSH bundle so it can coexist with every skin; its host half owns settings and its client half owns a fixed, pointer-transparent canvas plus an extensible scene-profile registry.

**Tech Stack:** Electron 43, Node ESM/CJS preload bridge, Playwright Electron E2E, DSH rc.6 official NPM SDK, React 18, TypeScript, tsdown, Vitest.

---

## Design decisions

- GitHub Releases remains first and is never reordered behind a mirror. Built-in third-party mirror defaults are removed. Explicitly configured HTTPS mirrors remain opt-in technical fallbacks, but the UI promotes the existing QQ user group instead of claiming that any domestic source is faster.
- The settings surface is the existing upstream `[role="dialog"]` panel, not a second `BrowserWindow`. Desktop adds one compact drag bar and eight resize handles, then clamps the panel to the safe viewport below the 32px title bar. Bounds are stored in CSS pixels and reclamped on every open and viewport change, which handles changed resolution and DPI without persisting unsafe screen coordinates.
- The particle capability is a regular bundle rather than a skin because skins are mutually exclusive while the requested particles must overlay the current skin. A small registry maps theme IDs to factories, beginning with `whale`, and page profiles control density, alpha, and speed for normal, focused-input, dialog, hidden, and reduced-motion states.
- The canvas always uses `pointer-events: none`, caps device pixel ratio and particle count, pauses when hidden, and adapts quality downward after sustained slow frames. Readability wins over animation: dialogs and active text inputs use substantially lower alpha/density/speed.

## Task 1: GitHub-first update flow and community fallback

**Files:**

- Modify: `apps/dsh-desktop/src/community-links.mjs`
- Modify: `apps/dsh-desktop/src/electron-app.mjs`
- Modify: `apps/dsh-desktop/src/preload-main.cjs`
- Modify: `apps/dsh-desktop/src/update-mirrors.mjs`
- Modify: `apps/dsh-desktop/src/update-surface.mjs`
- Modify: `apps/dsh-desktop/test/community-links.test.mjs`
- Modify: `apps/dsh-desktop/test/update-mirrors.test.mjs`
- Modify: `apps/dsh-desktop/test/update-surface.test.mjs`
- Modify: `apps/dsh-desktop/scripts/capture-startup.mjs`

1. Add failing tests for a fixed GitHub Releases help action, exact new guidance/button copy, built-in mirror removal, and official-source-first ranking.
2. Add a fixed `downloads` main-process action that opens the repository Releases page; do not expose arbitrary URL opening.
3. Render `前往 GitHub 下载`, `加入用户群`, and `稍后更新` when a newer version is downloading, ready, or failed. Keep `重启并安装` as the primary action once the verified installer is ready.
4. Make the blank mirror configuration mean GitHub only. Keep validation for explicitly configured HTTPS release proxies and rank them only after the official source.
5. Extend update capture/E2E assertions and run the focused Desktop tests.

## Task 2: Movable, resizable, persistent settings window

**Files:**

- Create: `apps/dsh-desktop/src/settings-window-state.mjs`
- Create: `apps/dsh-desktop/src/settings-window.mjs`
- Modify: `apps/dsh-desktop/src/electron-app.mjs`
- Modify: `apps/dsh-desktop/src/preload-main.cjs`
- Create: `apps/dsh-desktop/test/settings-window-state.test.mjs`
- Create: `apps/dsh-desktop/test/settings-window.test.mjs`
- Create: `apps/dsh-desktop/scripts/verify-settings-window.mjs`
- Modify: `apps/dsh-desktop/package.json`

1. Add failing pure tests for bounds validation/clamping, minimum size, changed viewport, and corrupt/missing persisted state.
2. Implement an atomic `settings-window-state.json` store under Electron `userData`; accept only finite numeric `{x,y,width,height}` values and return normalized/clamped bounds.
3. Expose only `getSettingsWindowBounds` and `setSettingsWindowBounds` to the main renderer, protected by the existing surface identity guard.
4. Inject scoped CSS and a controller that recognizes the upstream settings dialog through its `settings.header` slot, adds an accessible drag bar and eight pointer handles, and updates the existing flex panel without altering other dialogs.
5. Preserve responsive behavior: collapse the navigation rail to labels/icons appropriate to available width, give content `min-width: 0` and `overflow: auto`, and prevent the panel or controls from escaping the safe viewport.
6. Persist at the end of drag/resize, restore on reopen/reload, and reclamp on viewport resize. Test movement, all required bounds invariants, reopen persistence, a smaller BrowserWindow, and a high-DPI launch with Playwright.

## Task 3: Independent whale particle theme bundle

**Files:**

- Create: `packages/dsh-particle-theme/**`
- Modify: `packages/dsh-web-ui-settings/src/allowlist.ts`
- Modify: `packages/dsh-web-ui-settings/test/allowlist.test.ts`
- Modify: `packages/dsh-web-ui-all/aggregate.yml`
- Modify: `scripts/sync-shared.mjs`
- Modify: `apps/dsh-desktop/package.json`
- Modify: `apps/dsh-desktop/src/profile.mjs`
- Modify: root workspace metadata/lockfile as required by package installation

1. Scaffold a normal `@linxin666/dsh-particle-theme` host/client bundle using the existing live-stats settings pattern and the shared `PluginSettingsCard` trio.
2. Add failing tests for configuration defaults, scene-profile resolution, visibility/reduced-motion behavior, density caps, adaptive quality, registry extension, settings-card state, and DOM mount/disposal.
3. Register host settings under `particle-theme`: enabled, density, opacity, and speed. Add the namespace and package aliases to the Web UI bridge allowlist and Desktop managed profile.
4. Implement the fixed full-viewport whale canvas inspired by the startup silhouette: ambient motes, whale-form particles, slow drift, pointer-free rendering, capped DPR, deterministic cleanup, visibility pause, and adaptive frame-budget control.
5. Implement page awareness using visible dialogs and focused editable controls. Apply profile multipliers so particles become quieter behind settings, update, and text-entry surfaces.
6. Add a registry API with `whale` as the first definition so future particle themes can register without changing the controller.
7. Add a settings card with a master enable switch plus conservative density/opacity/speed controls. Verify runtime changes apply without restarting.
8. Add the package to the aggregate, Desktop runtime profile, dependency checks, shared-sync manifest, and lockfile; regenerate aggregate/shared artifacts with repository scripts.

## Task 4: Documentation, release notes, and complete verification

**Files:**

- Modify: `CHANGELOG.md`
- Modify: `README.md`
- Modify: `README.en.md`
- Modify: `docs/desktop.md`
- Create: `packages/dsh-particle-theme/README.md`
- Create: `packages/dsh-particle-theme/README.en.md`
- Modify: package-level aggregate/readme documentation where checks require it

1. Document GitHub-first behavior, the user-group fallback, opt-in mirror semantics, and remove any claim that domestic mirrors are faster.
2. Document settings-window movement/resizing/minimum/persistence and recovery/clamping behavior.
3. Document particle-theme controls, page-aware accessibility/performance behavior, and extension mechanism.
4. Run focused package/Desktop tests after each task, then run `pnpm typecheck`, `pnpm test`, `pnpm test:scripts`, `pnpm runtime-deps:check`, `pnpm sync-shared:check`, `pnpm aggregate:check`, `pnpm docs:check`, both new E2Es, existing window/update E2Es, Desktop packaging verification, and packaged smoke when available.
5. Inspect final `git diff` and `git status`, audit every objective bullet against code/tests/docs, and keep the persistent goal active unless the audit is completely green.
