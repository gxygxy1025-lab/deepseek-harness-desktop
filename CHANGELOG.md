# Changelog

## 0.1.4 - 2026-08-14

中文：

- 修复桌宠客户端挂载在已失效会话插槽、导致主页看不到鲸鱼娘的问题，改为使用全局 Shell Overlay。
- 修复 DSH rc.6 设置接口过滤自定义命名空间的问题，Web UI 插件分组现在会显示移动端远程控制、皮肤中心、实时令牌估算、任务看板和宠物五个配置项。
- 重新生成并构建皮肤中心清单，完整展示随桌面版安装的 9 套可选皮肤，并增加运行时、资源与打包回归检查。

English:

- Fixed the whale-girl desktop pet disappearing because its client was attached to a conversation slot no longer rendered by the rc.6 shell; it now uses the root shell overlay.
- Exposed the five bundled Web UI settings namespaces through the rc.6 Host API allowlist, restoring the Remote, Skin Center, Live Stats, Task Board, and Pet cards.
- Regenerated the Skin Center bundle so all nine installed skins are listed, and added runtime, asset, and packaged-payload regression coverage.

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
