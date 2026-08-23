# DeepSeek Harness Desktop 1.0.9 再审查与完整修复方案

- 审查日期：2026-08-23
- 审查目录：`C:\Users\51096\Documents\deepseek-harness-desktop-v2.7.0-source`
- Git 分支：`main`
- 审查基线：`HEAD 933773017f939b2e958633d861b4d6595e25ab4c` 加本地未提交的 `1.0.9` 修改
- 桌面版本：`1.0.9`
- 官方 Runtime：`@deepseek-ai/dsh@0.1.1-rc.2`
- 审查方式：源码人工审查、依赖审计、单元测试、类型检查、语法检查、隔离运行验证、Windows 打包目录验证、打包后启动冒烟、GitHub 远程状态检查
- 修改边界：本次仅新增本报告，没有修改现有业务源码、配置、版本、提交或远程仓库

## 一、结论

当前 `1.0.9` 本地代码已经修复上一版报告中的一部分问题，测试和打包后的主启动链路可以通过，但**还不具备向普通外部用户发布的条件**。

必须先解决 5 个发布阻断项：

1. 干净电脑没有 `pnpm` 时，官方插件安装/删除命令必然失败。
2. GitHub 仓库仍为私有，外部用户无法访问更新、下载、隐私政策和反馈入口。
3. 仓库没有 Windows 签名 Secrets，新的 Release 工作流会正确阻止发布。
4. Windows 主渲染器仍关闭 Electron sandbox，且当前页面没有 CSP 安全策略。
5. `1.0.9` 修改尚未提交、推送和经过远程 CI，远程最新版本仍为 `1.0.8`。

风险统计：

| 等级 | 数量 | 说明 |
|---|---:|---|
| P1 发布阻断 | 5 | 发布前必须处理 |
| P2 重要 | 8 | 建议在 1.0.9 发布前完成，至少不能无记录地延期 |
| P3 一般 | 4 | 可进入下一版本，但要建立测试和追踪项 |
| 验证缺口 | 4 | 当前证据不足，不能宣称已验证 |

## 二、已确认通过的项目

| 检查 | 结果 |
|---|---|
| `pnpm install --frozen-lockfile` | 通过，664 个包 |
| `pnpm test` | 通过，198/198 |
| `pnpm typecheck` | 通过 |
| `pnpm audit --prod --json` | 0 个已知漏洞 |
| `pnpm outdated -r --format json` | 未报告直接依赖更新 |
| JS 语法检查 | 90 个 `.mjs/.cjs`，0 个失败 |
| YAML 解析 | CI、Release、electron-builder、workspace 配置均可解析 |
| `git diff --check` | 通过，仅有 Git 换行符提示 |
| `pack:dir` | 通过 |
| `pack:verify:dir` | 通过，验证 37 个官方 Runtime 包 |
| `pack:smoke` | 通过，总加载约 2.39 秒，Runtime ready 约 1.80 秒 |
| IPC sender 控制 | 主 IPC 使用 `DesktopSurfaceRegistry.assert()` 校验调用来源 |
| 导航控制 | 主窗口只允许当前 Runtime origin，HTTPS 链接交给系统浏览器 |
| 本地 API 请求围栏 | 官方 Runtime 检查 Host、Origin 和 `Sec-Fetch-Site`，未发现直接的 DNS rebinding/跨站放行问题 |
| Windows 黑框修复 | 打包检查确认 Windows ACL sandbox 的两条启动路径均使用隐藏窗口标志 |

上述“通过”只代表对应检查通过，不代表整套软件已经满足发布要求。

## 三、P1 发布阻断项

### P1-01 干净电脑无法安装或删除插件

**证据**

- `README.md:7` 声明用户可以运行 `dsh plugin --profile desktop add/remove`。
- `README.md:11` 声明安装包不要求用户安装开发工具。
- `apps/dsh-desktop/scripts/verify-package.mjs:27-36` 明确禁止安装包包含 `pnpm`。
- `apps/dsh-desktop/package.json` 没有直接依赖 `pnpm`。
- 官方 `@deepseek-ai/dsh@0.1.1-rc.2` 的 `lib/plugin-9h8shc4d.js:108-116` 直接执行系统命令 `pnpm`，找不到时提示用户安装 `pnpm`。
- 隔离实测把 `PATH` 限制为 Windows 系统目录后执行 `dsh plugin --profile desktop list`，Profile 初始化成功，但随后报：`'pnpm' is not recognized...`，退出码为 `1`。
- 安装器没有写入 `dsh` 命令 shim，也没有给普通用户提供稳定的插件管理入口。

**影响**

当前产品只能“保留已经写入 Profile 的插件配置”，不能保证普通用户在全新安装后真正安装、更新或删除插件。README 和 Release Notes 对能力的描述高于实际能力。

**推荐修复**

1. 在 Desktop 中精确固定 `pnpm@11.22.0`，将其作为插件管理运行时，而不是要求用户全局安装。
2. 给官方 DSH 插件转发器增加一个受控入口，例如 `DSH_PNPM_CLI_PATH`：
   - Desktop 解析打包后的 `pnpm/bin/pnpm.cjs` 物理路径。
   - 使用 `process.execPath` 加 `ELECTRON_RUN_AS_NODE=1` 启动。
   - 参数使用数组传递，`shell: false`、`windowsHide: true`。
   - 不把任意用户输入拼接成 shell 字符串。
3. 用 `pnpm patch` / `pnpm patch-commit` 生成可审计补丁，同时向 DeepSeek 官方仓库提交兼容改动；不要手写 pnpm patch 元数据。
4. 修改 `verify-package.mjs`：不再禁止全部 `pnpm`，改为要求存在精确版本的受控 CLI，并确认安装包中没有多余 package-manager 文件。
5. 明确最终用户入口：
   - 如果由 Harness Web Surface 安装插件，必须让该入口调用受控 pnpm。
   - 如果保留命令行方式，应随安装包提供稳定的 `dsh-desktop-plugin.cmd` 或等价入口并写清绝对使用方式；不要假设系统已有全局 `dsh`。
6. 第三方插件默认按不可信代码处理：显示包名、版本、来源、完整性摘要和权限提示；默认只接受 npm registry 的明确版本，Git、本地路径和 URL specifier 放到高级模式。

**验收标准**

- 在一台没有 Node.js、npm、pnpm、全局 dsh 的全新 Windows 用户环境安装 Desktop。
- 安装一个固定版本的测试插件，重启后 UI 能显示插件功能。
- 更新该插件并确认版本变化。
- 删除插件，重启后插件和 Bundle 都消失。
- 整个过程不弹 Terminal/PowerShell 黑框。
- Desktop 升级后插件、锁文件、自定义 Patch 和数据仍保留。

### P1-02 私有 GitHub 仓库使外部更新与帮助链接全部失效

**证据**

- `gh repo view` 返回仓库 `gxygxy1025-lab/deepseek-harness-desktop` 为 `PRIVATE`。
- 未登录匿名请求当前均返回 `404`：
  - `https://github.com/gxygxy1025-lab/deepseek-harness-desktop/releases.atom`
  - `https://github.com/gxygxy1025-lab/deepseek-harness-desktop/blob/main/PRIVACY.md`
  - `https://github.com/gxygxy1025-lab/deepseek-harness-desktop/issues/new/choose`
- `PRIVACY.md:15` 却声称自动更新访问“公开 GitHub Releases”。
- 本地新的 Release 工作流已增加公开仓库门禁，这能防止继续错误发布，但不能自动解决公开下载渠道。

**影响**

发给外部用户的 `1.0.8` 无法匿名检查更新，帮助菜单中的项目、反馈、隐私链接也不可用。自动更新错误会表现为 GitHub 404。

**推荐修复**

1. 发布前把主要仓库改为公开仓库；如果源码暂时不能公开，则新建专用的公开 Release 仓库并把 `electron-builder.yml`、帮助链接和更新控制器统一指向该仓库。
2. 在发布工作流中保留“仓库必须公开”的门禁。
3. 增加匿名 HTTP E2E：Release 前从无凭据环境请求 `latest.yml`、安装包、隐私政策和 Issues 页面，任何一个不是 200/302 都阻止发布。
4. 为隐私和安全问题提供不依赖登录私有仓库的公开页面与联系邮箱。

**验收标准**

- 未登录浏览器可以打开 Release、隐私政策和反馈入口。
- 已安装旧版可以检测到测试版更新并下载。
- 网络断开、GitHub 404 和限流都显示简短、可操作的错误，不展示整段响应头。

### P1-03 Windows 代码签名尚未配置

**证据**

- `gh secret list` 没有返回任何仓库 Actions Secret。
- 本地 `dist/win-unpacked/DeepSeek Harness Desktop.exe` 的 Authenticode 状态为 `NotSigned`。
- 新 Release 工作流要求 `WINDOWS_CSC_LINK` 和 `WINDOWS_CSC_KEY_PASSWORD`，缺失时会正确失败。

**影响**

当前不能生成满足发布门禁的 `1.0.9`。未签名安装包还会触发 Unknown Publisher/SmartScreen，并削弱自动更新对发布者身份的校验。

**推荐修复**

1. 购买/配置可信 Windows 代码签名证书，或使用 Azure Trusted Signing。
2. 把证书和密码保存为 GitHub Actions Secrets，不写入仓库、日志或 Release 资产。
3. Release 构建启用 `forceCodeSigning`，使缺少签名时构建失败；本地开发构建可以继续允许无签名。
4. 明确配置或校验 `publisherName`，确保 `app-update.yml` 中写入正确发布者并保持 `verifyUpdateCodeSignature` 开启。
5. 对安装包、主 EXE、卸载器以及安装包内所有自有 EXE 做签名校验，并检查 RFC3161 时间戳。
6. 做一次负向更新测试：由错误证书签名的更新必须被拒绝。

参考：[electron-builder Windows code signing](https://www.electron.build/docs/features/code-signing/code-signing-win/)。

**验收标准**

- `Get-AuthenticodeSignature` 对安装包和所有自有 EXE 返回 `Valid`。
- Signer Subject 与发布配置一致，签名有有效时间戳。
- Windows 安装界面显示明确发布者，不是 Unknown Publisher。
- 错误签名的更新不能安装。

### P1-04 Windows 主渲染器关闭 sandbox

**证据**

- `apps/dsh-desktop/src/electron-app.mjs:371-379` 在 Windows 设置 `sandbox: false`。
- 之前把 Windows 改为 `sandbox: true` 时，打包后官方 Web Surface 导航失败，出现 `ERR_FAILED (-2)`；因此当前修改属于兼容性回退，不是已经解决的安全问题。
- 主窗口加载本地 HTTP Web Surface，并暴露受限的 preload API。IPC sender 已校验，但渲染器一旦发生 XSS，关闭 sandbox 仍会扩大攻击面。

Electron 官方说明 sandbox 会限制渲染器访问系统资源，并明确指出在存在不可信内容时关闭 sandbox 有安全风险：[Process Sandboxing](https://www.electronjs.org/docs/latest/tutorial/sandbox)。

**推荐修复**

1. 建立最小复现，定位 `sandbox: true` 下 `ERR_FAILED (-2)` 的具体请求、预加载或导航失败点。
2. 优先修正官方 Web Surface 与 sandbox 的兼容性，而不是长期保留 Windows 特例。
3. 在修复完成前：
   - 保持 `contextIsolation: true`、`nodeIntegration: false`、`webSecurity: true`。
   - 继续严格限制导航、窗口创建、权限和 IPC sender。
   - 对每个 preload 方法做参数 schema、长度、路径和调用频率限制。
4. 增加 Windows 打包 E2E：sandbox 开启后验证启动、设置、对话、文件选择、下载、OAuth、更新界面和用户插件。

**验收标准**

- Windows 主窗口使用 `sandbox: true`。
- 打包后启动冒烟和核心 UI E2E 全部通过。
- 没有 `--no-sandbox`、`disable-gpu-sandbox` 或其他全局关闭 Chromium sandbox 的参数。

### P1-05 本地 1.0.9 尚未形成可发布提交

**证据**

- 当前 `main` 有 12 个已修改文件和多个未跟踪文件。
- 远程最新 CI 成功记录仍对应 `9337730`，不包含本地 `1.0.9` 修改。
- 远程最新 Release 仍为 `desktop-v1.0.8`，发布时间 2026-08-22。

**影响**

本地测试成功不能替代远程 CI、签名构建和公开下载验证。此时创建 `desktop-v1.0.9` Tag 会因为公开仓库和签名门禁失败。

**推荐修复**

1. 先完成本报告 P1/P2 项，再创建修复分支。
2. 逐项审查本地 diff，修正 Changelog 历史错误，确认 `.gitignore` 和 `LICENSE` 应纳入版本控制。
3. 提交并推送修复分支，走 Pull Request 和远程 CI。
4. CI 全绿、仓库公开、签名 Secrets 可用后再合并 `main`。
5. 只从已保护的 `main` 创建 `desktop-v1.0.9` Tag。

**验收标准**

- `git status --short` 在发布提交上为空。
- Tag、根 package、Desktop package、`latest.yml` 四处版本完全一致。
- 远程 CI 和 Release 工作流均对应同一个提交 SHA。

## 四、P2 重要问题

### P2-01 页面没有 CSP 和基础安全响应头

**证据**

- 动态请求运行中的 `http://127.0.0.1:<port>/`，未返回：
  - `Content-Security-Policy`
  - `Content-Security-Policy-Report-Only`
  - `X-Content-Type-Options`
  - `Cross-Origin-Opener-Policy`
  - `Cross-Origin-Resource-Policy`
- Desktop 和官方 WebServer 源码未发现设置这些头的逻辑。
- 官方 WebServer 当前会注入内联 `<script>` 和 `<style>`，不能直接套用严格 CSP，否则会破坏页面。

Electron 官方安全清单建议为页面设置 CSP，并校验 IPC sender：[Electron Security](https://www.electronjs.org/docs/latest/tutorial/security)。本项目已做 sender 校验，但 CSP 缺失。

**推荐修复**

1. 先通过 `session.webRequest.onHeadersReceived` 仅对当前 active Runtime origin 注入 `Content-Security-Policy-Report-Only`。
2. 收集真实资源需求，至少限制：`default-src`、`object-src 'none'`、`base-uri 'none'`、`frame-ancestors 'none'`。
3. 短期兼容内联注入时只给所需指令最小例外，不要全局放开。
4. 长期向官方 WebServer 增加 nonce/hash 支持，给结构化脚本和样式注入 nonce，逐步去掉 `unsafe-inline`。
5. 增加 `X-Content-Type-Options: nosniff`；COOP/CORP 先用兼容性测试决定是否启用。

**验收标准**

- Report-Only 模式运行完整 E2E 后没有未解释的违规。
- 切换到强制 CSP 后核心功能和插件 E2E 通过。
- 任意外部脚本、对象和 frame 注入被阻止。

### P2-02 Release Job 从安装依赖开始就持有 `contents: write`

**证据**

- `.github/workflows/desktop-release.yml:8-9` 给整个 Job `contents: write`。
- 依赖安装、测试、Playwright、打包和第三方 Action 都在同一个高权限 Job 中执行。
- 当前私有仓库的 branch protection 和 rulesets API 返回 403，提示升级 GitHub Pro 或公开仓库。

**影响**

任意构建步骤或依赖供应链被利用时，都可能获得 Release 写权限。

**推荐修复**

1. 拆成两个 Job：
   - `build-and-test`：`contents: read`，生成不可变构建产物。
   - `publish`：仅下载已验证产物，使用 `contents: write` 发布。
2. `publish` 绑定 GitHub Environment，启用人工审批和受限分支/Tag。
3. 仓库公开后启用 `main` 保护：PR、必需 CI、禁止 force push、限制 Tag 创建。
4. 所有 Action 继续使用完整 SHA 固定；当前本地修改在这一点上是正确的。
5. 给发布产物生成 provenance attestation。GitHub Free/Pro/Team 的 artifact attestations 只对公开仓库可用；私有仓库需要 Enterprise Cloud，见 [GitHub artifact attestations](https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations)。

**验收标准**

- 构建测试 Job 不持有 Release 写权限。
- 只有受保护的发布 Job 能创建/修改 Release。
- 未通过审批、非 `main` 提交或版本不一致的 Tag 无法发布。

### P2-03 缺少真实插件生命周期 E2E

**证据**

- 当前 Profile 测试验证的是预先写入的依赖和 Bundle 能否被保留。
- 没有测试真实执行官方插件 add/update/remove、重启 Desktop、升级 Desktop 后的结果。
- P1-01 的隔离实测已经证明没有 pnpm 时会失败。

**推荐修复**

增加一个无副作用的 fixture 插件和完整 E2E：全新 Profile -> 安装 -> 启动 -> 显示 -> 更新 -> Desktop 升级 -> 仍显示 -> 删除 -> 不再显示。Windows 同时捕获可见顶层窗口，确保没有黑框。

**验收标准**

- CI 在临时 `DSH_HOME` 中完整通过生命周期测试。
- 测试不访问用户真实 Profile，不依赖机器全局 pnpm。

### P2-04 Profile Manifest 仍可能丢失合法的未知字段

**证据**

- `apps/dsh-desktop/src/profile.mjs:90-104` 重新构造 Manifest，只保留 `name`、`private`、`dependencies` 和 `dsh.profile.bundles`。
- 实测输入中的 `scripts`、其他顶层字段、`dsh.custom`、`dsh.profile.extra` 均被删除。
- `readExistingManifest()` 只验证 JSON 语法；合法 JSON 的数组、字符串或数字仍会被当成可修复输入并改写，而不是报告 Manifest schema 错误。

**影响**

未来官方 Runtime、用户插件或高级用户在 Manifest 中增加字段时，Desktop 启动可能静默删除这些字段。

**推荐修复**

1. 验证 Manifest 必须是 plain object；`dependencies`、`dsh`、`dsh.profile` 也必须是 plain object。
2. 遇到数组、标量或错误字段类型时，保留原文件并显示可恢复错误，不自动覆盖。
3. 使用结构化 merge 保留未知字段，只覆盖 Desktop 真正管理的字段：
   - 保留 `...existing`
   - 保留 `...existing.dsh`
   - 保留 `...existing.dsh.profile`
   - 合并而不是重建 `dependencies` 和 `bundles`
4. 添加未来字段、scalar、array、null、错误依赖类型测试。

**验收标准**

- 未知字段在启动、修复和升级后字节语义不变。
- 不符合 schema 的 Manifest 不被覆盖，并保留 `.bak`/诊断信息。

### P2-05 Windows “原子写入”实现存在进程崩溃窗口

**证据**

- `profile.mjs:108-158` 在 Windows 先把原文件改名为 `.old-*`，再把临时文件改名为目标路径。
- 两次改名之间如果进程崩溃，正式 Manifest 会暂时消失，且下次启动没有恢复 `.old-*` 的逻辑。
- 临时文件写入或 `sync()` 在第一次 `rename()` 之前失败时，清理临时文件的 `finally` 尚未进入，可能留下 `.tmp-*`。
- 当前 Windows/Node 24 隔离实测表明 `rename(temp, existingPath)` 可以直接替换已有文件，因此“两步移开旧文件”不是当前运行时的必要条件。

**推荐修复**

1. 保留同目录临时文件、写入、`sync()` 和可选 `.bak`。
2. 直接 `rename(temporaryPath, path)`，不要先把正式文件移走。
3. 用覆盖整个写入生命周期的外层 `finally` 清理临时文件。
4. 如果必须保留 `.old-*` 兼容路径，启动时先检测并恢复孤立 `.old-*`，并记录审计日志。
5. 为 write、sync、backup、rename、进程中断恢复增加故障注入测试。

**验收标准**

- 任意一个写入步骤失败时，旧 Manifest 仍存在且内容不变。
- 重启后不会遗留 `.tmp-*` 或 `.old-*`。
- `.bak` 始终是最后一个完整可解析版本。

### P2-06 `asarUnpack: node_modules/**` 导致安装文件过多

**证据**

- `electron-builder.yml:6-7` 解包全部 `node_modules`。
- 当前 `app.asar.unpacked` 在 afterPack 清理后仍有：
  - 10,188 个文件
  - 2,253 个目录
  - 82.52 MiB
  - 194 个顶层 module root
- afterPack 已删除 3,268 个文件、约 14.84 MiB，但仍然是大量小文件。
- 远程 `1.0.8` 安装包为 115,195,263 字节；本次没有重新生成 `1.0.9` NSIS 安装包，也没有做真实安装计时。

**影响**

大量解包小文件会增加 NSIS 写盘、杀毒扫描、升级替换和卸载时间。当前只能确认“存在性能压力”，不能声称已测出具体安装耗时。

**推荐修复**

1. 把 `asarUnpack` 收缩为必须在文件系统上存在的 native addon、EXE、DLL、worker 和运行时动态加载文件。
2. 普通 JS/JSON/静态资源保留在 `app.asar`。
3. 用 `pack:verify` 和启动 E2E 驱动 allowlist，不依赖手工猜测。
4. 检查 `restoreRequiredPackagedPeers()` 是否复制了完整包中不需要的源码、文档和平台文件。
5. 保持 `compression: normal` 作为速度基线；不要为了减小包体直接改成 maximum 后宣称安装更快。
6. 建立安装基准：冷缓存/热缓存、Defender 开启、全新安装/覆盖升级/卸载，各运行至少 3 次。

**验收标准**

- 解包文件数和体积相对当前基线至少下降 30%，且无 Runtime 缺包。
- `pack:verify`、`pack:smoke`、目录选择、任务 Pwsh、插件生命周期、更新退出 E2E 全部通过。
- 提供真实 NSIS 安装、升级和卸载耗时对比，不只比较压缩包大小。

### P2-07 Release 只校验安装包签名，签名覆盖验证不足

**证据**

- `.github/workflows/desktop-release.yml:70-85` 只执行一次安装包 `Get-AuthenticodeSignature`，没有检查主程序、卸载器和内部自有 EXE 的 Signer Subject/时间戳。
- 没有解析 `app-update.yml` 校验 `publisherName`。

**推荐修复**

在 Release Job 中递归列出需要签名的自有 EXE，校验 `Status=Valid`、Signer Subject、时间戳和允许列表；解析 `app-update.yml` 并确认发布者字段存在。对错误证书构建做负向更新测试。

**验收标准**

- 任一自有 EXE 未签名、签名主体错误或缺少预期更新发布者时，Release 失败。

### P2-08 发布文档与实际历史不一致

**证据**

- 本地 `CHANGELOG.md:10-15` 把 Manifest 损坏保护、原子写入、旧 Patch 迁移和许可证清理写入 `1.0.8`。
- 远程 `desktop-v1.0.8` 的 Changelog 当时仍停在 `1.0.7`；上述主要修复实际属于当前未提交的 `1.0.9`。
- `PRIVACY.md` 和 `SECURITY.md` 使用“公开 Release/公开版本/私密漏洞报告”等措辞，但仓库目前是私有的，外部用户无法访问。

**推荐修复**

1. 用 `desktop-v1.0.7..desktop-v1.0.8` 的真实 diff 重写 1.0.8 记录，只保留实际发布内容。
2. 1.0.9 记录只描述 1.0.9 新改动，避免重复认领。
3. Release Notes 从 Tag diff 自动生成初稿，再人工校对。
4. 隐私、安全、下载和反馈文档必须与最终公开渠道一致。

**验收标准**

- 每条 Changelog 都能指向对应版本 Tag 中的实际提交或文件变化。
- 外部用户能打开文档列出的所有链接。

## 五、P3 一般问题

### P3-01 Runtime Provider E2E 使用过期的默认版本

`apps/dsh-desktop/scripts/verify-runtime-provider.mjs:31-32` 仍默认使用 Runtime `0.1.0-rc.7` 和 Desktop `2.5.0`，与当前 `0.1.1-rc.2` / `1.0.9` 不一致。

**解决方案**：测试脚本从根/应用 `package.json` 读取版本并断言一致；候选版本只能通过显式环境变量覆盖，并在日志中打印来源。

### P3-02 旧 Patch 多重管理块只删除第一个

`removeManagedDesktopPatch()` 只查找第一组 start/end marker。隔离实测输入两个管理块后仍残留一个完整管理块。

**解决方案**：按完整行边界循环移除所有精确 marker 块；遇到重复或不完整 marker 记录诊断并保留备份。增加开头、中间、结尾、CRLF、多块和不完整块测试。

### P3-03 缺少 SBOM、第三方许可证清单和构建 provenance

当前 Release 资产只有安装包、blockmap、`latest.yml` 和 SHA256，没有 SBOM、第三方许可证报告或构建证明。

**解决方案**：发布 CycloneDX/SPDX SBOM、第三方许可证清单和 GitHub artifact attestation；在公开仓库启用依赖审查和 Dependabot。哈希只能证明文件一致，不能单独证明构建来源。

### P3-04 测试中仍有已删除组件的陈旧参数

部分启动诊断测试仍传入 `pluginRecovery`、`pluginManager` 等已删除组件参数，但当前函数不消费这些参数。它不会直接导致运行错误，但会让测试误导维护者。

**解决方案**：删除无效测试参数，或明确测试“未知选项被忽略”的契约；不要让已删除架构继续出现在正常 fixture 中。

## 六、验证缺口

以下项目本次没有足够证据，不能标记为已验证：

1. **真实安装速度**：只测了打包后启动，没有运行 1.0.9 NSIS 全新安装/升级/卸载计时。
2. **签名发布链路**：没有证书和 Secrets，无法验证真实签名、时间戳和错误签名更新拒绝。
3. **外部用户自动更新**：仓库私有，匿名更新端点当前 404。
4. **SAST/Action lint**：本机没有 `semgrep`、`codeql`、`actionlint`；本次使用人工规则搜索、测试和 YAML 解析替代，不能等同完整 SAST。

## 七、未发现需要继续删除的源码

本次没有确认新的、可安全删除的业务源码目录。现有 `src`、打包脚本、安装升级脚本、更新退出协议和测试仍有引用或发布验证价值。不要因为文件名看起来旧就继续删除。

可以删除的是构建产物和本地依赖，例如未被 Git 跟踪的 `node_modules`、`apps/dsh-desktop/dist`；它们不是仓库源码，不应提交。`.gitignore` 必须保留并纳入版本控制，`LICENSE` 也应保留。

## 八、推荐修复顺序

### 阶段 0：冻结发布

- 不创建 `desktop-v1.0.9` Tag。
- 不把当前无签名、私有更新通道的构建发给新用户。

### 阶段 1：完成插件管理闭环

- 打包受控 pnpm。
- 提供稳定的最终用户插件入口。
- 完成 add/update/remove/restart/desktop-upgrade E2E。
- 复核所有子进程 `windowsHide: true` 且不使用可注入 shell 字符串。

### 阶段 2：修复 Profile 数据完整性

- 严格验证 Manifest object schema。
- 保留所有未知字段。
- 简化 Windows 原子替换，补故障注入和崩溃恢复测试。
- 处理重复 Patch marker。

### 阶段 3：恢复 Electron 安全基线

- 定位并修复 Windows sandbox 导航失败。
- 先 CSP Report-Only，再强制 CSP。
- 完整测试插件、设置、工作区、下载、OAuth、通知和更新界面。

### 阶段 4：公开更新和签名

- 公开主要仓库或建立公开 Release 仓库。
- 配置 Windows 签名证书 Secrets。
- 匿名端点 E2E、全 EXE 签名检查、错误签名更新负向测试。

### 阶段 5：收紧发布流水线

- 拆分只读构建 Job 和写权限发布 Job。
- 启用保护分支、Environment 审批、SBOM、许可证报告和 attestation。
- 修正文档和 Changelog。

### 阶段 6：优化安装速度

- 收缩 `asarUnpack`。
- 用真实 NSIS 基准对比优化前后。
- 性能优化不能以破坏插件、原生依赖或沙箱为代价。

### 阶段 7：发布 1.0.9

- 干净工作树提交、PR、远程 CI。
- 从受保护 `main` 创建版本 Tag。
- Release 后匿名下载、安装、启动、插件、更新、卸载全链复测。

## 九、最终发布门禁

只有以下条件全部满足，才建议发布：

- [ ] 全新 Windows 机器不安装开发工具也能安装/更新/删除插件。
- [ ] 插件操作和任务执行不弹黑色 Terminal/PowerShell 窗口。
- [ ] Windows 主渲染器启用 sandbox。
- [ ] 页面强制 CSP，核心功能和插件 E2E 通过。
- [ ] Profile 未知字段、插件配置、锁文件和 Patch 在升级后保留。
- [ ] GitHub 更新仓库可匿名访问。
- [ ] 安装包和所有自有 EXE 签名有效且发布者一致。
- [ ] Release 构建与发布权限分离，Tag 来自受保护 main。
- [ ] 远程 CI、打包验证、启动冒烟和插件生命周期 E2E 全绿。
- [ ] Changelog、隐私、安全、下载和反馈链接与实际渠道一致。
- [ ] 提供 SBOM、第三方许可证报告、SHA256 和构建证明。
- [ ] 有真实安装/升级/卸载耗时数据，且优化后没有功能回归。

## 十、建议发布判定

当前判定：**不建议发布 1.0.9**。

先处理 P1-01 至 P1-04，再完成 P2-03 至 P2-05 的数据和插件闭环；随后公开更新渠道、配置签名、推送远程 CI。当前本地测试通过说明基础代码可继续修复，但不能替代上述发布条件。
