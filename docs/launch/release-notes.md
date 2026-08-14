# DeepSeek Harness Desktop 0.1.6

## 中文

### 本次亮点

- 内置腾讯官方 `@tencent-connect/dsh-qqbot` 0.2.0，并固定安装到隔离的 `desktop` profile。QQ 私聊与群聊现在可以直接接入桌面版 Harness。
- 扩展坞新增 QQ 机器人绑定卡片。首次使用会在桌面窗口显示可自动刷新的二维码，支持取消、重新绑定和解除绑定，不再依赖不可见的后台终端。
- 未绑定时 QQ Bot 插件保持禁用，不会在启动阶段等待终端扫码或影响 Web UI 就绪；扫码成功后会自动启用插件并重启 DSH。
- AppSecret 使用 Electron `safeStorage` 和 Windows 系统凭据保护加密保存，只注入 DSH 子进程环境，不会发送给渲染页面、写入运行日志或明文落到 `cordis.patch.yml`。

### 验证

- 53 项桌面测试覆盖 profile 合成、加密凭据边界、二维码生命周期、取消与解绑、IPC 安全载荷、运行时环境注入和真实 DSH Host 启动。
- Electron 端到端检查已调用腾讯官方 Connector 获取真实二维码，并确认二维码可在扩展坞正确显示和取消，过程中未完成绑定或保存凭据。
- 打包校验会确认官方 QQ Bot 包及其运行依赖存在于安装版，并继续检查所有桌面运行时包、皮肤清单和客户端 bundle。

### 下载与校验

下载 `DeepSeek-Harness-Desktop-Setup-0.1.6-x64.exe`，并使用同一 GitHub Release 中的 `SHA256SUMS.txt` 校验安装包。应用内更新只会在用户确认后下载，安装与重启也会再次请求确认。

### 说明

这是社区构建版本，并非 DeepSeek 或腾讯官方发行版。QQ Bot 插件和扫码 Connector 来自腾讯官方 npm 包。当前安装包未使用商业代码签名证书，Windows SmartScreen 可能显示“未知发布者”。请只从本项目的 GitHub Release 页面下载并核对 SHA-256。升级会保留现有 DSH_HOME、桌面 profile、桌宠状态、皮肤配置和已加密的 QQ Bot 绑定凭据。

## English

### Highlights

- Bundled Tencent's official `@tencent-connect/dsh-qqbot` 0.2.0 in the isolated `desktop` profile, enabling QQ direct-message and group-chat access to the desktop Harness.
- Added a QQ Bot binding card to Extension Dock. First use now shows an auto-refreshing QR code in the desktop window with cancel, rebind, and unbind controls, without relying on a hidden terminal.
- The QQ Bot plugin stays disabled until credentials exist, so terminal QR setup cannot delay Web UI startup. A successful scan enables the plugin and restarts DSH automatically.
- AppSecret is encrypted through Electron `safeStorage` and Windows credential protection. It is supplied only to the DSH child environment and is never sent to renderer code, written to logs, or stored in plaintext in `cordis.patch.yml`.

### Verification

- 53 desktop tests cover profile composition, encrypted credential boundaries, QR lifecycle, cancellation and unbinding, renderer-safe IPC payloads, runtime environment injection, and the real DSH Host.
- Electron end-to-end verification requested a real QR code from Tencent's official Connector and confirmed that it renders and cancels correctly in Extension Dock without completing a binding or saving credentials.
- Packaged-payload verification checks the official QQ Bot package and its runtime dependencies in addition to every managed desktop package, skin manifest, and client bundle.

### Download and verification

Download `DeepSeek-Harness-Desktop-Setup-0.1.6-x64.exe` and verify it with `SHA256SUMS.txt` from the same GitHub Release. The built-in updater downloads only after user confirmation and asks again before installation and restart.

### Notice

This is a community build and not an official DeepSeek or Tencent distribution. The QQ Bot plugin and QR Connector are official Tencent npm packages. The installer is not signed with a commercial code-signing certificate, so Windows SmartScreen may report an unknown publisher. Download only from this project's GitHub Release page and verify the SHA-256 checksum. Upgrading preserves the existing DSH home, desktop profile, pet state, skin configuration, and encrypted QQ Bot binding credentials.
