# Desktop updater and Windows taskbar icon design

## Scope

DeepSeek Harness Desktop must use the same kawaii DeepSeek icon in the packaged executable, installer, desktop and Start menu shortcuts, every Electron window, and the Windows taskbar. It must also check the public GitHub Releases feed for stable updates, show the release contents, and let the user decide whether to download and install.

The implementation remains in the desktop shell. It does not modify DeepSeek Harness source code or any bundled DSH plugin.

## Icon architecture

Electron Builder continues to embed `build/icon.ico` into the executable and NSIS installer. A 1024 px PNG copy is also shipped as an application resource. At runtime the desktop shell resolves that resource to an absolute path and supplies it to every `BrowserWindow` through the `icon` option. The application keeps the stable `ai.deepseek.harness.desktop` AppUserModelID so Windows groups the shortcut and running process under the same identity.

This covers the packaging icon and the runtime taskbar icon separately. A small unit-tested resolver keeps development and packaged paths deterministic. The packaged-resource audit verifies that the PNG exists beside the application resources.

## Update architecture

The desktop app uses `electron-updater` with the existing GitHub publisher configuration and Windows NSIS target. Automatic downloading and automatic installation on quit are disabled. The app performs a delayed startup check and repeats the check every six hours. A Help menu item also starts a manual check.

When a stable release is available, a native dialog shows the installed version, target version, release name, release date, and normalized release notes. The user can choose to download or postpone. During download, Windows taskbar progress reflects the transfer percentage. After checksum verification and download completion, a second dialog offers restart-and-install or later. Installation first stops the embedded DSH runtime and saves window state, then hands control to the NSIS updater.

Automatic network errors are written to the bounded desktop log without interrupting the user. Manual checks surface errors and an up-to-date result. Concurrent checks and duplicate prompts are suppressed.

Every published Windows release must include the installer, blockmap, and generated `latest.yml` from the same build. Draft or prerelease GitHub releases are not considered stable updates.

## Verification

Unit tests cover release-note normalization, available and unavailable flows, user deferral, download progress, installation handoff, errors, and icon path resolution. The normal desktop suite, packaged dependency audit, real EXE startup test, directory picker test, and window chrome test must remain green. The final GitHub release assets are audited for installer, blockmap, checksum file, and `latest.yml`.
