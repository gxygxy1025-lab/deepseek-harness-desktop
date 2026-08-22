# DeepSeek Harness Desktop 1.0.4

## 中文

### 本次亮点

- 更新桌面应用图标为黑色鲸鱼，并统一应用到开发窗口、主窗口、系统托盘、Windows 安装程序和已安装应用资源。
- 安装包版本更新为 `1.0.4`，同时生成匹配的 `latest.yml`、区块映射文件和 SHA-256 校验文件，便于后续自动更新和人工核验。
- 保留官方 DeepSeek Harness Runtime、对话、模型设置、工作区、文件操作、Windows 窗口和系统托盘等核心能力。
- 已隐藏不属于核心版的社群入口，启动时不再弹出外部网页，也不再展示社群二维码。
- 更新、隐私政策、启动诊断和 GitHub 下载入口继续由桌面端统一管理，避免链接指向旧仓库或不存在的页面。

### 验证

- 桌面单元测试通过，共 224 项测试全部通过，没有失败、取消或跳过的桌面回归测试。
- Windows 安装包已在本地构建成功，安装包包含新的透明 PNG 图标和七个尺寸的 Windows ICO 图标。
- 安装包目录检查通过，官方 Runtime 包、`app.asar`、更新元数据和应用图标资源均存在。
- 打包后启动冒烟测试通过，桌面窗口、Renderer、Runtime、Profile 和工作区启动链路均完成初始化。
- 发布前还会在 GitHub Actions 中重新安装依赖、执行核心验证、构建 Windows 安装包，并上传校验文件。

### 下载与校验

下载 `DeepSeek-Harness-Desktop-Setup-1.0.4-x64.exe`，并使用同一 GitHub Release 中的 `SHA256SUMS.txt` 校验文件。安装包只应从项目 GitHub Release 或项目官网的官方下载链接获取。自动更新使用公开 Release 元数据；如果 Release 尚未完成发布，应用会提示用户稍后重试或前往 GitHub 下载页面。

### 说明

这是面向 Windows 的社区维护桌面构建，不代表 DeepSeek、OpenAI 或腾讯官方发行。安装程序当前未使用商业代码签名证书，Windows SmartScreen 可能显示未知发布者。请在安装前核对下载来源和 SHA-256。应用不会静默启用后台常驻，也不会自动加入社群；用户的模型配置、工作区和 Harness 数据仍由本机配置目录管理。更新程序只替换应用版本，不会主动删除用户的 Harness 数据。

## English

### Highlights

- Updated the desktop artwork to the requested black whale icon and applied it consistently to the development window, main window, system tray, Windows installer, and packaged application resources.
- Bumped the desktop release to `1.0.4` and generated matching `latest.yml`, blockmap, and SHA-256 checksum metadata for future updates and manual verification.
- Kept the official DeepSeek Harness Runtime, conversations, model settings, workspace access, file operations, Windows desktop window, and system tray as the core product surface.
- Hid community entry points that are outside the core release, removed the external web-page launch during startup, and removed the community QR-code presentation.
- Desktop update, privacy-policy, startup diagnostics, and GitHub download actions continue to use fixed, repository-safe destinations instead of stale project paths.

### Verification

- The desktop regression suite passed all 224 tests with no failures, cancellations, or skipped desktop checks.
- The Windows installer was built locally with the new transparent PNG artwork and a Windows ICO containing seven icon sizes.
- Packaged-directory verification passed and confirmed the official Runtime packages, `app.asar`, update metadata, and packaged application icon are present.
- The packaged smoke test passed through application readiness, renderer loading, Runtime startup, profile initialization, and workspace readiness.
- GitHub Actions performs a clean dependency installation, the core verification set, Windows packaging, packaged checks, and release-asset upload before publishing the release.

### Download and verification

Download `DeepSeek-Harness-Desktop-Setup-1.0.4-x64.exe` and verify it with `SHA256SUMS.txt` from the same GitHub Release. Use only the project GitHub Release or the official project website download link. Automatic updates use public Release metadata; if the Release has not finished publishing, the application asks the user to retry later or open the GitHub download page.

### Notice

This is a community-maintained Windows desktop build and is not an official distribution from DeepSeek, OpenAI, or Tencent. The installer is not currently signed with a commercial code-signing certificate, so Windows SmartScreen may show an unknown publisher. Verify the download source and SHA-256 before installation. The application does not silently enable background residency or automatically join a community. Model settings, workspaces, and Harness data remain in the local user profile. Updating replaces the application version and does not intentionally delete the user’s Harness data.
