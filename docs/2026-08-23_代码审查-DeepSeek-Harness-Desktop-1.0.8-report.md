# DeepSeek Harness Desktop 1.0.8 代码审查与修改建议

审查日期：2026-08-23  
审查对象：`gxygxy1025-lab/deepseek-harness-desktop` 当前 `main` 及桌面版 1.0.8  
审查提交：`933773017f939b2e958633d861b4d6595e25ab4c`  
审查方式：只读静态审查、GitHub 配置与 Actions 状态核验、发布资产签名检查、依赖审计；本次未修改业务代码。

## 1. 结论摘要

当前 `main` 的 GitHub Actions 已通过，源码语法检查和生产依赖审计也没有发现已知漏洞；Electron 导航、IPC、工作区文件打开和深链接策略具备明确白名单，未发现可复现的越权路径。

但是，当前版本仍不适合作为“可公开分发、可自动升级”的正式版本。最需要优先解决的是以下五项：

1. GitHub 仓库是私有仓库，外部用户无法访问更新源、下载页、反馈页和隐私政策。
2. 桌面 Profile 的 `package.json` 损坏时会被当成空配置覆盖，可能导致用户安装的插件配置丢失。
3. 已发布的 1.0.8 安装包没有 Windows 数字签名。
4. Windows 主渲染器关闭了 Electron sandbox，攻击面高于标准 Electron 安全基线。
5. 发布工作流使用可变版本标签的第三方 Action，并拥有 Release 写权限，供应链保护不足。

本次没有确认出可以直接删除的源码文件或目录。当前 `src` 文件均能找到入口、导入或测试引用；`.github`、`patches`、`docs/launch`、`NOTICE.md`、`PRIVACY.md` 均有实际用途，不建议继续按文件名判断后直接删除。

## 2. 审查边界

### 2.1 已执行

- 核对本地 HEAD、跟踪文件和工作区状态。
- 对全部已跟踪 `.mjs`、`.cjs` 执行 `node --check`，失败数为 0。
- 执行 `pnpm audit --prod --json`：0 个 info/low/moderate/high/critical，生产依赖 447 个、可选依赖 67 个。
- 执行 `pnpm outdated -r`，核对可用的补丁版本。
- 人工审查 Electron 主进程、preload、IPC、导航、权限、Profile、更新、打包、安装和发布工作流。
- 检查当前 GitHub 仓库可见性、匿名 URL、Actions 与 Release 状态。
- 下载 1.0.8 Release 安装包并检查 Authenticode 签名和 SHA-256。
- 对已跟踪非测试源码执行高风险凭据模式扫描，未发现已提交的 GitHub、AWS、OpenAI 或 npm Token。
- 执行源码文件名引用检查，没有发现零引用的 `src` 文件。

### 2.2 未执行

- 本地 `node_modules` 和 `dist` 已不存在，因此本次没有重新安装依赖、启动应用或重新打包。
- 没有在真实用户 Profile 上执行插件安装、删除、升级和回滚。
- 没有测量用户电脑上的实际安装耗时、冷启动耗时和磁盘文件数量。
- 本机没有 Semgrep，因此未执行 Semgrep 规则集；不能把本报告描述为完整 SAST 结果。
- 没有执行动态网络抓包，隐私政策中的遥测声明仍需运行时验证。

远程证据显示，当前 main 对应的 Desktop CI 运行 `32575537227` 已成功完成安装、生产依赖审计、类型检查、单元测试、Runtime Provider E2E、目录打包、目录选择器 E2E、更新退出 E2E 和 `git diff --check`。这能证明该提交在 GitHub Runner 上通过现有测试，但不能替代本次缺失的本地插件升级和公开更新链路测试。

## 3. 风险总表

| ID | 级别 | 优先级 | 问题 | 状态 |
| --- | --- | --- | --- | --- |
| F-001 | 高 | P1 | 私有 GitHub 仓库导致外部用户的自动更新和帮助链接全部不可用 | 已验证 |
| F-002 | 高 | P1 | Profile JSON 异常会触发覆盖，可能丢失用户插件配置 | 已验证 |
| F-003 | 高 | P1 | 公开分发安装包未进行 Windows 数字签名 | 已验证 |
| F-004 | 高 | P1 | Windows 主渲染器关闭 Electron sandbox | 已验证的安全降级 |
| F-005 | 高 | P1 | Release Actions 未固定提交 SHA，发布令牌拥有写权限 | 已验证 |
| F-006 | 中 | P1 | 缺少 `.gitignore`，增加凭据和构建产物误提交风险 | 已验证 |
| F-007 | 中 | P2 | 旧版桌面 Patch 迁移会保留旧配置并禁用新 Overlay | 已验证 |
| F-008 | 中 | P2 | 缺少真实插件安装、删除、重启和升级的打包 E2E | 已验证的测试缺口 |
| F-009 | 中 | P2 | Release 标签与应用版本没有一致性校验 | 已验证 |
| F-010 | 中 | P2 | 全量解包 `node_modules`，可能拖慢安装并增加文件数量 | 有代码证据，性能影响待实测 |
| F-011 | 中 | P2 | 声明 BSD-3-Clause 但仓库缺少 `LICENSE` 正文 | 已验证 |
| F-012 | 低 | P3 | README 与 CHANGELOG 仍停留在 1.0.7 | 已验证 |
| F-013 | 低 | P3 | Electron 与 Koffi 有补丁版本可升级 | 已验证，兼容性待测试 |

未发现 Critical/P0 级别问题。这里的“高”表示会直接破坏公开更新、用户数据完整性或发布可信度，并不表示已证明存在远程代码执行漏洞。

## 4. 详细问题与修改建议

### F-001 私有仓库使自动更新和帮助入口不可用

**证据**

- GitHub API 返回仓库 `visibility: private`。
- 匿名请求 `https://github.com/gxygxy1025-lab/deepseek-harness-desktop/releases.atom` 返回 404。
- 匿名访问项目页、Issues 和 `PRIVACY.md` 也全部返回 404。
- `apps/dsh-desktop/electron-builder.yml:53-56` 把更新 Provider 指向该 GitHub 仓库。
- `apps/dsh-desktop/src/community-links.mjs:1-4` 把下载、反馈、项目和隐私政策全部指向该私有仓库。
- `apps/dsh-desktop/src/update-mirrors.mjs:5-14` 没有内置公开备用源，只允许管理员通过环境变量主动配置代理。

**影响**

- 发给外部用户的应用无法检查和下载更新，会持续显示 404 或“没有可用更新”。
- “GitHub 下载”“提交建议”“GitHub 项目”“隐私政策”对没有仓库权限的用户全部失效。
- 不应在客户端内嵌私人仓库 Token；这样会把仓库访问权限泄露给所有安装用户。

**建议修改**

1. 选择一个公开发布通道：将仓库改为 public，或新建只存 Release/更新元数据的公开仓库或 HTTPS 对象存储。
2. 如果源码必须私有，推荐使用独立公开 Release 仓库或通用 HTTPS 更新服务器；不要使用客户端 GitHub Token。
3. 把下载、反馈、项目和隐私政策 URL 改为外部用户匿名可访问的稳定地址。
4. 发布后在未登录 GitHub 的干净环境中测试 `latest.yml`、安装包、blockmap、隐私政策和反馈入口。

**验收标准**

- 匿名请求更新元数据和安装资产返回 200/206，而不是 404 或登录页。
- 从 1.0.8 测试版能够发现、下载并安装更高版本。
- 所有帮助菜单 URL 在无 GitHub 登录状态下可打开。

### F-002 Profile 损坏时可能覆盖用户插件配置

**证据**

- `apps/dsh-desktop/src/profile.mjs:133-135` 的 `readJson()` 捕获所有异常并返回 `undefined`，无法区分文件不存在、JSON 损坏和读取权限错误。
- `apps/dsh-desktop/src/profile.mjs:243-251` 使用 `readJson(manifestPath) ?? {}`，随后把生成结果直接写回原 `package.json`。
- `apps/dsh-desktop/src/profile.mjs:110-118` 使用 `writeFile()` 原地写入，不是临时文件加原子替换。

**影响**

- Profile `package.json` 只要出现截断、非法 JSON 或瞬时读取问题，就可能被当成全新 Profile 重建。
- 用户通过官方 DSH 命令安装的第三方插件依赖和 bundles 可能从 Manifest 中消失。
- 应用写入过程中异常退出也可能产生下一次启动时被覆盖的截断文件。

**建议修改**

1. 仅在 `ENOENT` 时创建新 Manifest；JSON 解析失败、`EACCES` 等错误必须中止启动并显示可诊断错误。
2. 覆盖前保存带时间戳的备份，至少保留最近一个可解析版本。
3. 使用同目录临时文件写入，完成 flush 后通过 `rename` 原子替换。
4. 不要自动删除无法解析的用户配置；提供“导出诊断、恢复备份、打开配置目录”选项。
5. 增加非法 JSON、截断文件、只读文件和写入中断测试。

**验收标准**

- 损坏 Manifest 时应用拒绝覆盖，原文件字节保持不变。
- 正常 Profile 更新后，用户插件 dependencies、bundles、Patch 和锁文件保持不变。
- 模拟写入失败后仍能恢复到旧的完整 Manifest。

### F-003 1.0.8 安装包未签名

**证据**

- 从 Release 下载的 `DeepSeek-Harness-Desktop-Setup-1.0.8-x64.exe` 大小为 115,195,263 字节。
- SHA-256 为 `a0d921d3ecb66ea07a63827b0f529e694a458db0870e22c5d625568e7ac7ef6c`。
- `Get-AuthenticodeSignature` 返回 `Status: NotSigned`，没有签名者和时间戳。
- `.github/workflows/desktop-release.yml:38-40` 明确设置 `CSC_IDENTITY_AUTO_DISCOVERY=false`。

**影响**

- Windows SmartScreen 更容易显示“未知发布者”，用户无法验证发布者身份。
- SHA256SUMS 只能帮助核对字节，不能证明校验文件本身来自可信发布者。
- 自动更新链路缺少操作系统级发布者信任。

**建议修改**

1. 使用 Azure Trusted Signing、受信任的 OV/EV 代码签名证书或等效 Windows 签名服务。
2. 为安装包和实际执行文件添加 RFC 3161 时间戳。
3. 在 Release 工作流中加入签名后验证，`Get-AuthenticodeSignature` 非 `Valid` 时禁止发布。
4. 将签名身份、证书密钥和发布权限放入受保护环境，不写入仓库或普通日志。

**验收标准**

- 安装包签名状态为 `Valid`，发布者名称与产品主体一致，并带有效时间戳。
- 修改安装包任意字节后签名校验失败。
- Release 工作流在未签名时明确失败。

### F-004 Windows 主渲染器关闭 sandbox

**证据**

- `apps/dsh-desktop/src/electron-app.mjs:371-379` 设置 `contextIsolation: true`、`nodeIntegration: false` 和 `webSecurity: true`，但 Windows 使用 `sandbox: false`。
- `SECURITY.md:13-15` 说明这是官方 Web Surface 在 `sandbox: true` 下无法完成 loopback 导航的兼容性限制。

**影响**

- 现有隔离措施有效降低了风险，但 Windows 渲染器仍缺少 Electron/Chromium OS sandbox 的最后一层隔离。
- 如果 loopback Web Surface 或其依赖出现渲染器漏洞，影响可能高于 sandbox 开启状态。

**建议修改**

1. 单独复现 `sandbox: true` 时的 loopback 导航失败，记录具体错误和依赖调用链。
2. 优先修复 Web Surface 对 sandbox 的不兼容，而不是长期保留平台例外。
3. 增加 Windows 打包 E2E，验证 sandbox 开启后首页、对话、设置、工作区、插件和下载功能。
4. 修复前继续保持严格导航、权限和 IPC 白名单，不再扩大 preload API。

**验收标准**

- Windows 打包版使用 `sandbox: true` 并完成全量关键流程。
- `process.sandboxed` 或等效验证在渲染器中确认 sandbox 已启用。

### F-005 Release Actions 供应链保护不足

**证据**

- `.github/workflows/desktop-release.yml:8-9` 为整个 Job 提供 `contents: write`。
- Release 和 CI 使用 `actions/checkout@v4`、`pnpm/action-setup@v4`、`actions/setup-node@v4`，Release 还使用 `softprops/action-gh-release@v2`；这些都是可移动标签，不是完整提交 SHA。
- 私有仓库当前套餐无法启用普通分支保护 API；API 返回 403，不能把 `main` 视为已具备强制审查保护。

**影响**

- 上游 Action 标签若被移动或供应链受损，Release Job 的写权限会放大影响。
- 当前只验证 Release 提交属于 main，但没有独立审批环境、签名证明或不可变 Action 固定。

**建议修改**

1. 把所有第三方 Action 固定到审核过的完整 commit SHA，并用 Dependabot 定期提出更新。
2. 将测试和发布拆成不同 Job；测试 Job 只读，只有通过验证后的发布 Job 获得最小写权限。
3. 使用受保护 GitHub Environment，发布前需要人工审批；若当前套餐不支持，考虑公开发布仓库或升级计划。
4. 生成 SBOM、构建 provenance/attestation，并把校验与签名结果作为 Release 资产。
5. 对 Release 标签采用规则集或受控工作流生成，避免普通本地 Token 任意推送发布标签。

**验收标准**

- 工作流中的所有 `uses:` 均为完整 SHA。
- 未经批准的提交或标签不能创建 Release。
- Release 能关联可验证的签名、SBOM 和构建证明。

### F-006 缺少 `.gitignore`

**证据**

- 当前仓库没有已跟踪或本地存在的 `.gitignore`。
- 当前没有已跟踪 `.npmrc`，凭据模式扫描也未发现已提交 Token；因此这是风险，不是已发生泄露。

**影响**

- 后续执行 `git add -A` 时，可能误提交 `.npmrc`、Token 配置、`node_modules`、`dist`、日志、临时 Profile 和诊断数据。
- 大型生成目录进入 Git 历史后，即使后来删除，仍会增加仓库体积并保留敏感历史。

**建议修改**

恢复最小 `.gitignore`，至少覆盖：

```gitignore
.npmrc
node_modules/
**/node_modules/
dist/
**/dist/
*.log
.env
.env.*
!.env.example
coverage/
tmp/
.tmp/
```

同时在 CI 增加敏感信息扫描和大文件检查。不要忽略源码、工作流、`patches`、Release 说明或必要构建资源。

**验收标准**

- 本地生成依赖、安装包和日志后，`git status --short` 不显示这些文件。
- 测试用假凭据与真实凭据规则分离，真实 Token 会阻止提交或 CI。

### F-007 旧版 Patch 迁移会冻结旧配置

**证据**

- `apps/dsh-desktop/src/profile.mjs:253-263` 检测到旧 `cordis.patch.yml` 含桌面管理标记时，会把新的 `dsh-desktop.cordis.patch.yml` 写成空数组。
- 旧管理块仍留在用户主 Patch 中，之后桌面版对 `DESKTOP_PATCH_CONFIG` 的更新不会自动进入该 Profile。

**影响**

- 从早期版本升级的用户可能长期使用旧 Patch，行为与全新安装用户不一致。
- 后续安全修复或兼容修复如果依赖新 Patch，旧用户可能收不到。

**建议修改**

1. 实现一次性、带版本号的迁移，只删除旧文件中明确的桌面管理标记区块，保留所有用户内容。
2. 把当前桌面管理内容写入独立 Patch 文件，并使用原子写入与备份。
3. 对“旧块在文件开头、中间、结尾”“用户 YAML 前后存在注释”“迁移重复执行”增加测试。

**验收标准**

- 升级后的用户配置与全新安装配置在桌面管理部分一致。
- 用户自定义 Patch 字节内容不丢失，迁移可重复执行且不会重复插入。

### F-008 缺少真实插件生命周期 E2E

**证据**

- `apps/dsh-desktop/test/profile.test.mjs:49-81` 只验证预先写入的 `dsh-cost-meter` 依赖、bundle 和用户文件被 Profile bootstrap 保留。
- 当前 CI 有 Runtime Provider、目录选择器和更新退出 E2E，但没有通过官方 `dsh plugin` 命令执行安装、删除、重启和桌面升级。

**影响**

- 单元测试通过仍不能证明用户实际安装插件后能加载、重启后仍存在、升级桌面后无需重装，或删除后能完全卸载。
- 这正是此前用户反馈“安装后看不到插件”的关键回归面。

**建议修改**

增加打包 E2E：

1. 在临时 `DSH_HOME` 创建干净 desktop Profile。
2. 通过官方 DSH CLI 安装测试 Fixture 插件。
3. 启动打包应用并确认插件服务或 UI 已加载。
4. 完整退出并重启，确认插件仍在。
5. 模拟桌面版本升级或重新执行 Profile bootstrap，确认插件依赖、bundle、Patch 和锁文件保持。
6. 通过官方 CLI 删除插件，重启后确认插件消失且没有残留引用。

**验收标准**

- 安装、重启、桌面升级、删除四条路径全部自动化通过。
- 测试证明桌面安装包不预装第三方插件，但保留用户自行安装和删除插件的能力。

### F-009 标签和版本号没有一致性校验

**证据**

- `.github/workflows/desktop-release.yml:3-6` 接受任意 `desktop-v*` 标签。
- 工作流只检查标签提交属于 main，没有比较标签后缀与根 `package.json`、桌面 `package.json`、生成的 `latest.yml` 和安装包文件名。

**影响**

- 错误标签可能产生“Release 标签、应用版本、更新元数据、安装包文件名”互不一致的发布。
- 自动更新的版本判断和用户手工下载都可能受到影响。

**建议修改**

在安装依赖前解析 `GITHUB_REF_NAME`，要求：

- 标签严格匹配 `desktop-vX.Y.Z`。
- `X.Y.Z` 同时等于根和桌面 package 版本。
- 打包后 `latest.yml` 的 version 和产物文件名继续匹配。

**验收标准**

- 人为推送错误版本标签时工作流在构建前失败。
- 正确标签的所有版本字段和 Release 资产一致。

### F-010 打包布局可能拖慢安装

**证据**

- `apps/dsh-desktop/electron-builder.yml:5-8` 把全部 `node_modules/**` 放入 `asarUnpack`。
- `apps/dsh-desktop/scripts/after-pack.cjs:81-135` 在打包阶段遍历解包后的 Runtime，再逐项删除不需要的文件。
- 1.0.8 安装包约 109.9 MiB；Release 日志显示打包后又删除 3,268 个文件、约 15.6 MB，并保留 194 个顶层模块根。

**影响**

- 大量解包文件通常会增加 NSIS 文件处理、杀毒扫描和磁盘随机写入成本。
- 目前没有用户机器基准，因此不能仅凭这些数据断言安装慢的唯一原因就是 `asarUnpack`。

**建议修改**

1. 先记录当前基准：安装包大小、解压后文件数、安装时间、首次启动时间、卸载时间。
2. 把 `asarUnpack` 缩小到原生二进制、必须按真实路径访问的 Runtime 资产和动态加载资源。
3. 优先通过 electron-builder `files` 规则在收集阶段排除测试、源码映射、文档和无关元数据，不要打包后再删除数千文件。
4. 每次收窄后运行 `pack:verify`、`pack:smoke`、插件生命周期 E2E 和真实安装/卸载测试。
5. 不建议先盲目改成 `compression: maximum`；它可能减少下载体积，却增加构建或解压时间，应通过基准决定。

**验收标准**

- 在相同电脑、相同安全软件状态下至少重复测量 3 次，报告中位数。
- 优化后安装文件数和安装耗时有可量化下降，Runtime 与用户插件功能不回归。

### F-011 缺少许可证正文

**证据**

- 根 `package.json:18` 和 `apps/dsh-desktop/package.json:9` 声明 `BSD-3-Clause`。
- `NOTICE.md:5` 也声明仓库以 BSD 3-Clause 分发。
- 当前仓库没有 `LICENSE` 文件。

**影响**

- 使用者无法从仓库直接获得完整授权条款，许可证元数据与实际分发内容不一致。
- 对公开源码、二次分发和第三方合规不利。

**建议修改**

恢复完整、标准的 BSD 3-Clause 正文，并确认版权主体与 `electron-builder.yml` 中的版权声明一致。继续保留 `NOTICE.md` 说明捆绑依赖分别适用其原许可证。

**验收标准**

- 仓库根存在完整 `LICENSE`，许可证扫描工具识别为 BSD-3-Clause。
- Release 源码包和必要安装分发材料包含许可证与第三方声明。

### F-012 文档版本信息落后

**证据**

- 根和桌面 package 版本均为 1.0.8。
- `README.md:13`、`README.en.md:13` 仍写 1.0.7。
- `CHANGELOG.md` 最新条目仍是 1.0.7。

**建议修改**

- 更新中英文 README 和 CHANGELOG。
- 增加版本一致性脚本，检查两个 package、README、Release notes、标签和 `latest.yml`。

### F-013 可用的依赖补丁版本

**证据**

- Electron 当前 43.4.0，可升级到 43.4.1。
- Koffi 当前 3.1.4，可升级到 3.1.6。
- 官方 DSH Runtime 仍为当前固定版本 `0.1.1-rc.2`。

**建议修改**

补丁升级应单独提交，先阅读官方变更，再执行完整单元测试、打包、原生模块加载、插件生命周期 E2E 和安装签名验证。不要与 Profile 数据修复或 updater 迁移混在一个提交中。

## 5. 已检查但未发现可执行问题的区域

- **导航策略**：主窗口只允许活动 loopback origin；外部 HTTPS 使用系统浏览器打开。
- **Renderer 权限**：仅对活动 loopback origin 开放受控剪贴板写权限。
- **IPC**：preload 暴露面有限，主进程使用固定 action 集合和参数校验。
- **工作区文件打开**：使用 capability token、根目录约束、扩展名白名单，并拒绝协议、ADS 和可执行文件类型。
- **深链接**：使用固定 scheme 和 action 白名单，没有发现任意命令或任意 URL 分发。
- **源码残留**：本次按文件名引用和入口检查，没有确认出可安全删除的 `src` 文件；测试和构建脚本也有 package script 或 CI 引用。
- **已提交凭据**：本次规则扫描未发现真实 Token 模式，但这不能替代持续 secret scanning。

## 6. 建议实施顺序

### 阶段 A：下一次对外发布前必须完成

1. 建立匿名可访问的发布和更新通道，修复全部帮助 URL。
2. 修复 Profile 解析和原子写入，先补数据保护测试。
3. 为安装包添加可信代码签名和时间戳，并在 CI 强制验证。
4. 固定 Release Actions 的 commit SHA，收紧发布权限和标签入口。
5. 恢复最小 `.gitignore`，阻止凭据和生成物误提交。

### 阶段 B：可靠性和安全加固

1. 完成旧桌面 Patch 的一次性迁移。
2. 增加真实插件安装、删除、重启和桌面升级 E2E。
3. 修复 Windows sandbox 兼容问题并启用 sandbox。
4. 增加标签、package、更新元数据和产物版本一致性门禁。

### 阶段 C：体积、速度和维护

1. 建立安装、卸载、冷启动和文件数量基准。
2. 收窄 `asarUnpack` 并前置打包排除规则。
3. 恢复 LICENSE，更新 README/CHANGELOG。
4. 独立评估 Electron 和 Koffi 补丁升级。

## 7. 修复后的完整验收清单

- `pnpm install --frozen-lockfile`
- `pnpm audit --prod`
- `pnpm typecheck`
- `pnpm test`
- `pnpm --filter @deepseek-ai/dsh-desktop test:runtime-provider:e2e`
- 新增的插件安装/删除/重启/升级 E2E
- `pnpm --filter @deepseek-ai/dsh-desktop pack:dir`
- 目录选择器、设置窗口、更新退出打包 E2E
- `pnpm --filter @deepseek-ai/dsh-desktop pack:verify:dir`
- `pnpm --filter @deepseek-ai/dsh-desktop pack:smoke`
- `pnpm desktop:pack`
- 安装包 Authenticode 状态为 `Valid`
- 匿名更新源、下载、反馈和隐私政策 URL 全部可访问
- 从旧版本执行一次真实自动升级，用户插件仍存在且能加载
- 全新安装、覆盖升级、卸载、重新安装各执行一次
- 在此前出现黑色控制台窗口的插件搜索和任务执行场景中回归验证
- 比较优化前后的安装包大小、安装文件数、安装耗时和冷启动耗时

## 8. 最终判断

当前代码基础比早期版本更完整，现有 CI 也覆盖了较多桌面生命周期场景；没有证据支持继续大范围删除源码。下一步应从“删除文件”转向“修复发布通道、保护用户 Profile、签名发布、补齐插件生命周期测试”。

在 F-001、F-002 和 F-003 完成前，不建议把当前 1.0.8 描述为可供外部用户稳定自动升级的正式版本。
