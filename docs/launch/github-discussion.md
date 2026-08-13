# DeepSeek Harness Desktop 0.1.0 is available

DeepSeek Harness Desktop 0.1.0 is now open source and available for Windows x64.

This is a lossless desktop port, not a rewritten interface. The application starts the official DeepSeek Harness host on loopback and loads the original Web UI with its complete plugin and skin collection. It adds a native single-instance lifecycle, bounded crash recovery, an isolated desktop profile, hardened Electron boundaries, sanitized rotating logs, and an Extension Dock for community plugins and project/user skills.

The current release bundles 21 UI plugins and 9 selectable skins, including Miku and Trading. The packaged application passed 26 desktop tests, a 23-package payload audit, and a clean-profile EXE startup test.

- [Download DeepSeek Harness Desktop 0.1.0](https://github.com/ningbainb/deepseek-harness-desktop/releases/tag/desktop-v0.1.0)
- [Read the source and architecture notes](https://github.com/ningbainb/deepseek-harness-desktop)
- Installer SHA-256: `f3582f8c216aff321efed8a09db06b6b157c720a2d85cc73c7852406f0ea9815`

The community build is currently unsigned. Windows SmartScreen may show an unknown publisher, so download only from the Release page above and verify the checksum.

## 中文

DeepSeek Harness Desktop 0.1.0 Windows x64 版现已开源发布。

这不是重写一套界面，而是把官方 DeepSeek Harness 本地主机与原版 Web UI 无损装进 EXE，完整保留插件与皮肤，并加入单实例生命周期、有限崩溃恢复、独立桌面 profile、Electron 安全边界、脱敏轮转日志，以及可管理社区插件和项目/用户技能的扩展坞。

当前版本内置 21 个 UI 插件和 9 款可选皮肤，包含 Miku 与 Trading。成品已通过 26 项桌面测试、23 个运行包审计，并在全新 profile 下完成打包 EXE 实启测试。

当前为社区未签名构建，Windows SmartScreen 可能显示“未知发布者”。请只从上方 Release 页面下载并核对 SHA-256。
