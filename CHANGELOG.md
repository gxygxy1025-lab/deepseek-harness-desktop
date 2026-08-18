# Changelog

## Unreleased

中文：暂无。

English: No changes yet.

## 2.4.0 - 2026-08-18

中文：

- SSH 已连接终端在主机、监控和终端视图之间切换时保持挂载与在线，返回后不再重新建立连接；终端补齐右键菜单与原生编辑菜单粘贴入口。
- 桌面壳固定接管侧边栏左下角下载按钮：它始终打开桌面软件更新，即使远程插件升级或重新渲染也不会切回插件全家桶更新；社区插件更新继续只在扩展坞中进行。
- Windows runtime、终端及 PowerShell 工具统一继承隐藏控制台，修复执行 `pwsh` 工具时额外命令窗口闪现的问题。
- 皮肤启用状态完全迁移到 `profiles/desktop` 私有补丁，并在桌面启动时反向迁移、清理旧版写入全局 `~/.dsh/cordis.patch.yml` 的托管段，避免破坏官方 `dsh web` 的 YAML 与 profile。
- 安装预检增加唯一产品主程序名兜底，可清理注册表路径漂移、旧安装目录移动或路径不可见时残留的 2.2 主进程，避免旧卸载器返回错误码 2；官方 Web runtime 与无关 PowerShell/Node 进程仍受保护。
- 桌面自有标题栏、启动页、更新面板、扩展坞与社区提示完善明暗主题变量和窗口行为，一次性社区提示的发布目标同步到 2.4.0。
- 覆盖更新引入令牌绑定的关闭回执协议 v2：桌面端仅在 runtime 停止、扩展操作暂停和资源释放完成后原子写入回执，安装器校验 token、旧 PID 与完成状态；旧版或超时场景继续使用受限清理降级。
- 主界面和扩展坞拆分 preload，并用 renderer surface 注册表校验每个敏感 IPC 的真实发送方；新增 Desktop Contract 1.0.0 能力快照与稳定错误码，主界面不再持有插件写操作、QQ Bot 凭据和技能导入接口。
- 任务看板增加 profile 隔离的 Host 文件存储 v2、原子写入、损坏文件保留、SSE 多标签同步和 localStorage v1 复制校验迁移；2.4.x 保留 v1，Host 不可用时自动回退，浏览器定时调度行为不变。
- Desktop CI 新增官方目录选择器真实 E2E，发布门禁继续覆盖全仓验证、安装包内容校验和打包运行烟测。

English:

- Connected SSH terminals now remain mounted and online while switching among host, monitor, and terminal views. Returning no longer creates a new connection, and terminal paste is available through both the context menu and native Edit menu.
- The Desktop shell now permanently owns the lower-left sidebar download trigger. It always opens the Desktop application updater, even after the remote plugin is upgraded or re-renders; community plugin updates remain confined to Extension Dock.
- Windows runtime, terminal, and PowerShell tool processes now inherit a hidden console host, preventing an extra command window from flashing when a `pwsh` tool runs.
- Skin enablement state is fully isolated in the private `profiles/desktop` patch. Desktop startup reverse-migrates and removes legacy managed sections from global `~/.dsh/cordis.patch.yml`, preserving valid YAML and the official `dsh web` profile.
- Installer preflight now falls back to the unique Desktop product executable name when registry paths drift, an old installation is moved, or its path is inaccessible. This closes 2.2 main-process remnants before the legacy uninstaller can return code 2 while preserving the official web runtime and unrelated PowerShell or Node processes.
- Desktop-owned title bars, startup and update surfaces, Extension Dock, and community prompt now have more complete light/dark theme variables and window behavior. The one-time community prompt is targeted to the 2.4.0 release.
- In-place updates now use token-bound shutdown receipt protocol v2. Desktop atomically publishes an acknowledgement only after the runtime stops, extension operations quiesce, and resources are released; the installer validates the token, old PID, and completion state while legacy or timed-out releases retain the constrained cleanup fallback.
- Main and Extension Dock use split preloads, and a renderer-surface registry validates the real sender of every sensitive IPC call. Desktop Contract 1.0.0 adds capability snapshots and stable error codes; Main no longer holds plugin mutation, QQ Bot credential, or skill-import bridges.
- Task Board now has profile-isolated Host-file schema v2, atomic writes, corrupt-file preservation, SSE cross-tab synchronization, and a verified copy-first localStorage v1 migration. Version 2.4.x retains v1 and falls back when Host storage is unavailable, while browser scheduling stays unchanged.
- Desktop CI now includes a real official directory-picker E2E check, while release gates retain full repository verification, packaged-payload checks, and packaged runtime smoke coverage.

## 2.3.0 - 2026-08-17

中文：

- 新增只在 2.3.0 首次主界面启动时出现一次的 GitHub Star 引导弹窗，采用更克制的分层淡入、缓慢星轨与一次性光晕动画，并遵循系统“减少动态效果”设置。
- Star 引导展示状态由 Electron 主进程原子持久化，页面刷新和后续启动不会重复打扰；除固定仓库入口外，新增“加入社群，随时反馈 Bug”选项，复用受控社群 IPC，不请求 GitHub API、不虚构 Star 数量或点星结果。
- 修复旧安装目录已不存在时，PowerShell 安装预检因强制解析目录失败并被误报为“仍有后台进程”的问题；缺失目录现在直接视为无需清理。
- 安装检查改为 electron-builder 的单一 `customCheckAppRunning` 入口，读取当前目录和 HKCU/HKLM 记录的旧安装目录，兼容 0.1.9 直接升级；直接进程按旧主程序或旧 `resources` 的真实路径识别，外部后代必须另有安装根路径引用才会归因，不再全局按进程名或仅凭父子关系追杀，并区分真实冲突与脚本异常。
- 修复旧版本（如 2.2）升级时安装器反复误报“仍有后台进程”：旧运行时由安装目录外的隐藏 PowerShell/CMD/Node 后代承载，仅按可执行路径清理会漏杀。安装预检新增按命令行中的安装路径归因清理这些外部后代；针对 2.2 的 `powershell -EncodedCommand` 宿主，先解码 Base64 负载再匹配安装路径；匹配集合同时保留安装器或注册表提供的 Windows 8.3 短路径引用与规范化长路径，避免短路径命令行漏判；进程句柄无权打开时（如旧程序以管理员身份运行）回退到 WMI 可执行路径归属，让残留进程被明确报告而不是让文件复制半途失败。力杀循环加入等待退出与退避重试。归因只认安装根路径引用：官方 Web 端运行时（命令行指向 npm 全局目录或 `~/.dsh`）、同名程序和无安装路径引用的外部进程都不会被误杀。
- 与官方 Web 端共存：桌面运行时固定使用独立 profile（`profiles/desktop`），端口状态保存在该 profile 私有文件中；首选端口被占用（含被官方 Web 端占用）时自动回退到系统分配端口，两端可同时运行且互不抢占。对共享主目录的写入（settings.yaml 重试策略、托管补丁段）均为增量、原子操作，不覆盖用户或官方端既有配置。

English:

- Added a dismissible GitHub Star prompt shown once when the 2.3.0 main surface first opens, with restrained staggered entry, slow orbit motion, a one-shot halo, keyboard accessibility, theme support, and reduced-motion handling.
- The Electron main process atomically persists prompt display state, preventing repeat interruptions after reloads or later launches. A new community action provides a controlled path for ongoing bug feedback alongside the fixed repository action, without GitHub API requests or invented star results.
- Fixed upgrade preflight falsely reporting background processes when the previous installation directory had already been removed and mandatory PowerShell path resolution failed. A missing directory is now a clean no-op.
- Replaced duplicate early and framework-default process checks with one `customCheckAppRunning` path that reads current plus HKCU/HKLM legacy install roots and supports direct upgrades from 0.1.9. Direct processes are identified by real paths under the old app or `resources` tree; external descendants require a separate install-root reference for attribution and are never killed merely by name or parentage. Real conflicts and script failures retain distinct diagnostics.
- Fixed the installer repeatedly reporting "background processes still running" when upgrading from older releases (e.g. 2.2): legacy runtimes are hosted by hidden PowerShell/CMD/Node descendants outside the install directory, which executable-path-only cleanup missed. Preflight now attributes external processes whose command line references an install root, decoding `powershell -EncodedCommand` Base64 payloads (the 2.2 runtime host) before matching. Matching preserves both Windows 8.3 short-path references supplied by the installer or registry and their canonical long-path forms, preventing short command lines from being missed. It also falls back to the WMI executable path when a process handle cannot be opened (e.g. an elevated old instance), so stragglers are reported instead of failing the file copy midway. The force-kill loop waits for exits and retries with backoff. Attribution only trusts install-root references: an official web runtime (its command line points at the npm global directory or `~/.dsh`), same-name apps, and external processes without any install-path reference are never killed.
- Coexistence with the official web client: the desktop runtime always uses its own profile (`profiles/desktop`) and keeps its port state in that profile-private file. When the preferred port is occupied (including by the official web client), it falls back to a system-assigned port, so both clients can run side by side without stealing ports from each other. Writes to the shared home directory (settings.yaml retry policies, managed patch sections) are incremental and atomic, never overwriting existing user or official-client configuration.

## 2.2.0 - 2026-08-17

中文：

- Windows 运行时改由隐藏 PowerShell 控制台承载，使终端、PowerShell、CMD 和第三方子进程继承隐藏窗口，不再因遗漏单个 `windowsHide` 而弹出命令框；进程树清理继续显式隐藏。
- 新增旧 profile 托管识别：包身份与随 2.2 提供的版本一致，或旧 profile 曾明确声明该依赖时，自动接管为 Desktop 托管链接；未知用户目录仍保留并拒绝覆盖。
- 升级安装器按真实可执行路径识别旧安装主程序及旧 `resources` 内的后台进程并自动结束，无需用户按进程名手工清理；新增真实 Windows 清理、隐藏运行时和 2.1→2.2 profile 升级回归。
- 旧应用根进程确认后继续沿父子关系清理社区插件启动的 CMD、PowerShell、Node 与 `prepare` 后代；运行时端口持久化并在可用时跨重启复用，被占用才回退到自动分配。
- 插件恢复只接受明确加载失败或导入栈指向社区插件的强证据；端口占用、宿主失败及普通日志中出现插件名不再触发自动隔离或安全模式。
- 首次启动会识别并撤销 2.1 因“运行时 120 秒未就绪”写入的未知故障安全模式，同时保留用户插件文件；用户主动安全模式会显示明确提示，并可在插件恢复页一键恢复全部插件和重启。

English:

- Hosted the Windows runtime inside a hidden PowerShell console so terminal, PowerShell, CMD, and third-party descendants inherit a hidden window even when an individual dependency omits `windowsHide`; process-tree cleanup remains explicitly hidden.
- Added legacy-profile ownership recognition: Desktop adopts an unrecorded package when its identity and bundled version match, or when the previous profile explicitly declared that dependency. Unknown user-owned directories remain protected.
- The upgrade installer now identifies the previous app and background executables under its `resources` tree by their real executable paths and stops them automatically, with real Windows cleanup, hidden-runtime, and 2.1-to-2.2 migration regressions.
- After verifying an old app root, cleanup follows parent-child relationships to include CMD, PowerShell, Node, and `prepare` descendants launched by community plugins. The runtime port is persisted and reused across restarts while available, falling back to automatic allocation only on a real conflict.
- Plugin recovery now requires an explicit load failure or an importer stack attributed to a community package. Port conflicts, host failures, and incidental plugin-name mentions no longer trigger automatic isolation or safe mode.
- First launch repairs 2.1 safe-mode state caused by an unattributed 120-second readiness timeout without deleting plugin files. User-requested safe mode remains explicit and now offers a visible notice plus one-click restore-and-restart.

## 2.1.0 - 2026-08-17

中文：

- 自动更新加入国内 GitHub Release 镜像测速与故障切换，版本元数据仍来自 GitHub，安装包继续按 `latest.yml` 的 SHA-512 校验。
- 新增插件三层容灾：变更前快照、故障插件一次性自动隔离、连续失败后的安全模式，以及不依赖 DSH 插件系统的独立恢复入口。
- 统一皮肤中心、插件市场和桌面宿主的持久化口径，修复依赖层主题切换、旧禁用状态迁移、Windows 写后校验和 bundle 接线互相覆盖的问题。
- 修复升级时旧进程未退出、安装器无法删除旧文件、隐藏 PowerShell 窗口打断操作，以及中文或非系统盘工作区失败后重复重启的问题。
- 工具菜单新增扩展坞入口；扩展操作全程串行化，市场安装和更新统一交给桌面 PluginManager，失败可恢复旧清单、锁文件和运行时。
- 补齐内置主题依赖并升级内置插件组合，收紧共享构建配置、SDK source map 过滤、运行时依赖和打包完整性门禁。
- 加强窗口状态、日志、下载目标、QQ Bot、导航、运行时停止与重启、可选集成加载等 Electron 副作用隔离，并加入打包启动性能测量。

English:

- Added measured mainland-China GitHub Release mirrors with automatic fallback while keeping GitHub metadata and `latest.yml` SHA-512 verification authoritative.
- Added three-layer plugin resilience: pre-mutation snapshots, one-shot culprit isolation, safe mode after repeated failures, and an independent recovery surface that does not depend on the DSH plugin runtime.
- Unified Skin Center, marketplace, and Desktop persistence semantics, fixing dependency-only theme activation, legacy disabled-state migration, Windows post-write verification, and competing bundle wiring.
- Fixed update installation when stale processes hold old files, hidden PowerShell windows stealing focus, and repeated restart loops after failures in Unicode or non-system-drive workspaces.
- Exposed Extension Dock from the Tools menu, serialized extension mutations end to end, and routed marketplace install and update operations through Desktop PluginManager with manifest, lockfile, and runtime rollback.
- Completed missing built-in theme dependencies and refreshed the bundled plugin set while tightening shared build configuration, SDK source-map filtering, runtime dependency checks, and package integrity gates.
- Isolated Electron side effects across window state, logs, download destinations, QQ Bot, navigation, runtime stop/restart, and optional integrations, with packaged-startup measurements added to release validation.

## 2.0.0 - 2026-08-16

中文：

- 修复取消当前任务后排队消息滞留，并将已知的对象字符串取消错误替换为明确提示；长思考内容的折叠标题会吸附在滚动区域顶部。
- 新增对话 Skills 技能库，支持搜索、最近使用、滚轮与键盘导航；为瞬态模型 API 故障增加最多四次的有界退避重试。
- 新增 Linux SSH 实时监控和经过校验、需要确认的进程终止与 systemd 服务重启操作，保留原有实时终端能力。
- 新增运行时完整性预检，安装不完整时直接提示修复而不进入崩溃重启循环；统一桌面自有界面与 Harness 原生视觉。
- 删除启动页蓝色装饰点，增强右侧粒子鲸鱼的游动、呼吸、转向和尾部动作，并适配减少动态效果与后台暂停。
- 扩展坞新增插件实际版本、三态兼容性和社区更新检查；内置插件随 Desktop 更新，已知不兼容版本会被拦截，未知适配需明确确认。
- 社区插件升级改为运行中预取、离线精确切换和启动失败自动回滚；启动时只做本地兼容隔离，不访问注册表。
- 缓存运行包解析并并行检查 profile 链接，同机未变化配置中位耗时从约 54.9 ms 降至 13.2 ms。
- 将内置 dsh-web-ui 插件套件同步到 0.1.15，新增图像描述、量身 Agent、Harbor 与 QQ2006 皮肤，并吸收各插件的性能、设置和稳定性改进。
- 将腾讯 QQ Bot 升级到 0.3.0、扩展坞升级到 0.1.1、插件市场升级到 1.3.0；市场重启仍由 Electron 桌面宿主统一管理。
- 补齐 Windows 兼容：SFTP 路径规范化、更新超时测试、POSIX 权限测试隔离、共享路径测试和生成器路径识别。

English:

- Restored queued messages after cancellation, replaced the known object-string cancellation error with a clear message, and made the reasoning disclosure control sticky inside the conversation scroll area.
- Added a searchable Skills library with recent items, wheel and keyboard navigation, plus up to four bounded backoff retries for transient model API failures.
- Added live Linux SSH monitoring and validated, confirmation-gated process termination and systemd restart actions while preserving the existing real-time terminal.
- Added packaged-runtime integrity preflight so incomplete installs show repair guidance instead of entering a crash/restart loop, and aligned Desktop-owned surfaces with the native Harness visual system.
- Removed the decorative startup dot, expanded the right-side particle whale's swimming, breathing, heading, and tail motion, and added reduced-motion and hidden-document behavior.
- Added actual plugin versions, three-state compatibility, and community update checks to Extension Dock; built-ins follow Desktop releases, known-incompatible candidates are blocked, and unknown compatibility requires confirmation.
- Changed community upgrades to online prefetch, exact offline switching, and automatic rollback after a failed start; launch performs only local compatibility quarantine and no registry access.
- Cached runtime package resolution and parallelized profile-link checks, reducing median unchanged-profile preparation on the reference machine from about 54.9 ms to 13.2 ms.
- Synced the bundled dsh-web-ui plugin suite to 0.1.15, adding Describe Image, the Liangshen agent, Harbor, and QQ2006 while incorporating the suite's performance, settings, and reliability improvements.
- Upgraded Tencent QQ Bot to 0.3.0, Extension Dock to 0.1.1, and the plugin market to 1.3.0; Electron remains the sole runtime-restart supervisor.
- Completed Windows adaptation for SFTP path normalization, update-timeout tests, POSIX permission-test isolation, shared path tests, and generator path detection.

## 0.1.7 - 2026-08-15

中文：

- 全新设计深海探索启动界面，以状态驱动的真实进度、三阶段启动提示、完整恢复操作、减少动态效果适配和无障碍进度语义替代旧启动页。
- 将顶部窗口栏压缩为 32 像素的 macOS 风格磨砂玻璃材质，只保留真实软件图标，同时继续使用原生 Windows 窗口按钮并安全避让全屏弹窗。
- 大文件预览改为有界读取和流式原始响应，标签页内容加入内存预算；相同仓库的 Git 状态轮询合并执行，慢请求不再重叠堆积。
- SSH 输出改为按真实字节限额并安全处理跨块 UTF-8，目录上传移除同步遍历；首次冷启动容忍时间提升至 120 秒，安装版验收失败会输出最近运行日志。
- 扩大 Windows CI 与发布门禁，统一 Node 版本边界、全量测试、生成文件检查、官网回退版本校验和安装载荷裁剪验证。

English:

- Replaced the old launch screen with a deep-ocean discovery experience driven by real runtime state, three visible phases, complete recovery actions, reduced-motion handling, and accessible progress semantics.
- Refined the top chrome into a 32-pixel macOS-inspired frosted-glass surface with only the real app icon, while retaining native Windows caption controls and modal safe-area behavior.
- Bounded large-file preview reads, streamed raw responses, and added a tab-content memory budget; Git status polling is shared per repository and slow polls can no longer overlap.
- Made SSH output limits byte-accurate across split UTF-8 chunks and removed synchronous upload traversal; expanded first-run startup tolerance to 120 seconds and added recent runtime logs to packaged E2E failures.
- Strengthened Windows CI and release gates around supported Node versions, complete tests, generated assets, website fallback versions, and packaged-payload pruning.

## 0.1.6 - 2026-08-14

中文：

- 内置腾讯官方 QQ Bot 与扫码 Connector，在扩展坞提供二维码绑定、刷新、取消、重新绑定和解绑。
- 未绑定时保持插件禁用，扫码成功后自动启用并重启 DSH；AppSecret 通过 Windows 凭据保护加密，只注入子进程。

English:

- Bundled Tencent's official QQ Bot and QR Connector with in-dock QR binding, refresh, cancellation, rebinding, and unbinding.
- Kept the plugin disabled until binding succeeds, then enabled it and restarted DSH automatically; AppSecret is protected by Windows credential encryption and supplied only to the child process.

## 0.1.5 - 2026-08-14

中文：

- 窗口标题栏现在跟随 DSH 的亮色/暗色主题，并让原生 Windows 窗口按钮同步使用匹配的前景与背景色。
- 修复设置等全屏弹窗被自定义标题栏遮住上边界的问题，弹窗统一使用标题栏下方的安全可视区域。
- 修复打包版皮肤中心扫描源码路径和写错配置层的问题；现在从 `~/.dsh/profiles/desktop/node_modules` 发现皮肤，并更新桌面 profile 的 `cordis.patch.yml`。
- 将 `dshmarket` 1.0.3 与 `dsh-plugin-hub` 0.1.0 作为内置桌面插件，并让市场安装目标指向 `desktop` profile。

English:

- Made the custom title bar follow the DSH light/dark theme, including matching native Windows caption colors.
- Kept full-screen dialogs below the custom title bar so their top border and rounded corners are no longer clipped.
- Fixed packaged Skin Center discovery and configuration: skins are read from the desktop profile and switches update that profile's patch file.
- Bundled `dshmarket` 1.0.3 and `dsh-plugin-hub` 0.1.0, with marketplace installs targeting the desktop profile.

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
