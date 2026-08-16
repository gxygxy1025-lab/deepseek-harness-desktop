# DeepSeek Harness Desktop

## Architecture

The desktop application is a thin lifecycle and security layer around the official DSH host. Electron starts `@deepseek-ai/dsh` with `--profile desktop --port 0`, waits for the official loopback URL line, probes HTTP readiness, and then loads that URL into the main window. The Web application, protocols, data paths, tools, and plugin system remain DSH implementations.

The DSH home remains `DSH_HOME` or `~/.dsh`. The desktop app runs the managed `~/.dsh/profiles/desktop` profile, which composes `@deepseek-ai/dsh-base`, `@deepseek-ai/dsh-web-app`, `@linxin666/dsh-web-ui-all`, `@tencent-connect/dsh-qqbot`, `dshmarket`, `dsh-codex-connect`, and `reasoning-slider` while preserving community bundles already added to that profile. Packaged plugin directories are linked into the profile's `node_modules`; this is runtime package resolution, not a second configuration store. Existing default profiles are not changed.

## Included desktop capabilities

| Area | Behavior |
| --- | --- |
| Runtime | Official DSH host, random loopback port, HTTP readiness probe, graceful stop, bounded automatic restart |
| Web surface | Original DSH Web application and complete dsh-web-ui plugin/skin aggregate |
| Conversation continuity | FIFO next-turn queue, automatic continuation after cancellation, normalized user-cancellation feedback |
| Model recovery | Bounded backoff for rate limits, timeouts, network loss, and retryable server errors; immediate manual cancellation |
| Recovery | Critical-file preflight, startup status, sanitized recent error, retry, profile repair, logs, exit |
| Plugins | Actual version inventory, Desktop-managed built-ins, lazy community update checks, three-state compatibility, offline exact switch, rollback |
| Skills | Project/DSH/Agents root discovery, safe folder import, searchable conversation menu, recent-use ordering, full keyboard control |
| Reasoning | Sticky disclosure control keeps long reasoning collapsible without scrolling back to its start |
| SSH operations | Three-second Linux telemetry for CPU, memory, disk, load, processes, and failed services, plus confirmed process and systemd actions |
| Window | Single instance, persisted visible geometry, native menu, download destination prompt |
| Community | Help-menu QQ group QR and one-click join, direct GitHub issue feedback |
| Updates | Stable GitHub Releases, background download, user-confirmed restart/install, release notes, taskbar progress |
| Visual system | Solid native/injected title-bar alignment, system-style Extension Dock, bounded animated particle-whale startup surface |
| Security | Sandbox, context isolation, no Node integration, loopback navigation allowlist, denied permissions |

## Desktop 2.0 screenshots

The main Harness surface exposes the searchable Skills library beside the composer while preserving the official conversation, workspace, and tool interfaces.

![DeepSeek Harness Desktop 2.0 main interface and Skills library](screenshots/13-hero-main.png)

| Particle-whale startup surface | Plugin and skill Extension Dock |
| --- | --- |
| ![Desktop 2.0 startup surface](screenshots/desktop-startup.png) | ![Desktop 2.0 Extension Dock](screenshots/desktop-extension-dock.png) |

## Performance and size

Reference measurements on the Windows 11 development machine for version 2.0.0:

| Measurement | Result |
| --- | ---: |
| Managed runtime packages | 22 |
| Fresh profile preparation, median | 22.3 ms |
| Unchanged profile preparation, median | 13.2 ms |
| Warm DSH readiness | about 2.8–3.0 seconds |
| First cold Windows file scan | about 25.2 seconds |

The release keeps the official DSH runtime, Chromium, terminal/native modules, SSH, remote UI, all built-in plugin packages, and all skins. The first start may be slower while Windows scans newly installed files. Later starts reuse both the installed files and profile links. Run `pnpm --filter @deepseek-ai/dsh-desktop measure:profile` to reproduce the profile-only benchmark without network access.

## Installation

Download the x64 installer from GitHub Releases and verify its SHA-256 against `SHA256SUMS.txt`. The build is currently unsigned, so SmartScreen may display an unknown publisher. The default per-user location is recommended. Custom installation roots should be kept short because some transitive native tooling still depends on the legacy Win32 260-character path limit.

No separate Node.js or pnpm installation is required for release users.

The installed app checks stable GitHub Releases after startup and every six hours, then downloads a discovered release in the background. Open `Help > Check for Updates` to check immediately. Installation still requires an explicit `Restart and install` action. Desktop stops and reaps the DSH child process before handing control to the installer. Automatic check failures remain in the desktop log; manual check failures are shown to the user.

## Extension Dock

Open `Tools > Extension Dock` from the native menu.

Plugin installation accepts an npm registry package such as `@scope/dsh-bundle@1.2.3`. URL, path, whitespace, shell metacharacter, and option-like input is rejected. The package must declare a DSH bundle patch. Built-in package versions are displayed but can change only with a tested Desktop release.

Opening Extension Dock checks only community packages for updates; normal application startup performs no registry requests. A candidate is assessed against the current Desktop, DSH runtime, Electron Node.js, and installed peer versions. Compatible versions can update directly, incompatible versions are blocked with a reason, and versions without enough metadata require explicit confirmation. The package is prefetched while DSH remains available, then switched to an exact version offline. If validation or restart fails, the previous manifest and lockfile are restored and the old runtime is restarted.

The built-in Tencent QQ Bot integration is disabled until it is bound from Extension Dock. Binding uses the official QR connector inside the desktop main process. The AppSecret is encrypted with the operating-system credential store, is never sent to renderer code, and is supplied to the DSH child process only through its environment. Unbinding deletes the encrypted credential, disables the profile row, and restarts DSH.

Skill discovery scans project `.dsh/skills`, project `.agents/skills`, user DSH skills, and user Agents skills in precedence order. Import copies one validated skill folder into `~/.dsh/skills` without overwriting an existing name.

## Build from source

```powershell
corepack enable
pnpm install --frozen-lockfile
pnpm desktop:test
$env:CSC_IDENTITY_AUTO_DISCOVERY = 'false'
pnpm desktop:pack
pnpm --filter @deepseek-ai/dsh-desktop pack:verify
```

Use Node.js 24 and pnpm 11.21.0. The installer is written to `apps/dsh-desktop/dist`.
