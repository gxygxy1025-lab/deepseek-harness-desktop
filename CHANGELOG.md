# Changelog

## 0.1.3 - 2026-08-14

中文：

- 在所有运行时窗口中明确应用萌化 DeepSeek 图标，Windows 任务栏不再回退到 Electron 默认图标。
- 新增稳定版 GitHub Release 检查、双语更新内容展示、用户确认下载、任务栏下载进度和用户确认重启安装。
- 新增手动检查更新入口，并在发行资产中加入后续自动更新所需的 `latest.yml`。

English:

- Applied the kawaii DeepSeek icon explicitly to every runtime window so the Windows taskbar no longer falls back to the Electron icon.
- Added stable GitHub Release checks, release-note display, user-confirmed downloads, taskbar download progress, and user-confirmed restart installation.
- Added a manual update command and shipped the GitHub `latest.yml` metadata required by future desktop releases.

## 0.1.2 - 2026-08-14

- Replaced the failing Windows native folder-dialog worker with the official DSH in-app directory browser.
- Reduced the Windows release payload by pruning published source, declarations, development material, and non-x64 native artifacts after packaging.
- Replaced the desktop and installer artwork with a cute anthropomorphic DeepSeek whale-girl icon.

## 0.1.1 - 2026-08-14

Natural Windows chrome refinement.

- Replaced the disconnected bright title and menu rows with a 46-pixel deep-sea title surface.
- Preserved native Windows caption buttons, resizing, keyboard menu access, and Snap layouts.
- Added context-aware labels for startup, the original Web surface, and the Extension Dock.
- Added page safe-area handling plus unit and real-runtime Electron verification.

## 0.1.0 - 2026-08-14

Initial Windows desktop release.

- Lossless Electron host for the official DSH Web application.
- Isolated, idempotent `desktop` profile with the complete dsh-web-ui aggregate.
- Managed runtime lifecycle, readiness probes, graceful shutdown, bounded restart, and recovery UI.
- Hardened preload, IPC, navigation, permissions, downloads, logs, and window-state persistence.
- Extension Dock for protected built-ins, transactional registry plugins, and safe skill discovery/import.
- 21 bundled UI plugins with 9 selectable skins, including Miku and Trading, plus the upstream compatibility layer.
- Hermetic DSH rc.6 runtime peer closure, verified from a clean short-path Windows installation.
- Windows x64 NSIS installer, reproducible verification script, and CI/release workflows.
