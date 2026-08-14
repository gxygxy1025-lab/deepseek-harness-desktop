# DeepSeek Harness Desktop 0.1.3

DeepSeek Harness Desktop packages the original DSH Web surface as a native Windows application while retaining the official runtime and complete dsh-web-ui plugin, skin, and skill collection.

## Taskbar icon completed

- The kawaii DeepSeek whale-girl icon is now applied explicitly to the main window and Extension Dock at runtime.
- The executable, NSIS installer, desktop shortcut, Start menu shortcut, application windows, and Windows taskbar now share the same multi-resolution artwork.
- The packaged PNG is audited independently from the embedded executable ICO so Windows cannot fall back to Electron's default icon.

## Built-in updates

- Checks the stable channel of this public GitHub Releases repository after startup and every six hours.
- Shows the installed version, target version, release title, publication time, and release notes before downloading.
- Downloads only after user confirmation and displays progress in the Windows taskbar.
- Prompts again before stopping DSH, restarting, and launching the NSIS update.
- Adds `Help > Check for Updates` for an immediate manual check.
- Automatic network errors stay in the bounded desktop log; manual errors are shown directly.

Version 0.1.3 is the first release with the updater client. Install it once from GitHub; later releases can be discovered inside the app.

## Verification

- 41 desktop unit and integration tests passed, including the icon resolver and complete update decision flow.
- 44 required packaged runtime packages passed the audit together with the runtime icon and `app-update.yml`.
- Real packaged-EXE startup, native window chrome, and official in-app directory picker tests are retained.

## Download

Download `DeepSeek-Harness-Desktop-Setup-0.1.3-x64.exe` and verify it using the adjacent `SHA256SUMS.txt`.

Installer SHA-256: `5f83930feccd9ad68d4bc9cc0ffe7bf62865c89bb5606b67e5ebbae23f1883e9`

This community build is not signed with a commercial code-signing certificate. Windows SmartScreen may display an unknown publisher. Download only from this repository's Release page and use the default installation location when possible.

This is a community release and is not an official DeepSeek distribution.
