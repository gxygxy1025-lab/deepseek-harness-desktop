# AGENTS.md — dsh-task-board

dsh Web GUI 的多列任务看板（UI 类插件）。任务可**真实执行**，不是假状态。

## 真实执行与定时调度

- 执行走 host 半区会话机制：`core/execution.ts` 通过 workspaces 服务接入一个真实
  session（blank-session 复用或 `session.create`）、重命名为任务标题、以
  `session.prompt` 发任务提示，再订阅会话快照直到本轮 settle。**执行消耗 API
  额度**，执行前先确认。
- 定时调度在浏览器端：`core/scheduler.ts` 每 60s 心跳（+ 标签页恢复即时补 tick），
  命中 cron 到期即触发，提前滚动到下一次匹配避免同 tick 双发。
- 调度仍是纯浏览器行为：Host 通道只持久化与同步，不负责启动任务。需 GUI 标签页打开，错过即跳过（不排队）；
  正在运行的任务到点被 runTask guard 拒绝，等下一次 cron。运行时人脸以结构接口注
  入，测试直接驱动 tick，无定时器。

## 数据模型

- 权威账本为当前 profile 下的 `state/task-board/tasks-v3.json`，包含 Project、Task Run 和派生 Evidence；Host 写入必须串行、临时文件回读校验后原子替换，v2 文件复制备份后迁移，损坏文件不覆盖原源。浏览器 `dsh.taskBoard.v1` 和 v2 Host 路径是旧环境回退，均不删除。
- Host 路由只允许固定 loopback same-origin 路径，不接受浏览器传入文件路径；多标签同步使用 SSE 变更事件，不加高频轮询。
- 执行/调度状态机进 `core/`，Host 文件与路由进 `host/`，浏览器 HostStore 客户端进 `client/`，UI 进 `client/board/`。

## 提交前检查

```sh
pnpm --filter @linxin666/dsh-client-ui-task-board test
pnpm run typecheck
pnpm run build
```
