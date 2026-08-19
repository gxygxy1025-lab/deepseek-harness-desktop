# Desktop Zero-Cost Smart Update Routing Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在不购买 CDN、对象存储或商业下载服务的前提下，让桌面版自动选择当下可用且真实吞吐较好的更新线路，在下载停滞或持续低速时自动换线，并在官网提供透明、可校验的备用下载入口。

**Architecture:** GitHub Releases 继续作为唯一版本元数据和完整性信任源；桌面主进程只对安装包传输地址做固定白名单内的路由，不改变 `latest.yml`、文件名、大小或 SHA-512。更新路由器负责并发测速、排序、下载监控、取消和回退，更新控制器负责向受限 IPC 发布状态，渲染层只选择固定线路 ID。官网默认保留 GitHub 官方直链，备用线路由同一个 GitHub Release 安装包 URL 派生，并明确要求用同一 Release 的 SHA-256 文件校验。

**Tech Stack:** Electron 43、`electron-updater` 6.8.9、Node.js ESM、Electron `net.fetch`、Node test runner、静态 HTML/CSS/JavaScript、GitHub Releases。

---

## 1. 范围、成功标准与非目标

本次只优化桌面安装包的更新下载和官网安装包入口，不改变左下角按钮的所有权；左下角仍由 Desktop 捕获并执行桌面版更新，不重新交给插件更新。

成功标准：

- 自动模式同时测试 GitHub 官方和三个免费备用线路，按真实吞吐而不是首包延迟排序。
- 测速最多读取每条线路 1 MiB，四条线路并发执行，单条线路最长 15 秒，避免更新检查被串行拖慢。
- 下载 10 秒无字节增长时自动换线；最近 20 秒平均速度低于 128 KiB/s 且剩余文件超过 20 MiB 时自动换线。
- 测速低于 256 KiB/s 的线路标记为降级并排在健康线路之后；所有线路均降级时仍保留尝试机会。
- 每条线路在一次下载会话中最多自动尝试一次，全部失败后才向用户显示最终错误，不产生无限重试。
- 镜像响应为 HTML、范围信息明显错误或安装包总大小与官方元数据冲突时不得排到健康线路中。
- 下载完成后仍由 `electron-updater` 使用 GitHub 元数据中的 SHA-512 校验，不以测速结果或镜像响应替代完整性验证。
- 官网始终以 GitHub 官方为主下载按钮，备用线路不伪装成“国内源”，不静默重定向。

非目标：

- 不接入 Cloudflare R2、阿里云 OSS、腾讯云 COS、商业 CDN 或任何可能超额计费的服务。
- 不做多源分片、断点拼接或自定义安装包下载器；这些能力会绕开 `electron-updater` 的成熟下载和校验流程。
- 不承诺免费第三方代理始终高速或可用；目标是自动避开当前最差线路，而不是提供带 SLA 的下载服务。
- 不修改 DSH 源码、全局 `~/.dsh` 配置或官方 Web profile。

## 2. 线路目录与中性命名

**Files:**

- Modify: `apps/dsh-desktop/src/update-mirrors.mjs`
- Modify: `apps/dsh-desktop/test/update-mirrors.test.mjs`

### Step 1: Write the failing catalog tests

新增断言，固定以下内置线路及顺序：

```js
[
  { id: 'github', label: 'GitHub 官方' },
  { id: 'gh-proxy.com', label: '备用线路 gh-proxy.com' },
  { id: 'ghproxy.net', label: '备用线路 ghproxy.net' },
  { id: 'ghfast.top', label: '备用线路 ghfast.top' },
]
```

测试自定义 `DSH_DESKTOP_UPDATE_MIRRORS` 仍只接受无账号信息的 HTTPS 前缀，标签统一为 `备用线路 <hostname>`；`official` 和 `off` 仍禁用所有代理。新增 `normalizeUpdateSourceId()` 测试，确保渲染器只能提交当前目录中的固定 ID 或 `auto`，不能提交 URL、路径或任意字符串。

### Step 2: Run the focused test and confirm failure

```powershell
node --test apps/dsh-desktop/test/update-mirrors.test.mjs
```

Expected: 旧的 `国内镜像` 标签和缺少 `normalizeUpdateSourceId()` 导致失败。

### Step 3: Implement the catalog boundary

导出不可变的 `OFFICIAL_UPDATE_SOURCE`、`DEFAULT_UPDATE_MIRRORS`、`listUpdateSources()` 和 `normalizeUpdateSourceId()`。线路对象只保留 `id`、`label`、`prefix`，日志和 IPC 不输出完整下载 URL。

### Step 4: Run the focused test and commit

```powershell
node --test apps/dsh-desktop/test/update-mirrors.test.mjs
git add apps/dsh-desktop/src/update-mirrors.mjs apps/dsh-desktop/test/update-mirrors.test.mjs
git commit -m "feat(desktop): define bounded update source catalog"
```

只提交上面列出的文件，不带入工作树中已有的其他修改。

## 3. 1 MiB 真实吞吐测速与响应校验

**Files:**

- Modify: `apps/dsh-desktop/src/update-mirrors.mjs`
- Modify: `apps/dsh-desktop/test/update-mirrors.test.mjs`

### Step 1: Write failing probe tests

覆盖以下场景：

- 请求头为 `Range: bytes=0-1048575`，读取达到 1 MiB 后主动取消响应流。
- 返回结果包含 `ttfbMs`、`elapsedMs`、`bytesReceived`、`bytesPerSecond`、`totalBytes`、`degraded` 和有界 `reason`。
- `206` 必须解析 `Content-Range: bytes 0-1048575/<total>`；已知官方大小时，总大小不一致直接失败。
- `200` 表示服务端忽略 Range 时只读取 1 MiB；`Content-Length` 与官方总大小一致可接受，缺失长度只能作为降级线路。
- `text/html`、HTML 魔数、空响应、超时、异常范围和零字节响应均失败。
- 排序优先级依次为可用且未降级、吞吐量高、TTFB 低、原始目录顺序稳定。

### Step 2: Run the focused test and confirm failure

```powershell
node --test apps/dsh-desktop/test/update-mirrors.test.mjs
```

Expected: 旧实现只请求 64 KiB，并且只返回 `elapsedMs`。

### Step 3: Implement bounded probing

在 `update-mirrors.mjs` 定义并集中使用这些常量：

```js
export const UPDATE_PROBE_BYTES = 1024 * 1024
export const UPDATE_PROBE_TIMEOUT_MS = 15_000
export const UPDATE_PROBE_DEGRADED_BPS = 256 * 1024
```

将探测接口改为：

```js
probeUpdateSource(url, {
  fetchFn,
  expectedSize,
  timeoutMs = UPDATE_PROBE_TIMEOUT_MS,
  now = Date.now,
})
```

`rankUpdateSources()` 把官方文件元数据中的 `size` 作为 `expectedSize` 传给每个探测任务，并用 `Promise.all()` 并发执行；不能因为单条线路探测失败而拒绝整个排序。`AbortController` 负责总超时，`reader.cancel()` 放在 `finally`，错误原因只保留类别，不记录远端返回的 HTML 正文。

### Step 4: Run tests and commit

```powershell
node --test apps/dsh-desktop/test/update-mirrors.test.mjs
git add apps/dsh-desktop/src/update-mirrors.mjs apps/dsh-desktop/test/update-mirrors.test.mjs
git commit -m "feat(desktop): rank update routes by bounded throughput probe"
```

## 4. 下载中停滞和持续低速自动换线

**Files:**

- Modify: `apps/dsh-desktop/src/update-mirrors.mjs`
- Modify: `apps/dsh-desktop/src/updater.mjs`
- Modify: `apps/dsh-desktop/src/electron-app.mjs`
- Modify: `apps/dsh-desktop/test/update-mirrors.test.mjs`
- Modify: `apps/dsh-desktop/test/updater.test.mjs`

### Step 1: Write failing watchdog tests

为纯逻辑 `UpdateDownloadWatchdog` 编写使用注入时钟的确定性测试：

- 开始后 10 秒 `transferred` 没有增加，返回 `stalled`。
- 20 秒窗口内平均速度低于 128 KiB/s，且 `total - transferred > 20 MiB`，返回 `slow`。
- 剩余不足 20 MiB 时即使较慢也继续，避免接近完成时重新下载。
- 速度恢复后清除慢速窗口，不误取消。
- 旧线路被路由器取消后，其迟到的进度事件不能影响新线路。
- 一次会话中每条线路最多自动尝试一次，最终失败才抛出错误。
- 由路由器发起的取消错误在尚有候选线路时被 `shouldDeferError()` 抑制，最后一条失败不得被抑制。

### Step 2: Write a failing CancellationToken integration test

构造假的 `CancellationToken` 和 `EventEmitter` updater，断言路由器调用：

```js
await updater.downloadUpdate(token)
```

模拟 `download-progress` 后触发停滞/低速，断言当前 token 被取消、provider 切换到下一条线路、原始 `resolveFiles` 在成功和失败路径都会恢复，并且每次 resolve 后的 `info.sha512` 始终是 `trusted-checksum`。

### Step 3: Run the focused tests and confirm failure

```powershell
node --test apps/dsh-desktop/test/update-mirrors.test.mjs apps/dsh-desktop/test/updater.test.mjs
```

Expected: 路由器没有 token 工厂、下载监控或低速取消能力。

### Step 4: Implement the watchdog and retry boundary

定义：

```js
export const UPDATE_STALL_TIMEOUT_MS = 10_000
export const UPDATE_SLOW_WINDOW_MS = 20_000
export const UPDATE_MIN_ACTIVE_BPS = 128 * 1024
export const UPDATE_MIN_REMAINING_FOR_SWITCH = 20 * 1024 * 1024
```

`UpdateDownloadRouter` 新增 `createCancellationToken`、注入计时器和活动 attempt generation。每次调用 `updater.downloadUpdate(token)` 前监听 `download-progress`，结束后立即移除监听器和定时器。由 watchdog 决定切换时，先记录结构化原因，再调用 `token.cancel()`；catch 只把本路由器主动取消视为可重试，不吞掉用户取消、校验失败或最后一条线路的错误。

将 `loadElectronAutoUpdater()` 改为 `loadElectronUpdaterRuntime()`，返回：

```js
{
  updater,
  createCancellationToken: () => new CancellationToken(),
}
```

`electron-app.mjs` 把 token 工厂传给路由器。动态导入解析写成可单测的纯函数，兼容 CommonJS default interop，但缺少 `autoUpdater` 或 `CancellationToken` 时立即报出明确错误。

`DesktopUpdateController` 继续监听同一个 updater 的 `download-progress` 并发布百分比，同时新增有界 `bytesPerSecond`；路由器只观察进度，不取得更新状态机所有权。

### Step 5: Run tests and commit

```powershell
node --test apps/dsh-desktop/test/update-mirrors.test.mjs apps/dsh-desktop/test/updater.test.mjs
git add apps/dsh-desktop/src/update-mirrors.mjs apps/dsh-desktop/src/updater.mjs apps/dsh-desktop/src/electron-app.mjs apps/dsh-desktop/test/update-mirrors.test.mjs apps/dsh-desktop/test/updater.test.mjs
git commit -m "feat(desktop): fail over stalled update downloads"
```

## 5. 自动模式、手动首选线路和桌面私有持久化

**Files:**

- Create: `apps/dsh-desktop/src/update-source-preference.mjs`
- Create: `apps/dsh-desktop/test/update-source-preference.test.mjs`
- Modify: `apps/dsh-desktop/src/update-mirrors.mjs`
- Modify: `apps/dsh-desktop/src/updater.mjs`
- Modify: `apps/dsh-desktop/src/electron-app.mjs`
- Modify: `apps/dsh-desktop/test/update-mirrors.test.mjs`
- Modify: `apps/dsh-desktop/test/updater.test.mjs`

### Step 1: Write failing preference-store tests

状态文件只保存到 Electron `app.getPath('userData')` 下的 `update-source-preference.json`：

```json
{"schemaVersion":1,"sourceId":"auto"}
```

测试默认值、合法值原子写入、非法或损坏 JSON 回退 `auto`、临时文件清理、不可用线路回退 `auto`。测试中显式断言解析和保存逻辑不接触 `~/.dsh`、`profiles/desktop` 或 `cordis.patch.yml`。

### Step 2: Run tests and confirm failure

```powershell
node --test apps/dsh-desktop/test/update-source-preference.test.mjs
```

Expected: 文件和 store 尚不存在。

### Step 3: Implement the store and routing semantics

主进程启动时读取 preference，再构造路由器。语义固定为：

- `auto`：按实时测速排序。
- 具体线路 ID：将它移到测速队列首位，但该线路硬失败、停滞或持续低速时仍自动回退，避免“手动选择后永远卡死”。
- 用户在下载中切换到另一条具体线路：路由器将该线路移到下一 attempt，并安全取消当前 attempt；切换到 `auto` 不强制重启当前健康下载。
- 用户选择不存在或已被环境变量禁用的线路：拒绝输入，不修改当前 preference。

不保存测速结果。每个版本通常只下载一次，跨会话缓存几乎没有收益，而且网络环境可能已经改变；重新并发测试 4 MiB 更可靠。

### Step 4: Run tests and commit

```powershell
node --test apps/dsh-desktop/test/update-source-preference.test.mjs apps/dsh-desktop/test/update-mirrors.test.mjs apps/dsh-desktop/test/updater.test.mjs
git add apps/dsh-desktop/src/update-source-preference.mjs apps/dsh-desktop/test/update-source-preference.test.mjs apps/dsh-desktop/src/update-mirrors.mjs apps/dsh-desktop/src/updater.mjs apps/dsh-desktop/src/electron-app.mjs apps/dsh-desktop/test/update-mirrors.test.mjs apps/dsh-desktop/test/updater.test.mjs
git commit -m "feat(desktop): persist bounded update route preference"
```

## 6. 受限 IPC 和更新窗口线路选择

**Files:**

- Modify: `apps/dsh-desktop/src/ipc.mjs`
- Modify: `apps/dsh-desktop/src/preload-main.cjs`
- Modify: `apps/dsh-desktop/src/update-surface.mjs`
- Modify: `apps/dsh-desktop/test/ipc.test.mjs`
- Modify: `apps/dsh-desktop/test/preload-surfaces.test.mjs`
- Modify: `apps/dsh-desktop/test/update-surface.test.mjs`

### Step 1: Write failing IPC and surface tests

新增主窗口专用 IPC：

```text
desktop:update-sources
desktop:update-source-set
```

测试要求：

- preload 只暴露 `getUpdateSources()` 和 `setUpdateSource(sourceId)`，不暴露 URL、文件路径或通用 IPC。
- `normalizeUpdateSourceId()` 拒绝超过长度、未知值和 URL。
- Extension、Community 等非主窗口不能调用这两个通道。
- 公共更新状态中的 `bytesPerSecond` 是非负有界数字，`source`、`sourceId` 和 `switchReason` 是有界文本/枚举。
- 更新窗口显示“自动选择（推荐）”、GitHub 官方和可用备用线路；显示当前线路和格式化速度。
- 左下角插件替换回归测试仍断言点击后只调用 `checkForUpdates()`，不调用任何插件更新 API。

### Step 2: Run the focused tests and confirm failure

```powershell
node --test apps/dsh-desktop/test/ipc.test.mjs apps/dsh-desktop/test/preload-surfaces.test.mjs apps/dsh-desktop/test/update-surface.test.mjs
```

Expected: 新 IPC、桥接方法和选择控件尚不存在。

### Step 3: Implement the least-privilege bridge and UI

`desktop:update-sources` 返回：

```js
{
  selected: 'auto',
  sources: [
    { id: 'auto', label: '自动选择（推荐）' },
    { id: 'github', label: 'GitHub 官方' },
    { id: 'gh-proxy.com', label: '备用线路 gh-proxy.com' },
  ],
}
```

这里只返回当前真实可用目录。`desktop:update-source-set` 在主进程完成白名单校验、持久化和活动下载切换，渲染器不能自行拼接镜像 URL。

更新弹窗在 `checking`、`downloading` 和 `error` 阶段显示线路选择；下载状态文案示例为 `当前线路：备用线路 ghproxy.net，速度：1.8 MiB/s`。切换期间显示 `当前线路持续低速，正在尝试下一条线路`，但不弹出中间错误。选择控件使用原生 `label` 和 `select`，支持键盘、焦点轮廓和深浅主题。

### Step 4: Run tests and commit

```powershell
node --test apps/dsh-desktop/test/ipc.test.mjs apps/dsh-desktop/test/preload-surfaces.test.mjs apps/dsh-desktop/test/update-surface.test.mjs apps/dsh-desktop/test/updater.test.mjs
git add apps/dsh-desktop/src/ipc.mjs apps/dsh-desktop/src/preload-main.cjs apps/dsh-desktop/src/update-surface.mjs apps/dsh-desktop/test/ipc.test.mjs apps/dsh-desktop/test/preload-surfaces.test.mjs apps/dsh-desktop/test/update-surface.test.mjs apps/dsh-desktop/test/updater.test.mjs
git commit -m "feat(desktop): expose safe update route selection"
```

## 7. 官网免费备用下载入口

**Files:**

- Modify: `website/index.html`
- Modify: `website/styles.css`
- Modify: `website/script.js`
- Modify: `scripts/validate-website.mjs`
- Modify: `scripts/validate-website.test.mjs`

### Step 1: Write failing website validation tests

要求官网包含：

- GitHub 官方主下载链接。
- 可折叠的“下载较慢？尝试备用线路”区域。
- 三条具有 `data-update-mirror-prefix` 的 HTTPS 备用链接。
- 明确文案：备用线路是第三方转发、速度不保证、安装后或安装前可用同一 Release 的 `SHA256SUMS.txt` 校验。
- 所有新窗口链接都带 `rel="noreferrer"`。
- 备用链接只能由固定 HTTPS prefix 加 GitHub Release 安装包 URL 组成，不能指向独立上传的二进制文件。

### Step 2: Run the tests and confirm failure

```powershell
node --test scripts/validate-website.test.mjs
```

Expected: 当前官网只有 GitHub 安装包主链接，没有备用线路标记和说明。

### Step 3: Implement transparent fallback links

在 Windows 一键安装卡片下增加折叠区域，默认不抢占主按钮。静态 HTML 使用当前版本化 GitHub URL 生成可工作的 fallback；`hydrateLatestRelease()` 从 GitHub API 得到实际 `installer.browser_download_url` 后，用以下纯函数同步更新三条备用链接：

```js
function updateMirrorLinks(officialUrl) {
  document.querySelectorAll('[data-update-mirror-prefix]').forEach((link) => {
    link.href = `${link.dataset.updateMirrorPrefix}${officialUrl}`
  })
}
```

不在浏览器内自动测速或自动跳转，因为第三方代理的 CORS 行为不稳定，并且静默探测会额外暴露访问行为。用户主动点击备用线路时才访问第三方服务。

### Step 4: Run checks and commit

```powershell
node --test scripts/validate-website.test.mjs
pnpm website:check
git add website/index.html website/styles.css website/script.js scripts/validate-website.mjs scripts/validate-website.test.mjs
git commit -m "feat(website): add transparent installer fallback links"
```

## 8. 诊断日志、文档和发布说明

**Files:**

- Modify: `docs/desktop.md`
- Modify: `CHANGELOG.md`
- Modify: `CHANGELOG.en.md`
- Modify: `README.md`
- Modify: `README.en.md`

### Step 1: Document operator controls and privacy boundary

记录：

- 默认四条线路和中性命名。
- `DSH_DESKTOP_UPDATE_MIRRORS=official|off` 的禁用行为及自定义 HTTPS 列表格式。
- 自动测速、停滞/低速阈值和手动首选语义。
- 更新 preference 只写 Desktop `userData`，不写 `~/.dsh`。
- 日志只记录 source ID、TTFB、吞吐、切换原因和 attempt 编号，不记录响应正文、账号信息或完整临时 URL。
- 免费代理不受项目控制；校验失败必须终止更新，不能继续安装。

### Step 2: Add bilingual release notes

中文建议：`更新下载现在会按 1 MiB 实测吞吐自动选择 GitHub 或备用线路，遇到停滞和持续低速会自动切换；更新窗口也可手动指定首选线路。官网保留 GitHub 官方下载，并提供透明的免费备用入口。`

英文建议：`Update downloads now rank GitHub and fallback routes using a bounded 1 MiB throughput probe, switch away from stalled or persistently slow routes, and allow a preferred route to be selected in the update dialog. The website keeps GitHub as the primary download and exposes transparent free fallback links.`

### Step 3: Run documentation checks and commit

```powershell
pnpm release:notes:check
pnpm docs:check
git add docs/desktop.md CHANGELOG.md CHANGELOG.en.md README.md README.en.md
git commit -m "docs: explain zero-cost update routing"
```

如果实际仓库没有上述某个 changelog 文件，执行时先用 `rg --files | rg "CHANGELOG|release"` 找到现有中英文发布说明权威文件，不新建重复事实源。

## 9. 综合验证和发布门禁

### Step 1: Run focused suites

```powershell
node --test apps/dsh-desktop/test/update-mirrors.test.mjs apps/dsh-desktop/test/update-source-preference.test.mjs apps/dsh-desktop/test/updater.test.mjs apps/dsh-desktop/test/ipc.test.mjs apps/dsh-desktop/test/preload-surfaces.test.mjs apps/dsh-desktop/test/update-surface.test.mjs
node --test scripts/validate-website.test.mjs
pnpm website:check
```

### Step 2: Run repository verification

```powershell
pnpm desktop:test
pnpm test:scripts
pnpm verify
```

Expected: 全部通过；若失败，先区分本计划涉及文件和执行前已有的脏工作树改动，不擅自修复或提交无关修改。

### Step 3: Build a local Windows installer

```powershell
pnpm desktop:pack
pnpm --filter @deepseek-ai/dsh-desktop pack:verify
```

确认生成的 `.exe`、`latest.yml` 和 blockmap 均存在，安装包名称和版本一致，`latest.yml` 中的 SHA-512 与本地产物匹配。

### Step 4: Manual acceptance matrix

在 Windows 10 和 Windows 11 各执行一次：

| 场景 | 操作 | 预期 |
| --- | --- | --- |
| 自动择优 | 默认 `auto` 检查更新 | 四条线路并发测速，选择健康且吞吐更高的线路 |
| 首选官方 | 选择 GitHub 官方 | 官方排首位；官方硬失败或持续低速后仍能回退 |
| 停滞切换 | 测试代理接受连接但不继续传输 | 10 秒后取消并换线，无中间错误弹窗 |
| 持续低速 | 将测试源限速到低于 128 KiB/s | 20 秒窗口满足且剩余大于 20 MiB 后换线 |
| 接近完成 | 剩余不足 20 MiB 时限速 | 不重新下载，继续完成 |
| 完整性失败 | 返回内容与官方 SHA-512 不一致 | 下载失败，绝不显示“可重启安装” |
| 手动切换 | 下载中选择另一条线路 | 当前 attempt 安全取消，指定线路成为下一 attempt |
| 官网回退 | GitHub 主链接较慢时手动点备用线路 | 下载同一版本同名安装包，可从 GitHub 获取 SHA256 校验 |
| 左下角按钮 | 安装或更新插件后点击左下角 | 始终打开桌面版更新，不变成插件更新 |
| 配置隔离 | 完成测速、切线和 preference 保存 | `~/.dsh/cordis.patch.yml` 不发生变化 |

### Step 5: Final review before release

```powershell
git diff --check
git status --short
git log --oneline -8
```

确认没有把测速响应、临时 token、用户路径或已有无关工作树文件加入提交。此计划完成实现和本地验收后，才进入项目现有的版本号、标签和本地产物上传发布流程；不要把路由改动直接补写到已经发布的 `desktop-v2.4.0` 标签。

## 10. 风险和回退策略

- 免费代理可能随时失效或限流：保留 GitHub 官方，探测失败的线路降级为最后 fallback，环境变量可立即禁用全部代理。
- 第三方代理可能返回错误页面：探测同时检查 Content-Type、文件魔数和长度，最终安装包仍必须通过官方 SHA-512。
- `electron-updater` 取消事件可能与 error 事件竞态：使用 attempt generation 和 token 身份判断，只抑制当前路由器主动触发且仍有下一线路的错误。
- 频繁切线可能浪费流量：每条线路自动尝试一次，接近完成不因低速切换，手动切换才允许改变下一 attempt。
- 主进程崩溃或 preference 文件损坏：原子写入，读取失败回退 `auto`，不阻止应用启动。
- 若上线后发现兼容性问题，可设置 `DSH_DESKTOP_UPDATE_MIRRORS=official` 立即退回 GitHub 单线路，而无需回滚版本元数据或修改用户 DSH 配置。
