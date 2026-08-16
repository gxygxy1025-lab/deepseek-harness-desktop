# dsh-desktop-compat

[English](README.md) | 中文

面向 DeepSeek Harness Desktop 2.0 的桌面端兼容修复包。

## 能力

这个包保留现有的“默认排队”交互。当 DSH rc.6 在取消当前任务后进入空闲状态，但普通后续消息仍留在队列中时，插件会重新唤醒官方 Agent 驱动，且不会复制消息或改变先进先出的顺序。它还会把已知的 `code run failed (abort): [object Object]` 展示替换为清晰的停止提示。

实现仅运行在宿主端，使用公开的 `agent/status`、Agent inbox、`followup` 和 `tools/post-execute` SDK 接口。它不会修改 DeepSeek Harness 的文件；上游运行时补齐文档约定的取消行为后，可以直接移除这个包。

## 安装

DeepSeek Harness Desktop 2.0 会在隔离的 desktop profile 中自动挂载这个 bundle。这个包不作为通用 Web UI 插件提供。

## 配置

这个 bundle 没有用户配置项。发送仍默认进入队列，steering 消息行为不会改变。

## 已知限制

恢复逻辑只处理 DSH rc.6 在取消后没有唤醒普通 next-turn 消息的问题。官方运行时实现相同的文档契约后，应移除这个兼容包。

## 开发

```bash
pnpm --filter @linxin666/dsh-desktop-compat test
pnpm --filter @linxin666/dsh-desktop-compat build
```
