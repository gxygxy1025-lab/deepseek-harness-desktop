# DeepSeek Harness Desktop 发布与新对话交接工作流

本文是 DeepSeek Harness Desktop 的维护者运行手册。新开对话后，应先让执行者读取本文件和仓库根目录的 `AGENTS.md`，再进行版本升级、构建、GitHub Release、官网同步或宣传。

本文覆盖公开桌面仓库：

- GitHub 仓库：`ningbainb/deepseek-harness-desktop`
- 本地远程名：`desktop`
- 稳定分支：`main`
- 版本标签：`desktop-vX.Y.Z`
- 安装包：`DeepSeek-Harness-Desktop-Setup-X.Y.Z-x64.exe`
- 官网：`https://ningbainb.github.io/deepseek-harness-desktop/`

## 1. 当前交接快照

核对日期：2026-08-15。

- 用户口述当前版本：`0.1.71`
- 根目录 `package.json`：`0.1.7`
- `apps/dsh-desktop/package.json`：`0.1.7`
- GitHub 最新公开 Release：`desktop-v0.1.7`
- GitHub 最新公开 Release 地址：`https://github.com/ningbainb/deepseek-harness-desktop/releases/tag/desktop-v0.1.7`

因此，当前可验证的事实基线是 `0.1.7`。`0.1.71` 暂时只作为用户口述的待确认目标版本记录，不能直接据此创建标签。若确实要发布 `0.1.71`，必须先把所有版本来源统一升级为 `0.1.71`，通过完整门禁后再发布。

版本事实源的优先级如下：

1. `apps/dsh-desktop/package.json` 中的 `version`。
2. 根目录 `package.json` 中的 `version`，必须与桌面清单一致。
3. GitHub 最新非草稿、非预发行的稳定 Release。
4. Git 标签和安装包文件名。
5. README、官网和用户口述只用于发现不一致，不能覆盖前四项事实源。

每次新对话都必须重新核对，不能长期依赖本节的静态快照。

## 2. 新对话可直接复制的交接指令

将下面内容作为新对话的第一条消息：

```text
请在 C:\Users\15210\Desktop\code\0\dsh-web-ui-desktop 继续维护 DeepSeek Harness Desktop。

先完整阅读仓库根目录 AGENTS.md 和 docs/launch/desktop-release-workflow.md，然后严格按工作流执行。不要修改官方 DSH 源码，不要提交 emoji，不要覆盖用户已有改动。公开桌面仓库使用 remote desktop，即 https://github.com/ningbainb/deepseek-harness-desktop.git；不要把桌面发行标签推到 origin。

用户口述当前版本为 0.1.71，但上次机器核对时，两个 package.json、GitHub 最新 Release 和标签均为 0.1.7。请先重新检查本地清单、desktop/main、GitHub 最新 Release 和现有标签，再确定实际当前版本。除非我明确要求版本升级，否则不要仅因口述差异创建 0.1.71 标签。

本次目标：<在这里填写，例如“发布 0.1.8”“修订现有发行说明”“只生成 LinuxDo 宣传稿”>。

如果目标包含正式发布，你已获授权在核验范围后自主修改、测试、提交、推送到 desktop、创建或合并 PR、创建发行标签、等待 GitHub Actions、核验 Release 资产并同步官网。任何已公开标签和安装包不得强制覆盖；如果遇到版本冲突、凭据缺失或不可恢复的外部状态变更，再停止并说明。
```

## 3. 不可违反的发布原则

- 禁止修改 DeepSeek Harness 官方源码，只能使用官方 NPM SDK、profile 和 `cordis.patch.yml` 机制。
- 仓库内禁止 emoji，包含代码、文档、界面文案、脚本输出和提交信息。
- 不得丢弃、重置或覆盖不属于当前任务的工作区改动。
- 不得把桌面发行分支或 `desktop-v*` 标签推送到 `origin`；发布目标是 `desktop`。
- 不得复用已经公开的版本号，不得强制移动公开标签，不得覆盖已发布安装包。
- 正式 Release 必须由 `desktop-release.yml` 在 GitHub Windows Runner 上构建，不能把未经工作流验证的本地安装包手动冒充正式资产。
- 发行说明必须中文在前、English 在后；应用内更新会直接显示该正文。
- 自动更新所需的安装包、blockmap 和 `latest.yml` 必须来自同一次构建。
- 当前构建没有商业代码签名证书，发行说明必须保留 SmartScreen 与社区版本提示。

## 4. 发布类型判断

开始前先判断任务属于哪一种。

### 4.1 仅修改现有 Release 正文

适用于错别字、双语补充、链接修正，不改变程序二进制。

- 修改 `docs/launch/release-notes.md`。
- 运行 `pnpm release:notes:check`。
- 提交并推送文档改动。
- 使用 `gh release edit <TAG> --notes-file docs/launch/release-notes.md` 更新现有正文。
- 不创建新标签，不重新上传安装包。

### 4.2 官网或 README 修订

适用于介绍界面、下载入口、版本展示和宣传内容调整。

- 修改 `website/`、`README.md`、`README.en.md` 或相关文档。
- 运行 `pnpm website:check` 和 `git diff --check`。
- UI 改动需要做宽屏与 390px 手机宽度的真实浏览器检查。
- 合并到 `main` 后，`pages.yml` 只在 `website/**` 或 Pages 工作流发生变化时部署官网。
- 不创建桌面版本标签，除非程序版本也发生变化。

### 4.3 新桌面版本

适用于任何需要新安装包、自动更新资产或程序行为变更的任务。执行本文第 5 至第 12 节。

## 5. 发布前状态采集

在 PowerShell 中运行：

```powershell
$RepoRoot = 'C:\Users\15210\Desktop\code\0\dsh-web-ui-desktop'
Set-Location -LiteralPath $RepoRoot

git status -sb
git remote -v
git fetch desktop --tags
git log desktop/main -5 --oneline
git tag --sort=-creatordate | Select-Object -First 15
gh auth status
gh release view --repo ningbainb/deepseek-harness-desktop --json tagName,name,publishedAt,url,targetCommitish

$RootVersion = (Get-Content -Raw -Encoding utf8 package.json | ConvertFrom-Json).version
$DesktopVersion = (Get-Content -Raw -Encoding utf8 apps/dsh-desktop/package.json | ConvertFrom-Json).version
"ROOT_VERSION=$RootVersion"
"DESKTOP_VERSION=$DesktopVersion"
```

只有满足以下条件才能继续：

- `gh auth status` 成功，账号有 `repo` 和 `workflow` 权限。
- `desktop` 指向 `ningbainb/deepseek-harness-desktop`。
- 两个清单版本一致。
- 已理解所有未提交改动的归属；不能默认执行 `git add -A`。
- 目标版本在 Git 标签和 GitHub Release 中均不存在。
- 新分支基于最新 `desktop/main`，不是基于已经合并的旧功能分支继续发布。

检查目标版本是否已经占用：

```powershell
$Version = 'X.Y.Z'
$Tag = "desktop-v$Version"

git rev-parse --verify --quiet "refs/tags/$Tag"
gh release view $Tag --repo ningbainb/deepseek-harness-desktop
```

两个命令都应表示目标不存在。若任一目标已经存在，停止复用该版本号，改用新的补丁版本。

## 6. 创建发行分支

工作区干净或已明确隔离用户改动后，从公开桌面主分支创建新分支：

```powershell
$Version = 'X.Y.Z'
$Branch = "codex/desktop-v$Version"

git switch -c $Branch desktop/main
```

如果工作区已有用户改动，不能擅自 stash、reset 或 checkout 覆盖。应先判断这些改动是否属于发行任务；无法安全隔离时再向用户说明。

## 7. 统一版本号和静态回退信息

新版本至少需要检查并更新以下位置：

- `package.json`
- `apps/dsh-desktop/package.json`
- `apps/dsh-desktop/test/app-version.test.mjs`
- `CHANGELOG.md`
- `docs/launch/release-notes.md`
- `README.md`
- `README.en.md`
- `website/index.html`
- `scripts/validate-website.test.mjs`

官网会从 GitHub API 动态读取最新 Release，但 `website/index.html` 仍必须保存可用的静态版本、安装包 URL、日期和大小回退。GitHub API 限流或离线时，用户仍应能下载正确版本。

版本更新后执行定向搜索：

```powershell
$OldVersion = '上一版本'
$Version = 'X.Y.Z'

rg -n --fixed-strings $OldVersion package.json apps/dsh-desktop CHANGELOG.md README.md README.en.md docs/launch website scripts/validate-website.test.mjs
rg -n --fixed-strings $Version package.json apps/dsh-desktop CHANGELOG.md README.md README.en.md docs/launch website scripts/validate-website.test.mjs
```

旧版本可以保留在历史 Changelog 表格中，但不能残留在当前安装包链接、当前版本标题、官网回退值或版本测试中。

版本号使用标准 SemVer 三段式 `X.Y.Z`。从 `0.1.7` 正常升级的下一个补丁版本通常是 `0.1.8`。`0.1.71` 也是语法有效的 SemVer，但它表示补丁号 71，不等同于 `0.1.7.1`，只有维护者明确选择时才能使用。

## 8. 编写中英双语发行说明

从 `docs/launch/release-notes.template.md` 开始，最终写入 `docs/launch/release-notes.md`。

固定结构：

```markdown
# DeepSeek Harness Desktop X.Y.Z

## 中文

### 本次亮点
### 验证
### 下载与校验
### 说明

## English

### Highlights
### Verification
### Download and verification
### Notice
```

要求：

- 中文必须在前，English 必须在后。
- 标题版本必须与 `apps/dsh-desktop/package.json` 完全一致。
- 中文至少包含 120 个汉字，英文至少包含 120 个单词。
- 不能残留 `{{VERSION}}`、`TBD`、`TODO`、待补或待定等占位内容。
- 中英文必须表达同一组功能、验证结论、下载方式和风险说明。
- 验证数字只能写真实执行结果，不能沿用旧版本数字。
- 正式安装包 SHA-256 在 GitHub 构建完成前未知。正文可以先指向同一 Release 的 `SHA256SUMS.txt`，构建后如需内嵌哈希，再编辑 Release 正文。

执行：

```powershell
pnpm release:notes:check
node --test scripts/validate-release-notes.test.mjs
```

## 9. 本地验证门禁

支持的运行环境是 Node `^22.19.0` 或 `>=24.0.0`，CI 使用 Node 24 和 pnpm 11.21.0。不应使用 Node 23 的结果代替正式门禁。

先安装锁定依赖：

```powershell
pnpm install --frozen-lockfile
```

运行完整仓库门禁：

```powershell
pnpm verify
git diff --check
```

`pnpm verify` 当前包括：

- 全工作区类型检查。
- 全工作区测试。
- 根级脚本测试。
- 双语发行说明检查。
- 官网资源和回退版本检查。
- 聚合包、图库和皮肤中心生成一致性检查。

正式版本还应在条件允许时进行本地打包验证：

```powershell
pnpm desktop:pack
pnpm --filter @deepseek-ai/dsh-desktop pack:verify
```

本地 Windows 因未启用开发者模式而出现的 symlink `EPERM` 不能直接忽略。先判断是否为已知环境权限问题，并以 GitHub Windows CI 的 Node 24 结果作为最终门禁；代码相关失败必须修复后重跑。

UI 或桌面生命周期发生变化时，还需要按风险运行相应 Electron E2E：

```powershell
pnpm --filter @deepseek-ai/dsh-desktop test:window-chrome:e2e
pnpm --filter @deepseek-ai/dsh-desktop test:directory-picker:e2e
pnpm --filter @deepseek-ai/dsh-desktop test:profile-migration:e2e
```

官网发生变化时，使用真实浏览器检查至少两个视口：

- 桌面：1440 x 1000。
- 手机：390 x 844，并确认 `scrollWidth` 等于 `clientWidth`。

## 10. 提交、推送和合并

提交前检查：

```powershell
git status -sb
git diff --check
git diff --stat
rg --pcre2 -n "\p{Extended_Pictographic}" <本次修改的文件列表>
```

只暂存本次发行文件，避免无差别暂存混合工作区：

```powershell
git add -- <明确的文件列表>
git diff --cached --check
git diff --cached --stat
git commit -m "release: prepare desktop X.Y.Z"
git push -u desktop HEAD
```

提交信息不得包含 emoji。

创建 PR：

```powershell
gh pr create --repo ningbainb/deepseek-harness-desktop --base main --head "codex/desktop-vX.Y.Z" --title "release: prepare desktop X.Y.Z" --body-file <PR正文文件>
```

PR 正文至少说明：

- 更新了什么。
- 为什么发布。
- 用户影响。
- 测试和打包验证结果。
- 已知限制，例如未签名安装包。

等待 PR 检查完成。Desktop CI 必须全部成功，再合并到 `main`。若直接向 `main` 推送已经得到用户明确授权，也仍须等待 Desktop CI 成功后才能打标签。

## 11. 创建标签并触发正式发布

合并后重新取得远端主分支的准确提交：

```powershell
git fetch desktop --tags
git log desktop/main -3 --oneline
```

确认 `desktop/main` 中两个清单、发行说明和官网回退值都是目标版本，然后在该提交创建带注释标签：

```powershell
$Version = 'X.Y.Z'
$Tag = "desktop-v$Version"

git tag -a $Tag desktop/main -m "release: desktop $Version"
git push desktop $Tag
```

标签会触发 `.github/workflows/desktop-release.yml`。该工作流会在 Windows Runner 上：

1. 安装 Node 24、pnpm 11.21.0 和 Chromium。
2. 运行 `pnpm verify`。
3. 构建 NSIS 安装包。
4. 运行安装载荷验证。
5. 生成 `SHA256SUMS.txt`。
6. 使用双语 `docs/launch/release-notes.md` 创建 GitHub Release。
7. 上传安装包、blockmap、`latest.yml` 和校验文件。

监控工作流：

```powershell
gh run list --repo ningbainb/deepseek-harness-desktop --workflow "Desktop Release" --limit 5
gh run watch <RUN_ID> --repo ningbainb/deepseek-harness-desktop --exit-status
```

## 12. 发布后验收

检查 Release 元数据：

```powershell
$Tag = 'desktop-vX.Y.Z'

gh release view $Tag --repo ningbainb/deepseek-harness-desktop --json tagName,name,url,publishedAt,isDraft,isPrerelease,assets
```

必须存在且来自同一次构建的四类资产：

- `DeepSeek-Harness-Desktop-Setup-X.Y.Z-x64.exe`
- 对应的 `.exe.blockmap`
- `latest.yml`
- `SHA256SUMS.txt`

验收内容：

- Release 不是 Draft，也不是 Prerelease。
- Release 正文同时包含 `## 中文` 和 `## English`。
- 安装包文件名与清单版本一致。
- `latest.yml` 的版本、路径和 SHA-512 指向本次安装包。
- `SHA256SUMS.txt` 的文件名和摘要与下载后的安装包一致。
- `releases/latest` 指向本次稳定版。
- 从上一稳定版启动应用时，内置更新器可以发现新版本、显示双语内容，并在确认前不下载。
- 下载后再次请求确认，确认后才重启安装。

下载并核对 SHA-256 的示例：

```powershell
$Version = 'X.Y.Z'
$Tag = "desktop-v$Version"
$AuditDir = Join-Path $env:TEMP "dsh-release-audit-$Version"
New-Item -ItemType Directory -Path $AuditDir -Force | Out-Null

gh release download $Tag --repo ningbainb/deepseek-harness-desktop --dir $AuditDir --pattern "DeepSeek-Harness-Desktop-Setup-$Version-x64.exe" --pattern "SHA256SUMS.txt" --pattern "latest.yml"
Get-FileHash -Algorithm SHA256 (Join-Path $AuditDir "DeepSeek-Harness-Desktop-Setup-$Version-x64.exe")
Get-Content -Encoding ascii (Join-Path $AuditDir 'SHA256SUMS.txt')
Get-Content -Encoding utf8 (Join-Path $AuditDir 'latest.yml')
```

临时验收目录位于系统临时目录，不属于仓库。验收完成后可以保留，或在确认绝对路径后单独清理。

## 13. 官网、README 和宣传同步

发布成功后检查：

- `README.md` 与 `README.en.md` 的最新版本、Release 地址、直链安装包和校验文件。
- `website/index.html` 的静态回退版本、安装包 URL、发布日期和大小。
- 官网动态 GitHub API 信息与静态回退均可用。
- `CHANGELOG.md` 的中英文内容与 Release 正文一致。

如果官网文件在发行 PR 中已经更新，合并 `main` 会自动触发 Pages。监控：

```powershell
gh run list --repo ningbainb/deepseek-harness-desktop --workflow "Deploy website to GitHub Pages" --limit 5
gh run watch <RUN_ID> --repo ningbainb/deepseek-harness-desktop --exit-status
```

线上检查：

```powershell
$Site = Invoke-WebRequest -UseBasicParsing 'https://ningbainb.github.io/deepseek-harness-desktop/'
$Site.StatusCode
$Site.Content.Contains('X.Y.Z')
```

宣传内容可从以下文件延续：

- 首发长帖：`docs/launch/linuxdo-post.md`
- 版本更新帖示例：`docs/launch/linuxdo-update-0.1.2.md`
- GitHub Discussion 草稿：`docs/launch/github-discussion.md`

LinuxDo、GitHub Discussion 或其他社区的真实发帖属于外部发布动作。只有新对话中的用户明确授权发布或宣传时才执行；否则只生成草稿。发帖前应在线重新读取当时的版规和项目发布格式，不能永久依赖旧规则。

## 14. 失败处理和禁止操作

### CI 失败

- 读取失败步骤和日志，修复根因后重新提交。
- 不得通过删除测试、降低校验阈值或伪造验证数字绕过门禁。
- 环境型失败可以在确认原因后重跑；代码型失败必须产生修复提交。

### Release 工作流失败

- 如果只是 GitHub Runner、网络或缓存瞬时失败，优先重跑同一次工作流。
- 如果标签指向的代码有错误，不要强制移动标签。
- 如果该标签尚未形成任何公开 Release，删除或重建标签仍属于高风险操作，必须先精确核对远端状态并获得当前用户明确授权。
- 如果 Release 或任何资产已经公开，发布修复版本，不复用旧版本号。

### Release 正文错误

- 正文修正不需要重打包。
- 修复 `docs/launch/release-notes.md` 并通过校验后，使用 `gh release edit` 同步。

### 官网 API 限流

- 官网应显示 `FALLBACK / 使用内置版本信息`，不能出现空白版块。
- 静态下载链接仍必须可用。
- 不得把 GitHub Token 写入前端脚本。

### 严禁执行

- `git reset --hard`
- 对未知工作区运行无范围的清理或删除
- `git push --force` 覆盖公开主分支或发行标签
- 手工替换已发布安装包
- 把真实 token、证书或 AppSecret 写入仓库
- 在未核对版本事实源时创建 `desktop-v*` 标签

## 15. 每次结束时留下的交接记录

完成或中断时，最终回复至少提供以下字段：

```text
任务状态：完成 / 进行中 / 阻塞
事实当前版本：X.Y.Z
目标版本：X.Y.Z 或无
工作分支：codex/...
HEAD：完整或短提交哈希
desktop/main：提交哈希
PR：URL 或无
Desktop CI：URL 与结论
Desktop Release：URL 与结论
Release：URL 或无
安装包 SHA-256：摘要或尚未生成
Pages：URL 与结论
本地验证：命令与通过数量
已知问题：具体问题或无
未完成事项：下一步或无
```

如果产生了真实 Git 操作，还应明确说明哪些文件被暂存、提交和推送。不得只说“已经完成”，而不留下可复核的提交、工作流和 Release 地址。
