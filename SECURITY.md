# Security policy

## Supported version

Security fixes are applied to the latest public desktop release and the default branch.

## Reporting a vulnerability

Do not open a public issue for credentials exposure, command execution, navigation-policy bypass, unsafe plugin installation, or unsafe skill import. Use GitHub's private vulnerability reporting for this repository. Include the affected version, reproduction steps, impact, and any relevant sanitized logs.

## Desktop security model

- The official DSH server binds to a random loopback-only HTTP port.
- Renderer processes use sandboxing and context isolation with Node integration disabled.
- Navigation is limited to the active loopback origin; external HTTP links open in the system browser.
- Browser permissions are denied by default and downloads require an explicit destination.
- IPC exposes fixed operations with validated skill identifiers and recovery actions.
- Skill imports reject symbolic links, overwrite attempts, bundles above 50 MiB, and more than 2,000 entries.
- Runtime logs are bounded, rotated, and sanitized for common credential patterns.

Skills and any extensions installed directly through the official DSH interface run with the authority granted by DSH. Review third-party code before installation.
