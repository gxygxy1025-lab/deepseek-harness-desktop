# Installer uninstaller-bypass design

## Problem

An update cannot safely infer that the installed uninstaller is fixed from the installed version or a resource marker. Intermediate and repaired 2.5.0 packages can contain the marker while still retaining an older uninstaller. Letting electron-builder invoke that uninstaller recreates the self-termination loop and the generic "cannot be closed" failure.

## Decision

Every installer upgrade bypasses the installed uninstaller. After owned processes have exited and exclusive-write probes pass, the preflight accepts an installation root only when both exact product anchors exist: `DeepSeek Harness Desktop.exe` and `resources/app.asar`. It atomically renames each accepted root to a unique sibling quarantine on the same volume, removes only the configured product install and uninstall registry keys, and then removes the quarantine. Electron-builder therefore sees no previous registration and does not execute any installed uninstaller.

The `resources/installer-upgrade-v3` marker remains package evidence only. It is never an authorization or trust signal. User data is outside the installation root and is not staged. The uninstall build does not enable upgrade staging, so a normal user-requested uninstall retains its normal cleanup path.

Directory moves use bounded retries for transient antivirus or filesystem races. If staging or registry cleanup fails, already-staged roots are restored before the installer exits with a permission error. Replacement-file locks remain a hard stop before any directory or registry mutation.

## Regression coverage

Windows tests cover both unmarked legacy roots and marker-bearing 2.5.0 roots, exact registry removal, user-data preservation, quarantine cleanup, missing roots, and locked replacement files. Release verification additionally installs the rebuilt 2.5.0 package over an already installed marker-bearing 2.5.0 build and checks the installed version and packaged file hashes.
