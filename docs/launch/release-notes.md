# DeepSeek Harness Desktop 0.1.0

DeepSeek Harness Desktop packages the original DSH Web surface as a native Windows application while retaining the official runtime and complete dsh-web-ui plugin/skin collection.

## Highlights

- Original DSH Web UI loaded unchanged from an official local DSH host.
- Complete task board, Git graph, right panel, SSH, mobile remote, live stats, pet, settings, and skin collection.
- Isolated desktop profile that does not overwrite existing default profiles.
- Native single-instance lifecycle, graceful shutdown, bounded recovery, and visible startup diagnostics.
- Hardened Electron renderer with sandboxing, context isolation, loopback navigation, denied permissions, and explicit downloads.
- Extension Dock for protected built-ins, transactional community plugins, and safe project/user skill discovery and import.

## Download and verification

Download `DeepSeek-Harness-Desktop-Setup-0.1.0-x64.exe` and verify it using the adjacent `SHA256SUMS.txt`.

The release is not signed with a commercial code-signing certificate. Windows SmartScreen may display an unknown publisher. Use the default install location; very long custom paths can exceed the legacy Win32 260-character limit used by some transitive tooling.

Reference size is 187.5 MiB for the installer and about 603 MiB installed. A cold first start is about 30.5 seconds on the reference Windows 11 machine; warm starts are about 7.1 seconds.

This is a community release and is not an official DeepSeek distribution.
