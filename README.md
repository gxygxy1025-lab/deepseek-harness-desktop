# DeepSeek Harness Desktop

[English](README.en.md)

DeepSeek Harness Desktop 是一个面向 Windows 10/11 x64 与 macOS 13 及以上的社区桌面封装。它在受控 Electron 窗口中启动并加载官方 DeepSeek Harness Runtime，默认不预装第三方插件，同时保留官方 DSH Profile 插件管理机制。

发布包不会预装第三方插件，但保留官方 DSH Profile 插件机制。用户通过 Harness 官方插件管理界面安装或删除插件，重启桌面应用后即可加载或卸载对应 Bundle；桌面壳不会覆盖用户的 Profile 依赖、Bundle、锁文件或自定义 patch。桌面运行时内置匹配版本的 pnpm，不要求用户全局安装 pnpm，也不会为插件操作弹出 Windows 控制台窗口。

## 下载与安装

从 [GitHub Releases](https://github.com/gxygxy1025-lab/deepseek-harness-desktop/releases/latest) 下载 Windows 的 `DeepSeek-Harness-Desktop-Setup-<version>-x64.exe`。macOS 正式发布后，根据芯片下载 `arm64` 或 `x64` 安装包；Actions 中标记为 unsigned candidate 的文件仅用于开发验证，不能对外分发。

当前应用版本为 `1.0.10`，官方 Runtime 精确固定为 `@deepseek-ai/dsh@0.1.1-rc.2`。Windows 使用 `latest.yml`，macOS 使用 `latest-mac.yml` 检查签名更新。

## 核心能力

- 官方 Harness 对话、模型设置、工作区和文件操作。
- Windows/macOS 桌面窗口、启动诊断和自动更新；Windows 提供系统托盘后台模式。
- Skills 发现与工作区文件安全打开。
- 隔离的 desktop profile，不修改其他 DSH profile。

## 本地开发

需要 Node.js 24 和 pnpm 11.22.0：

```powershell
corepack enable
pnpm install --frozen-lockfile
pnpm desktop:test
pnpm desktop:dev
```

生成 Windows 安装包：

```powershell
$env:CSC_IDENTITY_AUTO_DISCOVERY = 'false'
pnpm desktop:pack
pnpm --filter @deepseek-ai/dsh-desktop pack:verify
```

macOS 分架构包必须在 macOS 上构建：

```bash
pnpm desktop:pack:mac:arm64
pnpm --filter @deepseek-ai/dsh-desktop run pack:verify:mac -- --arch=arm64
pnpm desktop:pack:mac:x64
pnpm --filter @deepseek-ai/dsh-desktop run pack:verify:mac -- --arch=x64
```

安装包输出到 `apps/dsh-desktop/dist/`。

## 项目链接

- [问题反馈](https://github.com/gxygxy1025-lab/deepseek-harness-desktop/issues)
- [隐私政策](PRIVACY.md)
- [安全策略](SECURITY.md)
- [更新记录](CHANGELOG.md)

本项目是社区维护版本，不是 DeepSeek 官方发行版。DeepSeek 名称和标识归其权利人所有。
