# DeepSeek Harness Desktop 0.1.3

## 中文

### 本次亮点

- 萌化 DeepSeek 鲸鱼娘图标现在会在运行时明确应用到主窗口和扩展坞。程序 EXE、NSIS 安装器、桌面快捷方式、开始菜单、应用窗口和 Windows 任务栏使用同一套多分辨率图标，不再回退到 Electron 默认图标。
- 新增内置更新功能：应用会在启动后和每六小时检查一次本项目的稳定版 GitHub Release，也可通过“帮助 / Help - 检查更新 / Check for Updates”立即检查。
- 发现新版本时会先显示当前版本、目标版本、发行标题、发布时间和更新内容。只有用户确认后才下载，下载进度会显示在 Windows 任务栏；安装前还会再次确认并安全停止 DSH 运行时。

0.1.3 是首个内置更新客户端的版本。用户需要从 GitHub 手动安装这一次，之后的新版本即可在应用内发现和更新。

### 验证

- 41 项桌面单元与集成测试全部通过，覆盖图标路径、运行时图标应用、更新内容转换、重复检查抑制、下载确认、进度展示和安装确认。
- 44 个必要的打包运行依赖通过审计，同时验证了运行时 PNG 图标、`app-update.yml`、`latest.yml`、安装包和 blockmap。
- 最终打包 EXE 已完成真实窗口启动、更新器加载、帮助菜单入口、原生窗口标题栏和官方内嵌目录选择器回归测试。
- GitHub Actions 的独立 Windows 发布流水线已成功完成测试、打包、校验和 Release 资产上传。

### 下载与校验

下载 `DeepSeek-Harness-Desktop-Setup-0.1.3-x64.exe`，并使用相邻的 `SHA256SUMS.txt` 校验文件。

安装包 SHA-256：`5f83930feccd9ad68d4bc9cc0ffe7bf62865c89bb5606b67e5ebbae23f1883e9`

### 说明

这是社区构建版本，并非 DeepSeek 官方发行版。当前版本未使用商业代码签名证书，Windows SmartScreen 可能提示“未知发布者”。请仅从本项目 GitHub Release 页面下载，并尽量使用已经验证的默认安装路径。

## English

### Highlights

- The kawaii DeepSeek whale-girl icon is now applied explicitly to the main window and Extension Dock at runtime. The executable, NSIS installer, desktop shortcut, Start menu shortcut, application windows, and Windows taskbar use the same multi-resolution artwork instead of falling back to Electron's default icon.
- Built-in updates now check the stable channel of this project's GitHub Releases after startup and every six hours. Users can also run an immediate check from `Help - Check for Updates`.
- Before downloading, the app shows the installed version, target version, release title, publication time, and release notes. Downloads start only after confirmation and report progress in the Windows taskbar. Installation requires another confirmation and stops the embedded DSH runtime cleanly before restart.

Version 0.1.3 is the first release with the updater client. Install this version once from GitHub; later releases can be discovered and installed from inside the app.

### Verification

- All 41 desktop unit and integration tests passed, covering icon resolution, runtime icon application, release-note normalization, duplicate-check suppression, download confirmation, progress reporting, and installation confirmation.
- All 44 required packaged runtime packages passed the audit together with the runtime PNG icon, `app-update.yml`, `latest.yml`, installer, and blockmap.
- The final packaged executable passed real startup, updater loading, Help menu, native window chrome, and official in-app directory picker regression tests.
- The independent Windows GitHub Actions release workflow completed testing, packaging, checksum generation, and Release asset publication successfully.

### Download and verification

Download `DeepSeek-Harness-Desktop-Setup-0.1.3-x64.exe` and verify it with the adjacent `SHA256SUMS.txt` file.

Installer SHA-256: `5f83930feccd9ad68d4bc9cc0ffe7bf62865c89bb5606b67e5ebbae23f1883e9`

### Notice

This is a community build and not an official DeepSeek distribution. It is not signed with a commercial code-signing certificate, so Windows SmartScreen may report an unknown publisher. Download only from this project's GitHub Release page and prefer the tested default installation location.
