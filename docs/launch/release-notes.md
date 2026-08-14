# DeepSeek Harness Desktop 0.1.5

## 中文

### 本次亮点

- 顶部标题栏会随 DSH 亮色与暗色主题即时切换，原生 Windows 最小化、最大化和关闭按钮也使用匹配的颜色，不再在亮色界面上保留黑条。
- 设置等全屏弹窗现在使用标题栏下方的安全可视区域，上边框和圆角不会再被 46 像素标题栏截断。
- 修复安装版皮肤中心仍扫描源码目录、并写入错误配置层的问题。它现在从 `~/.dsh/profiles/desktop/node_modules` 读取随安装包提供的 9 套皮肤，并更新 `~/.dsh/profiles/desktop/cordis.patch.yml`，即时试穿与正式应用都可用。
- 内置 `dshmarket` 1.0.3 和 `dsh-plugin-hub` 0.1.0。两个插件随桌面 profile 启动，`dshmarket` 的安装与更新目标已明确设为 `desktop` profile。

### 验证

- Electron 端到端检查实际切换标题栏明暗样式，并确认 DSH 标准弹窗容器从标题栏下方开始。
- 真实 DSH Host 集成检查会加载两个插件商店、访问市场状态接口、确认插件商店入口可见，并实际应用 QQ98 皮肤后检查桌面 profile patch。
- 打包校验继续逐一检查全部内置运行时包、9 套皮肤清单与客户端 bundle。

### 下载与校验

下载 `DeepSeek-Harness-Desktop-Setup-0.1.5-x64.exe`，并使用同一 GitHub Release 中的 `SHA256SUMS.txt` 校验安装包。应用内更新只会在用户确认后下载，安装与重启也会再次请求确认。

### 说明

这是社区构建版本，并非 DeepSeek 官方发行版。当前安装包未使用商业代码签名证书，Windows SmartScreen 可能显示“未知发布者”。请只从本项目的 GitHub Release 页面下载并核对 SHA-256。升级会保留现有 DSH_HOME、桌面 profile、桌宠状态和皮肤配置。

## English

### Highlights

- The title bar now follows the live DSH light/dark theme. Native Windows minimize, maximize, and close buttons receive matching colors, removing the black strip from light themes.
- Full-screen dialogs such as Settings now use the safe viewport below the 46-pixel title bar, so their top border and rounded corners are no longer clipped.
- Fixed packaged Skin Center discovery and configuration. It now reads all nine bundled skins from `~/.dsh/profiles/desktop/node_modules` and updates `~/.dsh/profiles/desktop/cordis.patch.yml`, restoring both live try-on and permanent application.
- Bundled `dshmarket` 1.0.3 and `dsh-plugin-hub` 0.1.0. Both start with the desktop profile, and `dshmarket` explicitly installs and updates packages in that profile.

### Verification

- Electron end-to-end coverage switches the real title bar between light and dark styling and verifies that standard DSH dialogs begin below the title bar.
- The real DSH Host integration test loads both plugin stores, checks the marketplace endpoint and store UI entry, applies QQ98, and verifies the desktop profile patch.
- Packaged-payload verification continues to inspect every managed runtime package and all nine skin manifests and client bundles.

### Download and verification

Download `DeepSeek-Harness-Desktop-Setup-0.1.5-x64.exe` and verify it with `SHA256SUMS.txt` from the same GitHub Release. The built-in updater downloads only after user confirmation and asks again before installation and restart.

### Notice

This is a community build and not an official DeepSeek distribution. It is not signed with a commercial code-signing certificate, so Windows SmartScreen may report an unknown publisher. Download only from this project's GitHub Release page and verify the SHA-256 checksum. Upgrading preserves the existing DSH home, desktop profile, pet state, and skin configuration.
