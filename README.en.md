# DeepSeek Harness Desktop

[中文](README.md)

DeepSeek Harness Desktop is a community-maintained Windows 10/11 x64 and macOS 13+ wrapper for the official DeepSeek Harness Runtime. It does not bundle a plugin marketplace, QQ Bot, skin center, task board, or third-party extension collection.

The release package does not preinstall third-party plugins, but it preserves the official DSH profile plugin mechanism. Users can install or remove plugins from the official Harness plugin-management surface; restarting the desktop app loads or removes the bundle. The desktop shell does not overwrite user profile dependencies, bundles, lockfiles, or custom patches. The desktop runtime bundles a matching pnpm version, so plugin operations do not require a global pnpm installation or open a Windows console window.

## Download and install

Download `DeepSeek-Harness-Desktop-Setup-<version>-x64.exe` for Windows from [GitHub Releases](https://github.com/gxygxy1025-lab/deepseek-harness-desktop/releases/latest). After the formal macOS release, download `DeepSeek-Harness-Desktop-<version>-universal.dmg`. Files marked as unsigned candidates in Actions are diagnostic artifacts and must not be redistributed.

The current application version is `1.0.10`, with `@deepseek-ai/dsh@0.1.1-rc.2` pinned exactly. Windows uses `latest.yml`, while macOS uses signed `latest-mac.yml` update metadata.

## Core scope

- Official Harness conversations, model settings, workspaces, and file operations.
- Windows/macOS desktop windows, startup diagnostics, and automatic updates; Windows also supports tray background mode.
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

Universal Mac packages must be built on macOS:

```bash
pnpm desktop:pack:mac
pnpm --filter @deepseek-ai/dsh-desktop pack:verify:mac
```

Artifacts are written to `apps/dsh-desktop/dist/`.

This is a community project, not an official DeepSeek release. DeepSeek names and marks belong to their respective owners.
