# Desktop 三层插件容灾实施计划

> **For maintainers:** 按本文逐项实现与验证；每一层必须能够在 DSH 插件系统不可用时独立工作。

**目标：** 桌面版遇到社区插件缺依赖、能力冲突或版本不兼容时，能够自动恢复，并让不熟悉命令行的用户始终保有一条可操作的恢复路径。

**架构：** 在 Electron 主进程增加 `PluginRecoveryManager`，由它持久化最近三份配置快照、分析运行时错误、隔离故障插件并控制单次重试和安全模式。现有文件型启动页作为独立恢复界面，恢复中心放入同样不依赖 DSH 的 Extension Dock。插件文件默认保留，仅修改活动 bundle 清单。

**技术栈：** Electron、Node.js ESM、现有 `PluginManager`、Node test runner、HTML/CSS/JavaScript。

---

## 1. 故障模型与数据边界

- 仅自动隔离当前 Profile 中处于启用状态的社区 bundle，内置 bundle 永不被自动移除。
- 识别 `Failed to load plugins`、loader 导入失败、`Cannot find package`、重复能力名和兼容性错误；无法可靠定位时直接提供安全模式，不猜测插件。
- 停用只删除 `dsh.profile.bundles` 中的活动项，不删除依赖、插件目录、聊天记录、模型设置或账号信息。
- 自动修复每个启动会话最多执行一次；再次失败后进入安全模式，安全模式仍失败则停止自动重启。

## 2. 快照与上次可用配置

**文件：**

- 新增 `apps/dsh-desktop/src/plugin-recovery.mjs`
- 新增 `apps/dsh-desktop/test/plugin-recovery.test.mjs`
- 修改 `apps/dsh-desktop/src/extensions/plugins.mjs`

实现内容：

1. 在用户数据目录保存版本化恢复状态、事件记录和最多三份 Profile 快照。
2. 快照包含 `package.json`、`pnpm-lock.yaml`（若存在）和启用 bundle 列表；写入使用临时文件加原子重命名。
3. 安装、更新、启用和卸载前创建 `before-mutation` 快照；启动稳定后保存 `last-known-good`，相同内容去重。
4. 恢复快照后通过 `PluginManager` 的受控安装流程重建依赖，失败时保留原配置并报告。

## 3. 自动隔离与安全模式

**文件：**

- 修改 `apps/dsh-desktop/src/electron-app.mjs`
- 修改 `apps/dsh-desktop/src/runtime-controller.mjs`
- 修改 `apps/dsh-desktop/src/profile.mjs`

实现内容：

1. 主进程缓存有界运行时日志，在崩溃时生成结构化故障事件。
2. 可识别故障插件时：记录快照、停用插件、仅自动重启一次。
3. 仍失败或无法定位时：只保留官方内置 bundle，进入安全模式并打开恢复界面。
4. 支持 `--safe-mode`、环境开关以及启动窗口捕获 Shift 强制安全模式。
5. 防止恢复控制器和运行时自身重启计时器竞争，所有恢复操作串行执行。

## 4. 独立恢复页与恢复中心

**文件：**

- 修改 `apps/dsh-desktop/src/ipc.mjs`
- 修改 `apps/dsh-desktop/src/preload.cjs`
- 修改 `apps/dsh-desktop/src/ui/startup.html`
- 修改 `apps/dsh-desktop/src/ui/startup.mjs`
- 修改 `apps/dsh-desktop/src/ui/startup.css`
- 修改 `apps/dsh-desktop/src/ui/extensions.html`
- 修改 `apps/dsh-desktop/src/ui/extensions.mjs`
- 修改 `apps/dsh-desktop/src/ui/extensions.css`

实现内容：

1. 错误页优先显示故障插件、简化原因和“不影响聊天记录与个人设置”。
2. 主按钮为“一键停用并重启”，次按钮为“进入安全模式”，技术详情默认折叠。
3. Extension Dock 增加“插件恢复”页，支持查看事件、重新启用、卸载、恢复最近配置和导出诊断包。
4. 所有 IPC 输入做白名单和长度校验，不向渲染器暴露任意文件路径或写文件能力。

## 5. 插件变更单一通道

**文件：**

- 修改 `apps/dsh-desktop/src/extension-ipc.mjs`
- 修改 `patches/dshmarket@1.9.0.patch`
- 修改相关集成测试

实现内容：

1. Extension Dock 的每次变更都先调用恢复管理器建立快照。
2. Desktop 环境下的市场安装、更新、启用和卸载不得直接写 Profile；统一委托桌面主进程的 PluginManager，或在无法安全桥接时明确引导到 Extension Dock 并拒绝旁路写入。
3. 保留市场浏览与主题切换能力，但配置写入只有一个权威通道。

## 6. 验证

测试至少覆盖：

- 缺少依赖能够从含中文和空格的 Windows 路径中识别插件包名。
- 能力名称冲突能给出简化原因，但不泄露完整本机路径。
- 内置插件不会被自动隔离。
- 首次故障只重试一次，第二次进入安全模式，不会无限重启。
- 安全模式保留依赖和用户数据，仅过滤社区 bundle。
- 快照最多三份、相同内容去重、损坏状态文件可自愈。
- 文件型恢复页在 runtime 未 ready 时仍可执行停用和安全模式动作。
- Extension Dock 恢复操作全部经 PluginManager 串行队列执行。

最后运行：

```powershell
pnpm --filter @linxin666/dsh-desktop test
pnpm verify
pnpm --filter @linxin666/dsh-desktop pack:verify
```
