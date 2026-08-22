# DeepSeek Harness Desktop 1.0.8

This release keeps the desktop package limited to the official DeepSeek Harness runtime. Third-party plugins are not bundled, but users can install or remove them with the official `dsh plugin --profile desktop add/remove` commands. The desktop shell now preserves user plugin dependencies, bundle entries, workspace settings, lockfiles, and custom patches across restart, so installed plugins can load normally without becoming part of the published installer.

It also retains the Windows Terminal visibility fix from 1.0.7.

# DeepSeek Harness Desktop 1.0.7

This release fixes the remaining visible Windows Terminal window when a task runs the sandboxed `Pwsh` tool. Both restricted-process launch paths now request a hidden first window while preserving the Windows ACL sandbox token, stdio pipes, and process-lifetime controls.

The repository no longer ships the legacy plugin market, third-party extension collection, QQ Bot, skin center, task board, community window, or promotional website.
