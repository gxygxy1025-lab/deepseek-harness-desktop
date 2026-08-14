# DeepSeek Harness Desktop 0.1.4

## 中文

### 本次亮点

- 鲸鱼娘桌宠现在挂载到 DSH 的全局 Shell Overlay，不再依赖新版界面已经停止渲染的会话输入插槽。首次启动、空白会话页、已有会话和设置窗口中都能正常看到桌宠，拖动、抚摸、喂食、隐藏与重新召唤仍沿用原有持久化状态。
- 修复 DSH rc.6 Host API 会过滤第三方设置命名空间的问题。设置 → 插件 → Web UI 插件现在完整显示移动端远程控制、皮肤中心、实时令牌估算、任务看板和宠物五张配置卡，不会再只剩一张皮肤中心卡片。
- 皮肤中心已重新生成并构建，完整列出桌面版随附的 9 套可选皮肤，包括初音未来与交易终端。安装时选择全家桶后，每套皮肤的清单、客户端脚本和即时试穿入口都会一并进入桌面发行包。

### 验证

- 新增真实 DSH Host 集成检查：验证五个自定义设置命名空间均可从配置接口读取，桌宠状态、角色清单和精灵图资源均可访问，并用无头浏览器确认鲸鱼娘按钮真实出现在页面上。
- 新增全部 9 套皮肤脚本的运行时检查，并在打包校验中逐一确认每个皮肤包的 `skin.json` 与 `lib/client.js` 存在。
- 桌宠包额外校验 `lib/client.js`、`assets/whale/pet.json` 与 `assets/whale/spritesheet.webp`，防止以后再次出现“代码已安装但角色资源未进入安装包”的回归。

### 下载与校验

下载 `DeepSeek-Harness-Desktop-Setup-0.1.4-x64.exe`，并使用同一 GitHub Release 中的 `SHA256SUMS.txt` 校验安装包。应用内更新会先显示版本号、发布时间与本页更新内容，只有用户确认后才会下载；安装和重启也会再次请求确认。

### 说明

这是社区构建版本，并非 DeepSeek 官方发行版。当前安装包未使用商业代码签名证书，Windows SmartScreen 可能显示“未知发布者”。请只从本项目的 GitHub Release 页面下载，并优先使用经过自动化验证的默认安装路径。若从旧版本升级，现有桌宠名字、亲密度、位置和皮肤配置都会保留。

## English

### Highlights

- The whale-girl desktop pet now mounts in the root-scoped DSH Shell Overlay instead of a conversation input slot that the rc.6 interface no longer renders. The companion is visible on first launch, on the empty conversation screen, inside active sessions, and while the settings window is open. Existing dragging, petting, feeding, hiding, summoning, naming, and persisted affinity behavior remains unchanged.
- The rc.6 Host API filters settings namespaces through an explicit security allowlist. This release adds only the five bundled Web UI namespaces to that boundary. Settings → Plugins → Web UI Plugins now shows Remote Control, Skin Center, Live Token Estimates, Task Board, and Pet instead of silently hiding four cards.
- The Skin Center registry and client bundle were regenerated. All nine selectable skins shipped by the desktop aggregate are listed, including Miku and Trading Terminal, and their real client bundles remain available for instant try-on and one-click application.

### Verification

- The real DSH Host integration test now reads the settings API and asserts that all five custom namespaces are exposed. It also verifies the pet state endpoint, character manifest, sprite sheet, and every installed skin bundle.
- A headless Chromium check waits for the actual whale-girl control in the rendered page, covering the slot regression that endpoint-only tests previously missed.
- Packaged-payload verification now checks each skin's `skin.json` and `lib/client.js`, plus the pet client, manifest, and sprite atlas. This prevents a release from passing when profile metadata exists but visual assets were omitted.

### Download and verification

Download `DeepSeek-Harness-Desktop-Setup-0.1.4-x64.exe` and verify it with `SHA256SUMS.txt` from the same GitHub Release. The built-in updater displays the target version, publication time, and these notes before downloading. Downloading begins only after user confirmation, and installation plus restart requires a second confirmation.

### Notice

This is a community build and not an official DeepSeek distribution. It is not signed with a commercial code-signing certificate, so Windows SmartScreen may report an unknown publisher. Download only from this project's GitHub Release page and prefer the automatically verified default installation path. Upgrading preserves the existing pet name, affinity, position, visibility, and selected skin configuration.
