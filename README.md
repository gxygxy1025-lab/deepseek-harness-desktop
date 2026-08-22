# DeepSeek Harness Desktop

[English](README.en.md)

DeepSeek Harness Desktop 是一个面向 Windows 10/11 x64 的社区桌面封装。它在受控 Electron 窗口中启动并加载官方 DeepSeek Harness Runtime，不包含插件市场、QQ Bot、皮肤中心、任务看板或第三方扩展集合。

## 下载与安装

从 [GitHub Releases](https://github.com/gxygxy1025-lab/deepseek-harness-desktop/releases/latest) 下载 `DeepSeek-Harness-Desktop-Setup-<version>-x64.exe`，关闭旧版后运行安装程序。安装包内置运行所需的 Node.js/Electron 环境，不要求用户单独安装开发工具。

当前应用版本为 `1.0.7`，官方 Runtime 精确固定为 `@deepseek-ai/dsh@0.1.1-rc.2`。应用通过 GitHub Release 的 `latest.yml` 检查更新，下载完成后由用户确认安装。

## 核心能力

- 官方 Harness 对话、模型设置、工作区和文件操作。
- Windows 桌面窗口、系统托盘、启动诊断和自动更新。
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

安装包输出到 `apps/dsh-desktop/dist/`。

## 项目链接

- [问题反馈](https://github.com/gxygxy1025-lab/deepseek-harness-desktop/issues)
- [隐私政策](PRIVACY.md)
- [安全策略](SECURITY.md)
- [更新记录](CHANGELOG.md)

本项目是社区维护版本，不是 DeepSeek 官方发行版。DeepSeek 名称和标识归其权利人所有。
