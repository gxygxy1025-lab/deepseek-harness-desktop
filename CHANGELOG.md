# Changelog

## 1.0.7 - 2026-08-22

- 修复任务执行 `Pwsh` 时 Windows ACL 沙箱二次启动受限进程导致 Terminal 黑框弹出的问题。
- 对沙箱的管道输出与继承输出两条 `CreateProcessAsUserW` 路径统一设置 `STARTF_USESHOWWINDOW` 和 `SW_HIDE`。
- 保留受限令牌、ACL、标准输入输出管道和进程终止语义，不使用会导致受限 PowerShell 启动失败的 `CREATE_NO_WINDOW`。

## 1.0.6 - 2026-08-22

- 修复 Windows 搜索、安装或更新插件时官方 DSH 通用子进程可能显示终端窗口的问题。
- 删除社群窗口、星标提示、旧插件/皮肤/网站源码和对应 CI 发布链路。
- 安装包只保留 `en-US` 与 `zh-CN` Electron locale，并在全新安装时跳过仅升级需要的旧进程扫描。
- 将隐私政策链接固定到仓库 `main` 分支。

## 1.0.5

- 隐藏 DSH 插件转发和 Web 浏览器启动命令的 Windows 控制台窗口。
- 保持官方 Runtime `@deepseek-ai/dsh@0.1.1-rc.2` 精确锁定。
- 提供 Windows x64 NSIS 安装、卸载和 GitHub Release 自动更新。
