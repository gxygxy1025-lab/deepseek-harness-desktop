# Installer self-termination fix

## Evidence

An in-place 2.3.0 to 2.5.0 installation reached the old-uninstaller loop even though no `DeepSeek Harness Desktop.exe` process remained. Each retry extracted the 2.3.0 cleanup script into a fresh NSIS temporary directory. The script attributed the copied `old-uninstaller.exe` parent to the installation because its `_?=<install directory>` argument contained the registered root, then force-terminated that parent. Electron-builder retried the nonzero uninstaller five times and displayed its generic “cannot be closed” dialog.

## Design

The cleanup process excludes itself and its complete installer/uninstaller ancestor chain from direct-path and command-line attribution. This keeps the strict boundary for actual Desktop browser, renderer, resource, and legacy hosted-runtime processes without allowing the orchestration process to kill itself.

Installed builds carry `resources/installer-upgrade-v3`. A new installer checks this marker after all owned processes have exited and exclusive-write probes for the main executable and `resources/app.asar` have passed. An unmarked legacy root with both product anchors is atomically moved to a same-volume quarantine, and the exact product registry keys are removed so electron-builder cannot invoke the defective old uninstaller. The quarantine is removed with bounded retries; long-path trees fall back to the Windows Recycle Bin. User data remains outside the installation root. Marker-bearing installations continue through their own safe uninstaller. The migration switch is compiled into installers only, never uninstallers.

## Verification

Windows tests cover the original ancestor self-termination code, legacy directory and registry staging, user-data preservation, marker-bearing modern installs, replacement-file locks, missing roots, 2.3 v1 shutdown fallback, and 2.2 owned-process cleanup without terminating unrelated runtimes.
