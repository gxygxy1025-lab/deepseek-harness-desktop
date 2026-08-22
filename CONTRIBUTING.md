# Contributing

本仓库只维护 DeepSeek Harness Desktop 核心壳、安装/更新流程和官方 Runtime 集成，不接收第三方插件、皮肤、机器人或市场功能。

开发环境需要 Windows 10/11、Node.js 24 和 pnpm 11.22.0。

```powershell
corepack enable
pnpm install --frozen-lockfile
pnpm verify
```

涉及打包的变更还应执行：

```powershell
$env:CSC_IDENTITY_AUTO_DISCOVERY = 'false'
pnpm desktop:pack
pnpm --filter @deepseek-ai/dsh-desktop pack:verify
pnpm --filter @deepseek-ai/dsh-desktop pack:smoke
```

保持 Renderer sandbox、context isolation 和 `nodeIntegration: false`。IPC 只能接受固定动作、受控 URL 和经过校验的工作区路径。不要提交凭据、个人 profile、日志、`dist/` 或本地用户数据。
