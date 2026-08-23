# macOS 1.0.10 发布验收记录

## 当前自动验证

- [ ] `macos-15` arm64 安装依赖、测试、Runtime E2E、目录包校验和启动冒烟通过。
- [ ] `macos-15-intel` x64 安装依赖、测试、Runtime E2E、目录包校验和启动冒烟通过。
- [ ] Universal DMG、ZIP 和 `latest-mac.yml` 在同一次构建中生成。
- [ ] Universal 主程序和运行时原生文件架构校验通过。
- [ ] Developer ID 签名、Apple 公证和 stapling 通过。
- [ ] Windows 1.0.10 回归与签名发布构建通过。

## 当前外部阻塞

- GitHub 仓库当前为私有，外部用户不能使用公开 Release 更新通道。
- GitHub Actions 尚未配置 Windows 或 Apple 签名与公证 secrets。
- 尚无 Apple Silicon 和 Intel 真机验收记录。
- 尚未完成 `1.0.10` 到更高测试版本的真实自动更新验证。

## 真机验收

在未预装 Node.js、pnpm 或 DSH 开发环境的 Apple Silicon 和 Intel Mac 上分别执行：

1. 下载已签名且已公证的 DMG，验证 Gatekeeper 不显示损坏或未知开发者错误。
2. 拖入 `/Applications`，启动后确认不额外打开浏览器或终端。
3. 配置模型并在包含中文和空格的工作区执行读取、写入、搜索与任务工具。
4. 安装一个用户插件，退出并重新启动，确认插件仍能加载；删除后再次确认卸载生效。
5. 点击关闭按钮后从 Dock 恢复窗口；通过菜单退出后确认 Runtime 和后台进程全部结束。
6. 重启系统，确认会话、设置、工作区和插件状态保留。
7. 从 `1.0.10` 升级到专用测试版本，确认下载、签名校验、替换和重启完整成功。

每项需要记录设备型号、CPU 架构、macOS 版本、安装包 SHA256、执行人、时间和结果。任一架构失败时不得创建正式 Release。
