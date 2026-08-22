# DeepSeek Harness Desktop

[中文](README.md)

DeepSeek Harness Desktop is a community-maintained Windows 10/11 x64 wrapper for the official DeepSeek Harness Runtime. It does not bundle a plugin marketplace, QQ Bot, skin center, task board, or third-party extension collection.

## Download and install

Download `DeepSeek-Harness-Desktop-Setup-<version>-x64.exe` from [GitHub Releases](https://github.com/gxygxy1025-lab/deepseek-harness-desktop/releases/latest), close the previous version, and run the installer. The package includes its required Node.js and Electron runtime.

The current application version is `1.0.6`, with `@deepseek-ai/dsh@0.1.1-rc.2` pinned exactly. Updates are discovered through the GitHub Release `latest.yml` metadata and installed only after user confirmation.

## Core scope

- Official Harness conversations, model settings, workspaces, and file operations.
- Windows desktop window, system tray, startup diagnostics, and automatic updates.
- Skills discovery and controlled native opening of workspace files.
- An isolated desktop profile that does not modify other DSH profiles.

## Development

Use Node.js 24 and pnpm 11.22.0:

```powershell
corepack enable
pnpm install --frozen-lockfile
pnpm desktop:test
pnpm desktop:dev
```

Build and verify the Windows installer:

```powershell
$env:CSC_IDENTITY_AUTO_DISCOVERY = 'false'
pnpm desktop:pack
pnpm --filter @deepseek-ai/dsh-desktop pack:verify
```

Artifacts are written to `apps/dsh-desktop/dist/`.

This is a community project, not an official DeepSeek release. DeepSeek names and marks belong to their respective owners.
