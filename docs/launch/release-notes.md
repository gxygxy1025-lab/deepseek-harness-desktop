# DeepSeek Harness Desktop 0.1.9

## 中文

### 本次亮点

- 修复桌面版对话气泡、整段回复与代码块复制按钮点击无效的问题。应用只对当前本地 DSH 页面开放安全的剪贴板写入权限，剪贴板读取及其他敏感权限仍保持关闭。
- 自动更新调整为发现新版后直接在后台下载，不再用下载前系统弹窗打断对话。下载完成后会显示新的蓝黑毛玻璃更新面板，由用户选择立即重启安装或稍后处理。
- 侧边栏“检查更新”在桌面环境中改为检查 DeepSeek Harness Desktop，不再误触发 Web UI 插件自更新；普通浏览器部署仍保留原插件更新能力。
- 启动页改为简洁的“探索未至之境”界面，只保留当前状态和单条进度条。原有大圆球、轨道与阶段列表已移除，替换为完全本地绘制的原创蓝黑粒子鲸鱼。
- 粒子鲸鱼只在启动页面运行，进入 DSH 主界面后随页面导航自动释放；系统开启“减少动态效果”时会显示静态版本。
- 更新面板统一展示当前版本、目标版本、发行说明、下载进度、错误重试与重启安装状态，并继续在安装前安全停止内置 DSH 运行时。
- 默认内置并保护官方 `@vectorize-io/hindsight-coding-agents` 0.3.4 插件，为 DSH 提供按仓库隔离的长期记忆、知识页、自动召回与后台保存能力。实际启用前仍需按官方说明选择 Hindsight Cloud、自建服务或本地 daemon；Cloud 模式需要 API Token。

### 验证

- 桌面测试覆盖后台自动下载、进度状态、下载完成后的显式安装、手动检查及更新错误。
- IPC 测试验证更新状态只向渲染层暴露版本、说明、进度和错误等安全字段。
- 剪贴板权限测试覆盖本地运行时源校验、端口隔离以及其他权限的默认拒绝行为。
- 启动页使用 1440×900 桌面窗口完成视觉回归，验证粒子鲸鱼、毛玻璃进度条和紧凑布局。

### 下载与校验

下载 `DeepSeek-Harness-Desktop-Setup-0.1.9-x64.exe`，并使用同一 GitHub Release 中的 `SHA256SUMS.txt` 校验安装包。应用发现新版后会自动后台下载，但只有用户点击“重启并安装”后才会退出并安装。

### 说明

这是社区构建版本，并非 DeepSeek、OpenAI 或腾讯官方发行版。当前安装包未使用商业代码签名证书，Windows SmartScreen 可能显示“未知发布者”。请只从本项目的 GitHub Release 页面下载并核对 SHA-256。

## English

### Highlights

- Fixes inactive copy buttons for message bubbles, complete responses, and code blocks in the desktop app. Only sanitized clipboard writes from the active local DSH origin are allowed; clipboard reads and other sensitive permissions remain denied.
- Starts downloading a discovered desktop release in the background instead of interrupting the conversation with a pre-download system prompt. A new blue-black glass panel appears after the download and lets the user restart and install or defer it.
- Routes the sidebar update trigger to DeepSeek Harness Desktop when hosted by Electron instead of updating the Web UI plugin. Browser-only deployments retain the existing plugin updater.
- Simplifies startup to “探索未至之境”, one status line, and one progress meter. The previous sphere, orbits, and phase list are replaced with an original locally rendered blue-black particle whale.
- Runs the particle whale only on the startup document and releases it when navigation enters the DSH surface. Reduced-motion systems receive a static rendering.
- Unifies current version, target version, release notes, download progress, retry, and restart-install states in the desktop update surface while preserving the safe runtime shutdown before installation.
- Bundles and protects the official `@vectorize-io/hindsight-coding-agents` 0.3.4 plugin, adding repository-scoped long-term memory, knowledge pages, automatic recall, and background retention to DSH. Before memory can operate, users still choose Hindsight Cloud, a self-hosted server, or a local daemon as documented upstream; Cloud mode requires an API token.

### Verification

- Desktop tests cover automatic background download, progress state, explicit installation after download, manual checks, and update errors.
- IPC tests ensure that renderer update state contains only safe version, notes, progress, and error fields.
- Clipboard permission tests cover active loopback-origin matching, port isolation, and deny-by-default behavior for every other permission.
- The startup page was visually checked at 1440×900 for the particle whale, glass progress surface, and compact layout.

### Download and verification

Download `DeepSeek-Harness-Desktop-Setup-0.1.9-x64.exe` and verify it with `SHA256SUMS.txt` from the same GitHub Release. The app downloads discovered releases in the background, but exits and installs only after the user chooses “Restart and install”.

### Notice

This is a community build and not an official DeepSeek, OpenAI, or Tencent distribution. The installer is not signed with a commercial code-signing certificate, so Windows SmartScreen may report an unknown publisher. Download only from this project's GitHub Release page and verify the SHA-256 checksum.
