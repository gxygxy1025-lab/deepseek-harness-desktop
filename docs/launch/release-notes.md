# DeepSeek Harness Desktop 1.0.9

This release keeps the desktop package limited to the official DeepSeek Harness runtime. Third-party plugins are not bundled, but users can install or remove them with the official `dsh plugin --profile desktop add/remove` commands. The desktop shell now preserves user plugin dependencies, bundle entries, workspace settings, lockfiles, and custom patches across restart, so installed plugins can load normally without becoming part of the published installer.

It also retains the Windows Terminal visibility fix from 1.0.7.

This release refuses to overwrite malformed desktop Profile manifests, migrates legacy desktop patch blocks without deleting user content, and requires a public update channel plus a valid Windows signature before a GitHub Release can be published.

The packaged runtime now includes its matching pnpm CLI and passes it directly to the official DSH plugin manager. Plugin installation and removal therefore work without a global pnpm installation and without showing a Windows console window. The active DSH renderer also receives report-only CSP and baseline response headers while the upstream page still requires inline scripts and styles.

# DeepSeek Harness Desktop 1.0.7

This release fixes the remaining visible Windows Terminal window when a task runs the sandboxed `Pwsh` tool. Both restricted-process launch paths now request a hidden first window while preserving the Windows ACL sandbox token, stdio pipes, and process-lifetime controls.

The repository no longer ships the legacy plugin market, third-party extension collection, QQ Bot, skin center, task board, community window, or promotional website.
